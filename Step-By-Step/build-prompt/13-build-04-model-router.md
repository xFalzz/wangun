# Prompt Build #4 (KRUSIAL): Model Router — Wangun
> **Catatan folder**: kerjakan langsung di dalam folder project Wangun yang sudah terbuka (root project hasil scaffolding di Prompt Build #1) — jangan buat folder project baru atau subfolder pembungkus tambahan di dalamnya.

Implementasikan Model Router memakai adapter Gemini & DeepSeek yang sudah ada, PERSIS mengikuti logika di Blueprint Bagian 6.

Langkah:
1. Buat `/src/router/rules.ts` — fungsi `getActiveProvidersSortedByPriority(complexity)` yang query tabel `model_providers` (filter `is_active=true`, urutkan `priority`) — untuk v1, abaikan dulu logika pembeda "ringan vs berat" secara detail (keduanya boleh pakai urutan priority yang sama), tapi tetap terima parameter `complexity` supaya gampang diperluas nanti
2. Buat `/src/router/index.ts` — fungsi `routeRequest(messages, opts: { complexity, source, sourceId })` yang mencoba tiap provider sesuai urutan priority, fallback otomatis kalau kena error rate-limit/quota, dan melempar error jelas ("Semua provider gagal/kuota habis") kalau semua gagal
3. Tiap request sukses maupun gagal WAJIB tercatat ke tabel `usage_logs` (untuk v1, `source` selalu `"internal_chat"`, `api_key_id` selalu null)
4. Tulis unit test untuk 3 skenario: (a) provider pertama sukses langsung, (b) provider pertama gagal karena quota lalu provider kedua sukses, (c) semua provider gagal — pastikan error yang dilempar jelas dan `usage_logs` tetap tercatat untuk percobaan yang gagal sekalipun

Setelah ini, Model Router harus bisa dipanggil dari mana saja di aplikasi (dipakai lagi nanti oleh Agent Orchestrator) tanpa perlu tahu detail provider di baliknya.
