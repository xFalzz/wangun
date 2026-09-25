# Prompt Build #9 (PENTING): Riwayat & Manajemen Percakapan — Wangun
> **Catatan folder**: kerjakan langsung di dalam folder project Wangun yang sudah terbuka (root project hasil scaffolding di Prompt Build #1) — jangan buat folder project baru atau subfolder pembungkus tambahan di dalamnya.

Lengkapi UI supaya user bisa mengelola percakapan sebelumnya (sesuai user story di PRD Bagian 6).

Langkah:
1. Buat sidebar yang menampilkan daftar `conversations` milik user, terurut dari `updated_at` terbaru
2. Klik salah satu percakapan → buka halaman `/chat/[conversationId]` dengan riwayat pesannya
3. Tambahkan tombol hapus percakapan (dengan konfirmasi sebelum benar-benar dihapus) — hapus juga `messages` dan `attachments` terkait (cascade)
4. Tambahkan tombol "Chat baru" yang langsung membuat `conversation` baru dan mengarahkan ke situ
5. Update `updated_at` di tabel `conversations` setiap kali ada pesan baru masuk, supaya urutan sidebar selalu benar

Styling tetap minimal/fungsional — desain final dari Design Brief menyusul.
