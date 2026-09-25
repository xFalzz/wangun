# Master Urutan — Membangun Wangun v1 dari Nol

Ini urutan LENGKAP menggabungkan dokumen konteks + prompt build + prompt workflow yang sudah kita buat sebelumnya. Ikuti persis, jangan lompat tahap.

⚠️ **Aturan folder (berlaku di semua tahap)**: buka folder project Wangun terlebih dulu di Antigravity SEBELUM mengirim prompt apapun. Semua prompt build sudah diberi catatan eksplisit bahwa Antigravity harus bekerja langsung di folder yang sudah terbuka itu, bukan membuat folder project/subfolder baru di dalamnya.

## Tahap 0 — Masukkan Konteks (sekali di awal tiap sesi baru)
1. `00a-onboarding-context.md`
2. Isi **PRD Wangun**
3. Isi **Blueprint Wangun**

Tunggu konfirmasi ringkas dari Antigravity di tiap poin sebelum lanjut.

## Tahap 1 — Design Brief (sekali, sebelum mulai UI)
4. `01-ui-ux-design-brief.md`

Simpan hasil design token (warna/font/spacing) dari sini — akan dipakai manual saat styling di Prompt Build #6, #9, #10 (yang sengaja masih "fungsional dulu, styling minimal").

## Tahap 2 — Build Tingkat KRUSIAL (urutan wajib, satu-satu, tunggu tiap selesai & jalan sebelum lanjut)
5. `10-build-01-scaffolding.md`
6. `11-build-02-database-schema.md`
7. `12-build-03-provider-adapters.md`
8. `13-build-04-model-router.md`
9. `14-build-05-auth.md`
10. `15-build-06-chat-engine.md`
11. `16-build-07-agent-orchestrator.md`
12. `17-build-08-tool-web-search.md`

👉 Setelah tahap ini selesai, Wangun v1 sudah punya alur inti: chat biasa + mode agentic dengan 1 tool. **Ini titik paling penting untuk dicoba nyata dulu** sebelum lanjut ke fitur tambahan.

Selipkan `02-git-commit.md` setiap kali satu prompt build di atas selesai dan stabil, sebelum lanjut ke prompt build berikutnya — jangan menumpuk banyak perubahan tanpa commit.

## Tahap 3 — Build Tingkat PENTING (boleh urut sesuai prioritas kamu sendiri, tidak seketat Tahap 2)
13. `18-build-09-riwayat-percakapan.md`
14. `19-build-10-agent-progress-ui.md`
15. `20-build-11-rate-limiting.md`
16. `21-build-12-memory-rag.md`

👉 Setelah salah satu journey terasa stabil (misal: kirim pesan sampai jawaban, atau mode agentic sampai selesai), jalankan `05-e2e-test-playwright.md` untuk journey itu — jangan tunggu semua fitur selesai baru mulai testing.

## Tahap 4 — Build Tingkat BISA MENYUSUL (opsional, kapan saja terasa perlu)
17. `22-build-13-admin-observability.md`
18. `23-build-14-error-hardening.md`
19. `24-build-15-deployment-setup.md`

## Tahap 5 — Sebelum Menganggap v1 "Selesai"
20. `06-cleanup-refactor.md` — bersihkan sisa-sisa kode dari iterasi Tahap 2-4
21. `03-security-audit.md` — WAJIB sebelum deploy, meskipun baru untuk pemakaian sendiri
22. `24-build-15-deployment-setup.md` (kalau belum dijalankan di Tahap 4)

## Sepanjang jalan (tidak terikat tahap tertentu)
- `04-debug-fast.md` — kapan pun nemu bug yang bingung penyebabnya
- `07-task-to-skill.md` — kalau ada pola kerja yang terasa bakal berulang

---

**Setelah v1 benar-benar dipakai nyata (sesuai Goal G5 di PRD) barulah mulai rencanakan set prompt build untuk v2 (Router-as-a-Service) — jangan mulai v2 duluan sebelum v1 tervalidasi, sesuai keputusan roadmap di PRD/Blueprint.**
