# Prompt Kit — Wangun (untuk Antigravity IDE)

Kumpulan ini diadaptasi dari template prompt @haloziq, disesuaikan supaya langsung paham konteks proyek **Wangun** (Agentic AI Chat + Router-as-a-Service + IDE) tanpa ambigu, dan menghasilkan output yang presisi — bukan "AI slop" (kode/perubahan asal jadi, commit tidak jelas, refactor sembarangan).

## Cara pakai

Setiap file di folder ini adalah **satu prompt siap tempel** ke Antigravity. Jalankan sesuai kebutuhan tahap pengerjaan — bukan berurutan wajib, tapi ini urutan yang disarankan kalau kamu mengikuti dari awal:

| # | File | Kapan dipakai |
|---|---|---|
| 1 | `01-ui-ux-design-brief.md` | Sebelum mulai coding UI — sekali di awal v1, atau saat mulai modul baru (Router dashboard, IDE) |
| 2 | `02-git-commit.md` | Setiap kali selesai satu batch perubahan, sebelum push |
| 3 | `03-security-audit.md` | Sebelum deploy pertama, dan sebelum membuka Router-as-a-Service (v2) ke publik |
| 4 | `04-debug-fast.md` | Kapan pun menemukan bug/error yang tidak langsung jelas penyebabnya |
| 5 | `05-e2e-test-playwright.md` | Setelah 1 alur fitur (journey) selesai dan stabil, sebelum dianggap "done" |
| 6 | `06-cleanup-refactor.md` | Setiap akhir fase (v1/v2/v3) atau saat codebase mulai terasa berantakan |
| 7 | `07-task-to-skill.md` | Setelah menyelesaikan task berulang yang enak dijadikan template permanen |

## Prinsip yang dipertahankan dari semua prompt ini

- **Selalu minta approval dulu** sebelum eksekusi besar (audit dulu baru eksekusi, list dulu baru hapus, dsb) — supaya kamu tetap pegang kendali, bukan Antigravity yang jalan sendiri tanpa pengawasan
- **Selalu minta alasan eksplisit**, bukan cuma hasil — supaya kamu belajar dan bisa mengoreksi kalau asumsinya salah
- **Selalu merujuk ke dokumen proyek** (PRD & Blueprint Wangun) sebagai sumber kebenaran, supaya Antigravity tidak menebak-nebak konteks

⚠️ Untuk prompt yang menyebut "PRD di atas" atau "Blueprint di atas", pastikan kamu **tempel/lampirkan isi PRD dan Blueprint Wangun ke context Antigravity dulu** (paste isinya atau reference file-nya) sebelum menjalankan prompt tersebut — supaya tidak ambigu.
