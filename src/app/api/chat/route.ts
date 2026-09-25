// TODO Build #6: POST /api/chat
// Menerima: { conversationId, message }
// Simpan pesan user → panggil routeRequest → stream jawaban → simpan ke messages
import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "Not implemented yet — lihat Build #6" }, { status: 501 });
}
