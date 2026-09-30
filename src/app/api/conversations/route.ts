/**
 * POST /api/conversations — Buat conversation baru
 * GET  /api/conversations — List semua conversation user (Build #9)
 *
 * POST response: { id, title, createdAt }
 *
 * Auth: wajib login — ambil userId dari session JWT.
 * Kalau belum login, return 401.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import { conversations } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

// ============================================================
// POST /api/conversations — buat conversation baru
// ============================================================
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = parseInt(session.user.id, 10);

  // Judul opsional dari body — kalau tidak ada, pakai default
  let title = "Percakapan baru";
  try {
    const body = (await req.json()) as { title?: string };
    if (body.title?.trim()) {
      title = body.title.trim().slice(0, 255);
    }
  } catch {
    // body kosong / bukan JSON — tidak masalah, pakai default
  }

  const inserted = await db
    .insert(conversations)
    .values({ userId, title })
    .returning({
      id: conversations.id,
      title: conversations.title,
      createdAt: conversations.createdAt,
    });

  const conversation = inserted[0];
  if (!conversation) {
    return NextResponse.json(
      { error: "Gagal membuat conversation" },
      { status: 500 }
    );
  }

  return NextResponse.json(conversation, { status: 201 });
}

// ============================================================
// GET /api/conversations — list conversation user (Build #9)
// Diimplementasi sekarang agar sidebar Build #9 punya endpoint siap
// ============================================================
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = parseInt(session.user.id, 10);

  const rows = await db
    .select({
      id: conversations.id,
      title: conversations.title,
      createdAt: conversations.createdAt,
      updatedAt: conversations.updatedAt,
    })
    .from(conversations)
    .where(eq(conversations.userId, userId))
    .orderBy(desc(conversations.updatedAt))
    .limit(50); // v1: tampilkan 50 conversation terbaru

  return NextResponse.json(rows);
}
