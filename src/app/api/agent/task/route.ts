/**
 * POST /api/agent/task — Agent Orchestrator API Route (Build #7)
 *
 * Request: { conversationId: number, message: string }
 *
 * Response: text/event-stream (SSE)
 * Setiap event dikirim sebagai:
 *   data: <JSON AgentEvent>\n\n
 *
 * Event types (sesuai AgentEvent di loop.ts):
 *   { type: "thought", step: N, content: "..." }
 *   { type: "action", step: N, tool: "web_search", input: {...} }
 *   { type: "observation", step: N, content: "..." }
 *   { type: "done", answer: "...", totalSteps: N }
 *   { type: "error", message: "..." }
 *
 * Auth: wajib login — userId dipakai untuk verifikasi ownership conversation
 * dan sebagai sourceId di usage_logs.
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import { conversations, messages, agentTasks } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { runAgentLoop, type AgentEvent } from "@/agent/loop";

// ============================================================
// VALIDATION
// ============================================================

const agentSchema = z.object({
  conversationId: z.number().int().positive(),
  message: z.string().min(1).max(32_000),
});

// ============================================================
// POST /api/agent/task
// ============================================================

export async function POST(req: NextRequest) {
  // ——————————————————
  // Auth
  // ——————————————————
  const session = await auth();
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  const userId = parseInt(session.user.id, 10);

  // ——————————————————
  // Validasi input
  // ——————————————————
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Body harus berupa JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const parsed = agentSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: parsed.error.errors[0]?.message ?? "Input tidak valid" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { conversationId, message } = parsed.data;

  // ——————————————————
  // Verifikasi ownership conversation
  // ——————————————————
  const conv = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)))
    .limit(1);

  if (conv.length === 0) {
    return new Response(JSON.stringify({ error: "Conversation tidak ditemukan" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ——————————————————
  // Simpan pesan user ke DB
  // ——————————————————
  const userMsgResult = await db
    .insert(messages)
    .values({ conversationId, role: "user", content: message })
    .returning({ id: messages.id });

  const userMsgId = userMsgResult[0]?.id;
  if (!userMsgId) {
    return new Response(JSON.stringify({ error: "Gagal simpan pesan" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ——————————————————
  // Buat baris agent_task di DB
  // ——————————————————
  const taskResult = await db
    .insert(agentTasks)
    .values({
      messageId: userMsgId,
      taskType: "chat",
      status: "pending",
    })
    .returning({ id: agentTasks.id });

  const taskId = taskResult[0]?.id;
  if (!taskId) {
    return new Response(JSON.stringify({ error: "Gagal membuat agent task" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ——————————————————
  // SSE stream — jalankan loop di background, stream event ke client
  // ——————————————————
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  function sendEvent(event: AgentEvent): void {
    const line = `data: ${JSON.stringify(event)}\n\n`;
    // Fire-and-forget write — kalau client sudah disconnect, error di-swallow
    writer.write(encoder.encode(line)).catch(() => {});
  }

  (async () => {
    try {
      await runAgentLoop(
        taskId,
        userMsgId,
        message,
        { mode: "chat", userId, conversationId },
        sendEvent
      );
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error("[agent-task] Loop error tidak tertangani:", errMsg);
      sendEvent({ type: "error", message: errMsg });
    } finally {
      // Kirim event penutup supaya client tahu stream sudah selesai
      const closeEvent = `data: [DONE]\n\n`;
      await writer.write(encoder.encode(closeEvent)).catch(() => {});
      await writer.close().catch(() => {});
    }
  })();

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Disable nginx buffering untuk SSE
    },
  });
}
