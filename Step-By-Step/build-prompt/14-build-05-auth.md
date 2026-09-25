# Prompt Build #5 (KRUSIAL): Autentikasi — Wangun
> **Catatan folder**: kerjakan langsung di dalam folder project Wangun yang sudah terbuka (root project hasil scaffolding di Prompt Build #1) — jangan buat folder project baru atau subfolder pembungkus tambahan di dalamnya.

Implementasikan auth memakai Auth.js (NextAuth v5), terhubung ke tabel `users` yang sudah ada.

Langkah:
1. Setup Auth.js dengan 2 provider:
   - **Credentials** (email + password): validasi lewat zod, cocokkan password dengan `bcrypt.compare` terhadap `password_hash`
   - **Google OAuth**: baca `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` dari env
2. Saat user baru daftar/login pertama kali via Google, otomatis buat baris di tabel `users` dengan `plan_id` mengarah ke plan "Free" (dari seed sebelumnya)
3. Buat halaman `/register` dan `/login` — **fungsional saja dulu**, styling minimal/default Tailwind, JANGAN buat desain final (itu menyusul lewat prompt Design Brief terpisah)
4. Buat middleware yang redirect ke `/login` untuk semua route di bawah `/chat` kalau user belum login
5. Pastikan session bisa diakses baik di server component maupun di route handler API (`/api/chat`, dsb, yang akan dibuat di prompt berikutnya)
6. Tulis test dasar: register dengan email yang sudah dipakai harus gagal dengan pesan jelas, login dengan password salah harus gagal dengan pesan jelas (jangan bocorkan apakah email terdaftar atau tidak — hindari user enumeration)
