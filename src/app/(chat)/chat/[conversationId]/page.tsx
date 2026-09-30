/**
 * Halaman /chat/[conversationId] — Server Component (Build #6)
 *
 * Tugas server component ini:
 *  1. Verifikasi session — redirect ke /login kalau belum login
 *  2. Verifikasi conversation milik user — 404 kalau tidak ada
 *  3. Render layout halaman + mount ChatInterface (client component)
 *
 * History pesan di-load oleh ChatInterface sendiri via fetch
 * GET /api/conversations/[id]/messages — bukan di server component ini,
 * supaya streaming berjalan di client tanpa blocking SSR.
 */

import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import { conversations } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import ChatInterface from "@/components/ChatInterface";

interface PageProps {
  params: Promise<{ conversationId: string }>;
}

export default async function ChatPage({ params }: PageProps) {
  // Auth check — middleware sudah proteksi /chat, tapi double check di sini
  // untuk mendapatkan userId yang diperlukan untuk query DB
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/chat");
  }

  const { conversationId: convIdStr } = await params;
  const conversationId = parseInt(convIdStr, 10);

  if (isNaN(conversationId)) {
    notFound();
  }

  const userId = parseInt(session.user.id, 10);

  // Verifikasi conversation milik user ini
  const conv = await db
    .select({ id: conversations.id, title: conversations.title })
    .from(conversations)
    .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)))
    .limit(1);

  if (conv.length === 0) {
    notFound();
  }

  const { title } = conv[0]!;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      {/* Header */}
      <header
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid #e0e0e0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 18 }}>{title}</h1>
        <div style={{ fontSize: 13, color: "#888" }}>
          Conversation #{conversationId}
        </div>
      </header>

      {/* Chat area */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        <ChatInterface conversationId={conversationId} />
      </div>
    </div>
  );
}
