# Prompt Build #10 (PENTING): UI Progress Agent — Wangun
> **Catatan folder**: kerjakan langsung di dalam folder project Wangun yang sudah terbuka (root project hasil scaffolding di Prompt Build #1) — jangan buat folder project baru atau subfolder pembungkus tambahan di dalamnya.

Tingkatkan transparansi mode agentic (Goal G4 di PRD) dengan menampilkan progres secara jelas ke user, bukan cuma hasil akhir.

Langkah:
1. Saat mode agentic berjalan, tampilkan tiap langkah (thought/action/observation) sebagai list yang muncul satu per satu mengikuti event stream dari `/api/agent/task` (Prompt Build #7)
2. Tiap item list bisa di-expand/collapse untuk lihat detail (misal: hasil lengkap dari `web_search`, bukan cuma ringkasan)
3. Tampilkan status task dengan jelas: sedang berjalan (dengan indikator visual ringan, bukan animasi ramai), selesai, atau gagal (dengan alasan kegagalan dari kolom `agent_tasks.result`)
4. Tambahkan tombol "Hentikan" yang mengirim sinyal ke backend untuk menghentikan loop yang sedang berjalan (set status jadi `failed` dengan alasan "Dibatalkan user") — jelaskan pendekatan teknis yang kamu pakai untuk mengirim sinyal berhenti ini (misal: AbortController, atau polling status di database)

Styling tetap minimal — ini fokus ke fungsionalitas transparansi, desain visual final menyusul dari Design Brief.
