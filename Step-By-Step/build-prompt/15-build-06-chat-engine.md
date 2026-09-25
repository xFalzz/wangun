# Prompt Build #6 (KRUSIAL): Chat Engine & Streaming — Wangun
> **Catatan folder**: kerjakan langsung di dalam folder project Wangun yang sudah terbuka (root project hasil scaffolding di Prompt Build #1) — jangan buat folder project baru atau subfolder pembungkus tambahan di dalamnya.

Bangun alur chat dasar (BELUM agentic — itu prompt build berikutnya).

Langkah:
1. Buat API route `POST /api/conversations` — membuat `conversation` baru untuk user yang sedang login
2. Buat API route `POST /api/chat` — menerima `{ conversationId, message }`:
   - Simpan pesan user ke tabel `messages` (`role="user"`)
   - Ambil histori pesan dalam `conversation` itu sebagai context
   - Panggil `routeRequest` dari Model Router (Prompt Build #4) dengan `complexity="ringan"`
   - Stream jawaban ke client memakai Vercel AI SDK (HANYA sebagai primitif streaming/UI — jangan pakai fitur agent/tool-nya, itu akan kita tulis manual)
   - Setelah stream selesai, simpan pesan assistant ke `messages` beserta `tokens_used` dan `model_provider_id` yang benar-benar dipakai
3. Buat halaman `/chat/[conversationId]` — fungsional dulu (input box, daftar pesan, indikator loading saat streaming) — styling minimal, desain final menyusul
4. Tampilkan riwayat pesan dari database saat halaman dibuka ulang

Acceptance check yang harus kamu verifikasi sendiri sebelum lapor selesai: kirim 1 pesan, refresh halaman, pesan dan jawabannya masih tampil dari database (bukan hilang karena cuma di state React).
