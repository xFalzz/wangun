# Prompt Build #7 (KRUSIAL): Agent Orchestrator (ReAct Loop) — Wangun
> **Catatan folder**: kerjakan langsung di dalam folder project Wangun yang sudah terbuka (root project hasil scaffolding di Prompt Build #1) — jangan buat folder project baru atau subfolder pembungkus tambahan di dalamnya.

Implementasikan Agent Orchestrator PERSIS mengikuti desain di Blueprint Bagian 7 (format action JSON, system prompt planner, pseudocode loop).

Langkah:
1. Buat `/src/agent/prompts.ts` — system prompt planner sesuai Blueprint Bagian 7, TAPI untuk v1 daftar tool yang disebut baru: `web_search` dan `final_answer` (tool lain seperti `write_file`/`run_terminal` belum ada, jangan disebut dulu di prompt supaya model tidak mencoba memanggilnya)
2. Buat `/src/agent/parseAction.ts` — parsing output JSON dari model, dengan validasi struktur (pakai zod). Kalau JSON tidak valid, retry sekali dengan instruksi lebih tegas; kalau gagal lagi, tandai task `failed`
3. Buat `/src/agent/loop.ts` — implementasi loop sesuai pseudocode Blueprint Bagian 7: `maxSteps=10`, update status (`planning`→`acting`→`observing`→`done`/`failed`) ke tabel `agent_tasks` di tiap tahap, simpan tiap panggilan tool ke `tool_calls`
4. Buat API route `POST /api/agent/task` — menerima `{ conversationId, message }`, membuat baris `agent_tasks` baru, menjalankan loop, dan **stream progress ke client** (event per langkah: thought, action, observation) — bukan menunggu diam sampai selesai baru menampilkan hasil
5. Tambahkan UI toggle sederhana di halaman chat: "Mode Agentic" (sesuai keputusan di PRD Open Questions — mulai dari toggle manual, BUKAN deteksi otomatis)

Tool `web_search` sendiri BELUM diimplementasikan di prompt ini (menyusul di Prompt Build #8) — untuk sekarang, buat `callTool()` melempar error jelas "tool belum diimplementasikan" kalau dipanggil, supaya loop-nya sendiri sudah bisa diverifikasi strukturnya dulu.
