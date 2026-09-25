# Prompt Build #12 (PENTING): Memory & RAG — Wangun
> **Catatan folder**: kerjakan langsung di dalam folder project Wangun yang sudah terbuka (root project hasil scaffolding di Prompt Build #1) — jangan buat folder project baru atau subfolder pembungkus tambahan di dalamnya.

Implementasikan long-term memory sesuai desain Blueprint Bagian 9.

Langkah:
1. Buat `/src/memory/embed.ts` — fungsi generate embedding lewat API embedding Gemini (cek dokumentasi resmi untuk model embedding yang tersedia saat ini)
2. Buat `/src/memory/store.ts` — fungsi `saveMemory(userId, key, value)` (generate embedding lalu simpan ke tabel `memories`) dan `retrieveRelevantMemories(userId, queryText, limit=5)` (generate embedding dari query, cari kemiripan lewat pgvector `<->`)
3. Tambahkan tool `save_memory` ke registry tool agent (Prompt Build #8) — daftarkan juga di system prompt planner
4. Di alur chat biasa (`/api/chat`, Prompt Build #6) DAN mode agentic, panggil `retrieveRelevantMemories` sebelum kirim ke Model Router, sisipkan hasilnya sebagai konteks tambahan di system prompt
5. Buat halaman/pengaturan sederhana untuk user melihat daftar memory miliknya dan menghapus satu per satu

Tulis test: simpan 1 memory, lakukan chat baru dengan pertanyaan terkait, verifikasi memory itu benar-benar masuk sebagai konteks yang dikirim ke provider (bisa dicek lewat mock/log, bukan harus lihat jawaban AI-nya).
