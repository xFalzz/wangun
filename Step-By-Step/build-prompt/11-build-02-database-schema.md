# Prompt Build #2 (KRUSIAL): Skema Database v1 — Wangun
> **Catatan folder**: kerjakan langsung di dalam folder project Wangun yang sudah terbuka (root project hasil scaffolding di Prompt Build #1) — jangan buat folder project baru atau subfolder pembungkus tambahan di dalamnya.

Berdasarkan project hasil scaffolding sebelumnya, implementasikan skema database v1 memakai Drizzle ORM.

Buat skema PERSIS sesuai LRS di Blueprint Bagian 13, TAPI **hanya tabel yang relevan untuk v1**:
- `users`, `plans`, `conversations`, `messages`, `attachments`, `agent_tasks`, `tool_calls`, `model_providers`, `memories`, `usage_logs`

**JANGAN buat dulu**: `api_keys`, `workspaces`, `files` — itu untuk v2/v3. Tapi desain skema `users` dan `usage_logs` supaya kolom yang nanti dibutuhkan (relasi ke `api_keys`, kolom `source`) gampang ditambah lewat migrasi berikutnya tanpa breaking change.

Langkah:
1. Definisikan schema Drizzle di `/src/db/schema.ts` sesuai tipe data di LRS (perhatikan tipe `vector` untuk kolom `embedding` di tabel `memories` — pakai ekstensi pgvector)
2. Aktifkan ekstensi `pgvector` di migrasi awal
3. Generate migrasi lewat drizzle-kit
4. Buat seed script (`/src/db/seed.ts`) yang mengisi:
   - Tabel `plans`: minimal 1 baris "Free" dengan `quota_daily` (usulkan angka wajar, jelaskan alasannya)
   - Tabel `model_providers`: baris untuk Gemini (priority=1) dan DeepSeek (priority=2), `cost_per_1k_token=0`, `is_active=true`
5. Buat `/src/db/client.ts` untuk koneksi Drizzle ke database
6. Jelaskan cara menjalankan migrasi + seed dari nol (`docker-compose up` → migrate → seed)

Setelah selesai, tunjukkan hasil `\dt` (daftar tabel) yang seharusnya muncul, supaya saya bisa verifikasi manual.
