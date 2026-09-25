# Prompt Build #8 (KRUSIAL): Tool web_search — Wangun
> **Catatan folder**: kerjakan langsung di dalam folder project Wangun yang sudah terbuka (root project hasil scaffolding di Prompt Build #1) — jangan buat folder project baru atau subfolder pembungkus tambahan di dalamnya.

Lengkapi Agent Orchestrator dengan tool pertama yang benar-benar berfungsi: `web_search`.

Langkah:
1. **Sebelum menulis kode**, usulkan 1-2 opsi API/layanan search yang bisa dipakai gratis atau murah untuk development (misalnya Brave Search API free tier, atau opsi lain yang kamu tahu paling stabil saat ini) — jelaskan batasannya (kuota, rate limit), dan **tunggu saya approve** sebelum lanjut implementasi, karena ini keputusan yang belum ditetapkan di Blueprint
2. Setelah disetujui, buat `/src/tools/webSearch.ts` — fungsi `webSearch({ query })` mengembalikan array `{ title, snippet, url }`
3. Buat `/src/tools/registry.ts` — registry tool sederhana (`Record<string, ToolFunction>`) berisi `web_search` (dan siap menampung tool lain nanti tanpa restrukturisasi besar)
4. Hubungkan `callTool()` di `/src/agent/loop.ts` (Prompt Build #7) ke registry ini — hapus error placeholder "tool belum diimplementasikan"
5. Tulis test: panggil agent dengan pertanyaan yang jelas butuh info terkini (misal "siapa juara piala dunia terakhir"), verifikasi loop benar-benar memanggil `web_search` minimal sekali sebelum `final_answer`

Setelah prompt ini selesai, alur inti v1 (chat biasa + mode agentic dengan 1 tool) seharusnya sudah bisa dicoba end-to-end.
