/**
 * POST /api/chat — Chat Engine (Build #6)
 *
 * Flow:
 *  1. Validasi session + input
 *  2. Verifikasi conversation milik user
 *  3. Simpan pesan user ke tabel messages
 *  4. Ambil histori conversation sebagai context LLM
 *  5. Stream jawaban via routeRequestStream (dengan fallback antar provider)
 *  6. Pipe stream ke Response menggunakan Web Streams API
 *  7. Setelah stream selesai, simpan pesan assistant + update conversation.updatedAt
 *
 * Streaming output: text/plain, setiap chunk ditulis langsung ke response body.
 * Client membaca dengan ReadableStream / fetch response.body reader.
 *
 * BUKAN Vercel AI SDK agentic features — hanya pakai primitif streaming-nya.
 * Fitur agentic (tool calls, planning) diimplementasi di Build #7.
 *
 * Catatan design:
 *  - routeRequestStream adalah AsyncGenerator<string> — kita drain-nya dan
 *    forward tiap chunk ke client via TransformStream
 *  - Setelah generator return, kita dapat RouteResult (provider + model info)
 *    yang dipakai untuk menyimpan modelProviderId yang benar ke messages
 *  - Kalau stream gagal total (semua provider down), kirim error 503 ke client
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import {
  messages,
  conversations,
  modelProviders,
} from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { routeRequestStream } from "@/router/index";
import type { ChatMessage } from "@/providers/types";

// ============================================================
// VALIDATION
// ============================================================

const chatSchema = z.object({
  conversationId: z.number().int().positive(),
  message: z.string().min(1, "Pesan tidak boleh kosong").max(32_000),
});

// ============================================================
// HELPER — cari model_provider id berdasarkan nama provider
// ============================================================

const providerIdCache = new Map<string, number>();

async function getProviderDbId(providerName: string): Promise<number | null> {
  if (providerIdCache.has(providerName)) {
    return providerIdCache.get(providerName)!;
  }
  const rows = await db
    .select({ id: modelProviders.id, name: modelProviders.name })
    .from(modelProviders);
  for (const row of rows) {
    providerIdCache.set(row.name.toLowerCase().trim(), row.id);
  }
  return providerIdCache.get(providerName.toLowerCase().trim()) ?? null;
}

// ============================================================
// POST /api/chat
// ============================================================

export async function POST(req: NextRequest) {
  // ——————————————————
  // 1. Auth
  // ——————————————————
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = parseInt(session.user.id, 10);

  // ——————————————————
  // 2. Validasi input
  // ——————————————————
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body harus berupa JSON" }, { status: 400 });
  }

  const parsed = chatSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.errors[0]?.message ?? "Input tidak valid";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { conversationId, message } = parsed.data;

  // ——————————————————
  // 3. Verifikasi ownership conversation
  // ——————————————————
  const conv = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)))
    .limit(1);

  if (conv.length === 0) {
    return NextResponse.json({ error: "Conversation tidak ditemukan" }, { status: 404 });
  }

  // ——————————————————
  // 4. Simpan pesan user ke DB
  // ——————————————————
  await db.insert(messages).values({
    conversationId,
    role: "user",
    content: message,
  });

  // ——————————————————
  // 5. Ambil histori conversation sebagai context LLM
  //    Batasi ke 50 pesan terakhir — cukup untuk v1
  // ——————————————————
  const history = await db
    .select({ role: messages.role, content: messages.content })
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt))
    .limit(50);

  const chatMessages: ChatMessage[] = history.map((m) => ({
    role: m.role as "user" | "assistant" | "system",
    content: m.content,
  }));

  // ——————————————————
  // 6. Stream jawaban ke client via TransformStream
  // ——————————————————
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  // Jalankan streaming di background — tidak di-await di sini
  // supaya Response bisa langsung dikirim ke client
  (async () => {
    let fullContent = "";
    let providerName = "unknown";
    let modelId = "unknown";

    try {
      const stream = routeRequestStream(chatMessages, {
        sourceId: String(userId),
        complexity: "ringan",
        source: "internal_chat",
      });

      // Drain AsyncGenerator — forward setiap chunk ke client
      let result = await stream.next();
      while (!result.done) {
        const chunk = result.value;
        fullContent += chunk;
        await writer.write(encoder.encode(chunk));
        result = await stream.next();
      }

      // Generator return value berisi RouteResult (metadata provider)
      if (result.value) {
        providerName = result.value.providerName;
        modelId = result.value.modelId;
      }
    } catch (err) {
      // Semua provider gagal — kirim pesan error ke stream
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error("[chat] routeRequestStream gagal:", errMsg);
      const errorChunk = `\n\n[ERROR: Gagal menghubungi AI provider. Coba lagi nanti.]`;
      await writer.write(encoder.encode(errorChunk));
      fullContent += errorChunk;
    } finally {
      // ——————————————————
      // 7. Simpan pesan assistant ke DB (setelah stream selesai)
      // ——————————————————
      try {
        const providerDbId = await getProviderDbId(providerName);

        await db.insert(messages).values({
          conversationId,
          role: "assistant",
          content: fullContent || "[Respons kosong]",
          modelProviderId: providerDbId ?? undefined,
          tokensUsed: 0, // v1: token count di stream sudah dicatat di usage_logs via router
        });

        // Update conversation.updatedAt supaya list sidebar terurut benar
        await db
          .update(conversations)
          .set({ updatedAt: new Date() })
          .where(eq(conversations.id, conversationId));
      } catch (dbErr) {
        console.error("[chat] Gagal simpan pesan assistant ke DB:", dbErr);
      }

      await writer.close();
    }
  })();

  // Kirim response streaming — client membaca chunk per chunk
  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      // CORS untuk dev — di production dikontrol oleh Next.js config
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
