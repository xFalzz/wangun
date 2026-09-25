# Prompt Build #15 (BISA MENYUSUL): Setup Deployment — Wangun
> **Catatan folder**: kerjakan langsung di dalam folder project Wangun yang sudah terbuka (root project hasil scaffolding di Prompt Build #1) — jangan buat folder project baru atau subfolder pembungkus tambahan di dalamnya.

Siapkan Wangun v1 supaya bisa di-deploy, sesuai rekomendasi hosting di Blueprint Bagian 16 (Vercel untuk frontend, Railway/Fly.io kalau ada proses terpisah).

Langkah:
1. Buat checklist environment variable yang wajib diisi di production (rujuk `.env.example` dari Prompt Build #1)
2. Buat endpoint health check sederhana (`/api/health`) yang mengecek koneksi database hidup
3. Pastikan migrasi database bisa dijalankan sebagai bagian dari proses deploy (jelaskan caranya untuk Drizzle)
4. Sesuaikan konfigurasi Next.js untuk production (mis. `next.config.js` relevan)
5. Buat dokumentasi singkat (`DEPLOYMENT.md`) langkah-langkah deploy dari nol ke Vercel + provider database (Neon/Supabase) untuk PostgreSQL+pgvector

Ini bukan untuk langsung deploy ke traffic publik — cukup sampai tahap "bisa diakses lewat URL asli untuk kamu uji sendiri".
