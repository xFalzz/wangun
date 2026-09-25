# Prompt Build #13 (BISA MENYUSUL): Admin & Observability — Wangun
> **Catatan folder**: kerjakan langsung di dalam folder project Wangun yang sudah terbuka (root project hasil scaffolding di Prompt Build #1) — jangan buat folder project baru atau subfolder pembungkus tambahan di dalamnya.

Buat dashboard sederhana khusus untuk kamu sendiri (role admin) memantau pemakaian, sesuai Blueprint Bagian 5 & 17.

Langkah:
1. Buat halaman `/admin` (lindungi dengan pengecekan role — untuk v1 cukup hardcode 1 email admin dari env var, jangan bangun sistem role lengkap dulu)
2. Tampilkan tabel agregasi `usage_logs`: total request & token per `model_provider` per hari (7 hari terakhir)
3. Tampilkan daftar `model_providers` dengan kemampuan ubah `priority` dan `is_active` langsung dari UI ini (tanpa perlu deploy ulang) — ini realisasi dari prinsip di Blueprint Bagian 2
4. Tampilkan jumlah `agent_tasks` per status (done/failed/dsb) sebagai indikator kesehatan sistem

Styling minimal, ini tool internal — tidak perlu ikut Design Brief.
