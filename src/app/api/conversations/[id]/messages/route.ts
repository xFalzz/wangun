/**
 * GET /api/conversations/[id]/messages
 *
 * Ambil riwayat pesan dalam satu conversation.
 * Dipakai oleh halaman /chat/[conversationId] saat pertama kali dibuka
 * untuk load history dari DB (bukan state React yang hilang saat refresh).
 *
 * Auth: wajib login, dan conversation harus milik user yang login.
 * Kalau conversation tidak ditemukan atau bukan miliknya → 404 (bukan 403,
 * untuk menghindari membership enumeration).
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import { messages, conversations } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const conversationId = parseInt(id, 10);
  if (isNaN(conversationId)) {
    return NextResponse.json({ error: "ID conversation tidak valid" }, { status: 400 });
  }

  const userId = parseInt(session.user.id, 10);

  // Verifikasi conversation milik user ini
  const conv = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(
      and(
        eq(conversations.id, conversationId),
        eq(conversations.userId, userId)
      )
    )
    .limit(1);

  if (conv.length === 0) {
    return NextResponse.json({ error: "Conversation tidak ditemukan" }, { status: 404 });
  }

  // Ambil semua pesan, urutan kronologis
  const rows = await db
    .select({
      id: messages.id,
      role: messages.role,
      content: messages.content,
      tokensUsed: messages.tokensUsed,
      modelProviderId: messages.modelProviderId,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt));

  return NextResponse.json(rows);
}
