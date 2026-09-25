// TODO Build #7: POST /api/agent/task
// Menerima: { conversationId, message }
// Buat agent_task baru → jalankan runAgentLoop → stream progress per langkah
import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "Not implemented yet — lihat Build #7" }, { status: 501 });
}
