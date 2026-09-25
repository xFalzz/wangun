# Prompt: E2E Test Wangun (Playwright)

Setup end-to-end testing untuk aplikasi Wangun ini dengan Playwright.

1. Install dan konfigurasi Playwright untuk stack ini (Next.js + TypeScript). Tambahkan config untuk local + CI, dengan retry, trace saat gagal, dan screenshot.
2. Identifikasi critical user journey dari codebase dan list untuk saya approve DULU sebelum menulis test apapun. Sebagai referensi konteks Wangun (bukan daftar final — tetap identifikasi dari kode sungguhan), journey yang kemungkinan besar kritikal:
   - Registrasi/login sampai berhasil masuk
   - Kirim pesan chat biasa sampai jawaban streaming selesai tampil
   - Memicu mode agentic dan melihat progress (thought/action/observation) sampai task berstatus `done`
   - Menghentikan task agent yang sedang berjalan
   - (kalau v2 sudah ada) Generate API key, panggil endpoint `/v1/chat/completions` dengan key itu, dapat response valid
   - (kalau v3 sudah ada) Buka workspace, edit file, jalankan lewat terminal, lihat output
3. Untuk tiap journey yang disetujui, tulis test yang mencakup happy path plus failure state realistis (input salah, session expired, network error, semua provider AI down, data kosong).
4. Pakai selector yang resilient — utamakan role-based atau data-testid. Tambahkan atribut data-testid yang hilang ke komponen yang perlu.
5. Buat auth fixture supaya test yang sudah login tidak mengulang flow login tiap kali jalan.
6. Tambahkan seeding dan cleanup data test (percakapan, workspace, API key dummy) supaya test terisolasi dan bisa diulang tanpa bentrok dengan data lain.
7. Tambahkan npm script: `test:e2e`, `test:e2e:ui`, `test:e2e:ci`
8. Tambahkan CI workflow yang menjalankan suite di tiap PR.

Jelaskan cara menjalankan semuanya. Tandai journey yang tidak bisa dites secara reliable (misal: journey yang bergantung pada respons non-deterministik dari model AI sungguhan) dan jelaskan kenapa — sarankan mock/stub provider AI untuk kasus ini kalau perlu.
