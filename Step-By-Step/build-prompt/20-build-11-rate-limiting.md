# Prompt Build #11 (PENTING): Rate Limiting & Kuota — Wangun
> **Catatan folder**: kerjakan langsung di dalam folder project Wangun yang sudah terbuka (root project hasil scaffolding di Prompt Build #1) — jangan buat folder project baru atau subfolder pembungkus tambahan di dalamnya.

Terapkan batas pemakaian per user sesuai `plans.quota_daily`, supaya kuota gratis provider tidak habis oleh 1-2 user (Blueprint Bagian 17).

Langkah:
1. Sebelum request diteruskan ke Model Router (baik dari `/api/chat` maupun `/api/agent/task`), cek total pemakaian user hari ini dari `usage_logs` (jumlah request atau token, jelaskan mana yang kamu pilih dan kenapa) dibandingkan `quota_daily` dari plan user tersebut
2. Kalau melebihi kuota, kembalikan response error yang jelas ke UI (bukan error generik) dan tampilkan pesan yang mudah dipahami user awam ("Kuota harian kamu sudah habis, coba lagi besok")
3. Tambahkan indikator kuota tersisa di UI (misal di header/sidebar): "X dari Y pesan hari ini"
4. Tulis test: user yang sudah melebihi kuota harus ditolak SEBELUM request sampai ke provider AI manapun (supaya tidak buang-buang kuota provider sendiri)
