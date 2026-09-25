# PRD: Wangun

**Status:** Draft v2 (scope diperluas — 3 pilar produk)
**Pemilik Produk:** NawfalJr / PT Kiracau Digital Solusi
**Dokumen terkait:** Blueprint Teknis Wangun (ERD/LRS, arsitektur, tech stack)

---

## 1. Ringkasan Eksekutif

**Wangun** adalah platform 3-in-1:
1. **Agentic AI Chat** — chat AI yang bisa menjalankan tugas multi-langkah secara otomatis (seperti ChatGPT/Claude/Gemini + kemampuan agentic)
2. **IDE terintegrasi** — code editor + terminal + file explorer di browser, dengan AI agent yang bisa langsung mengedit & menjalankan kode (seperti VSCode/Antigravity/Cursor)
3. **Router-as-a-Service** — endpoint API publik yang bisa dipakai developer lain sebagai gateway multi-provider AI gratis/murah, persis fungsi 9Router/OpenRouter, tapi dibangun & dikendalikan sendiri

Ketiganya berbagi satu fondasi yang sama: **Model Router** buatan sendiri yang mengalihkan request ke berbagai API AI gratis (Gemini, DeepSeek, dll).

⚠️ **Catatan scope**: Ini gabungan 3 produk yang masing-masing besar. PRD ini mendokumentasikan visi penuh, tapi requirement dibagi jelas per fase (v1/v2/v3) di Bagian 7 & 10 supaya tidak semua dikerjakan sekaligus.

---

## 2. Problem Statement

**Untuk pengguna akhir**: Chatbot AI umum hanya menjawab satu putaran percakapan — tugas multi-langkah (riset, analisis, coding) butuh banyak prompt manual. Alat automation yang ada (n8n, Zapier) tidak ramah non-teknis dan tidak punya lapisan chat natural.

**Untuk developer (termasuk NawfalJr sendiri)**: Untuk membangun aplikasi berbasis AI, developer perlu (a) IDE yang mendukung coding dibantu agent, dan (b) akses ke banyak model AI tanpa terikat satu provider — biasanya lewat layanan pihak ketiga (OpenRouter, 9Router) yang berarti bergantung pada infrastruktur orang lain, kebijakan mereka, dan kadang biaya tersembunyi.

**Dampak kalau tidak diselesaikan**: waktu terbuang untuk kerja manual berulang; developer termasuk NawfalJr tetap bergantung pada tools pihak ketiga untuk kebutuhan router AI, alih-alih punya infrastruktur sendiri di bawah [[pt-kiracau-digital-solusi]] yang bisa dikendalikan dan bahkan ditawarkan sebagai layanan ke pihak lain.

---

## 3. Tujuan Produk (Goals)

| # | Goal | Cara mengukur |
|---|---|---|
| G1 | Pengguna bisa menyelesaikan tugas riset/analisis multi-langkah lewat satu permintaan chat | ≥70% agent task berakhir status `done` dalam uji internal |
| G2 | Biaya operasional model AI tetap mendekati Rp0 | 100% traffic (chat + router API) terlayani provider gratis selama v1–v2 |
| G3 | Pengguna baru bisa memakai fitur chat dasar tanpa panduan | Kirim pesan pertama & dapat jawaban dalam <2 menit pertama buka aplikasi |
| G4 | Fitur agentic terasa transparan, bukan black box | Setiap agent task menampilkan rencana + daftar tool yang dipanggil |
| G5 | Wangun jadi fondasi produk internal PT Kiracau Digital Solusi | Dipakai untuk ≥1 use case nyata dari proyek internal dalam 3 bulan |
| **G6** (baru) | Developer eksternal bisa memakai Wangun sebagai router AI mereka sendiri, semudah memakai OpenRouter/9Router | Minimal 1 developer (bisa NawfalJr sendiri di proyek lain) berhasil mengintegrasikan endpoint router Wangun ke aplikasi terpisah |
| **G7** (baru) | Pengguna bisa menulis & menjalankan kode dengan bantuan agent dalam satu aplikasi (tanpa pindah ke VSCode) | Minimal 1 alur coding end-to-end (edit file → jalankan → lihat output) berhasil diselesaikan lewat IDE Wangun |

---

## 4. Non-Goals (Per Fase)

| # | Non-Goal | Fase | Alasan |
|---|---|---|---|
| NG1 | Melatih/fine-tune model LLM sendiri | Semua fase | Di luar skala proyek; cukup manfaatkan API yang ada |
| NG2 | Dukungan multi-bahasa penuh (selain ID & EN) | Semua fase | Fokus kualitas 2 bahasa dulu |
| NG3 | Integrasi tools eksternal (Slack, Notion, dsb) | v1 | Terlalu banyak permukaan kerja untuk MVP |
| NG4 | Model bisnis berbayar/subscription untuk chat | v1–v2 | Validasi fungsi & biaya-nol dulu |
| NG5 | Aplikasi mobile native | Semua fase | Web responsif cukup untuk validasi |
| NG6 | Multi-tenant/tim (workspace bersama) | v1–v2 | Fokus single-user dulu |
| **NG7** | Ekstensi/plugin ecosystem penuh untuk IDE (seperti VSCode Marketplace) | v3 (IDE) | Kompleksitas sangat tinggi; fokus dulu ke editor+terminal+agent inti |
| **NG8** | Billing/kuota berbayar untuk Router-as-a-Service (API key berbayar) | v2 | v2 fokus validasi bahwa router bisa dipakai eksternal, monetisasi dibahas belakangan |
| **NG9** | SLA/uptime komersial untuk Router API | v2 | Belum ditujukan untuk trafik produksi pihak lain yang kritis di tahap ini |

---

## 5. Target Pengguna & Persona

| Persona | Deskripsi | Kebutuhan utama | Fase relevan |
|---|---|---|---|
| **Pemilik/Operator Bisnis Kecil** | Non-teknis, butuh analisis data sederhana | Chat natural, hasil ringkas | v1 |
| **Pengguna Individu/Peneliti Ringan** | Riset cepat multi-sumber | Mode agentic, transparansi proses | v1 |
| **NawfalJr (internal/admin)** | Pemilik produk, dogfooder pertama | Kontrol penuh provider/router, observability | Semua fase |
| **Developer/Pembuat Aplikasi** (baru) | Butuh akses banyak model AI gratis untuk aplikasi mereka sendiri, tanpa depend ke OpenRouter/9Router pihak ketiga | Endpoint API stabil, dokumentasi jelas, API key sendiri | v2 |
| **Pengguna Coding/Hobbyist** (baru) | Ingin ngoding dibantu agent tanpa install IDE terpisah | Editor + terminal + agent yang terintegrasi | v3 |

---

## 6. User Stories

### Chat & Agentic (v1)
- Sebagai pengguna baru, saya ingin langsung mengetik pertanyaan tanpa setup rumit
- Sebagai pengguna, saya ingin jawaban muncul secara streaming
- Sebagai pengguna, saya ingin meminta tugas seperti "riset kompetitor X" dan melihat progres agent secara transparan
- Sebagai pengguna, saya ingin menghentikan tugas agent yang sedang berjalan
- Sebagai pengguna, saya ingin AI mengingat preferensi saya lintas sesi, dan bisa menghapusnya kapan saja

### Router-as-a-Service (v2) — BARU
- Sebagai developer eksternal, saya ingin membuat API key di Wangun, supaya saya bisa memanggil endpoint router dari aplikasi saya sendiri
- Sebagai developer eksternal, saya ingin endpoint Wangun kompatibel format OpenAI (`/v1/chat/completions`), supaya saya tidak perlu ubah banyak kode dari SDK yang sudah saya pakai
- Sebagai developer eksternal, saya ingin melihat dokumentasi API yang jelas dengan contoh kode, supaya saya bisa integrasi dalam hitungan menit
- Sebagai developer eksternal, saya ingin tahu kuota/rate limit API key saya, supaya saya bisa merencanakan pemakaian
- Sebagai admin (NawfalJr), saya ingin bisa mencabut/nonaktifkan API key tertentu, supaya saya bisa menangani penyalahgunaan
- Sebagai developer eksternal, saya ingin mendapat error yang jelas kalau kuota habis atau key tidak valid, bukan response yang membingungkan

### IDE (v3) — BARU
- Sebagai pengguna, saya ingin membuka/membuat file dalam satu workspace, supaya saya bisa mengorganisir proyek kecil saya
- Sebagai pengguna, saya ingin mengetik kode dengan syntax highlighting dasar, supaya lebih mudah dibaca
- Sebagai pengguna, saya ingin meminta agent mengedit file saya langsung ("tambahkan fungsi X di file ini"), dan melihat diff sebelum diterapkan
- Sebagai pengguna, saya ingin menjalankan kode saya lewat terminal terintegrasi, supaya saya tidak perlu tools eksternal
- Sebagai pengguna, saya ingin agent bisa menjalankan perintah terminal sendiri (misal `npm install`) sebagai bagian dari tugas agentic, dengan konfirmasi saya dulu untuk perintah yang berisiko

### Edge case (semua fase)
- Sebagai pengguna, saya ingin pesan error jelas kalau semua provider AI tidak tersedia
- Sebagai pengguna, saya ingin agent berhenti otomatis kalau melebihi batas langkah wajar
- Sebagai developer eksternal, saya ingin request saya tidak pernah "menyedot" kuota gratis milik pengguna chat internal secara tidak adil (isolasi kuota antara traffic internal vs eksternal)

---

## 7. Requirements

### v1 — MVP Chat & Agentic (Must-Have)

| Requirement | Acceptance Criteria |
|---|---|
| Auth dasar | - [ ] Registrasi/login email atau Google<br>- [ ] Password ter-hash |
| Chat streaming | - [ ] Riwayat tersimpan<br>- [ ] Jawaban streaming token demi token |
| Model Router (internal) | - [ ] Minimal 2 provider (Gemini+DeepSeek)<br>- [ ] Fallback otomatis<br>- [ ] Tercatat di `usage_logs` |
| Agent v1 (1 tool: web_search) | - [ ] Rencana+eksekusi+observasi ditampilkan<br>- [ ] Batas maksimum langkah (10) |
| Riwayat percakapan | - [ ] Sidebar daftar percakapan, bisa dihapus |
| Desain simpel & elegan | - [ ] Palet netral + 1 aksen, responsif |

### v2 — Router-as-a-Service (Must-Have untuk fase ini)

| Requirement | Acceptance Criteria |
|---|---|
| Manajemen API Key | - [ ] User bisa generate/cabut API key dari dashboard<br>- [ ] Key ditampilkan hanya sekali saat dibuat (hash disimpan, bukan plain text) |
| Endpoint publik kompatibel OpenAI | - [ ] `POST /v1/chat/completions` menerima format standar OpenAI<br>- [ ] Response format sama seperti OpenAI API<br>- [ ] Mendukung `stream: true` |
| Rate limit per API key | - [ ] Kuota harian per key dari tabel `plans`/`api_keys`<br>- [ ] Response 429 jelas kalau kuota habis |
| Isolasi kuota internal vs eksternal | - [ ] Traffic dari chat internal dan dari API key eksternal tercatat & dibatasi terpisah, tidak saling mengganggu |
| Dokumentasi API | - [ ] Halaman docs dengan contoh `curl` dan contoh kode JS/Python<br>- [ ] Contoh mengganti `base_url` dari OpenAI SDK ke endpoint Wangun |
| Dashboard pemakaian developer | - [ ] Developer melihat jumlah request/token terpakai per key |

### v3 — Modul IDE (Must-Have untuk fase ini)

| Requirement | Acceptance Criteria |
|---|---|
| Workspace & file explorer | - [ ] User bisa buat workspace, buat/hapus/rename file & folder |
| Code editor | - [ ] Syntax highlighting untuk bahasa umum (JS/TS/Python)<br>- [ ] Multi-tab file terbuka |
| Terminal terintegrasi | - [ ] User bisa jalankan perintah dasar (install, run script)<br>- [ ] Output terminal tampil real-time |
| Agent coding v1 | - [ ] Agent bisa memanggil tool `write_file` dan `run_terminal`<br>- [ ] Perubahan file ditampilkan sebagai diff yang harus dikonfirmasi user sebelum diterapkan (kecuali user set mode auto-apply) |
| Sandbox eksekusi aman | - [ ] Setiap workspace berjalan di container terisolasi, tanpa akses ke sistem lain |

### Nice-to-Have (P1, lintas fase)

- Tool tambahan agent: `read_file` (v1), `run_code` sandbox umum (v1/v2)
- Memory/RAG lintas sesi (v1)
- Dashboard admin untuk atur prioritas provider tanpa deploy (v1)
- Dukungan multi-file edit sekaligus oleh agent di IDE (v3)
- Log request router API per endpoint yang dipanggil developer eksternal, untuk analitik (v2)

### Future Considerations (P2)

- Model bisnis berbayar untuk chat maupun Router-as-a-Service (tabel `plans`/`api_keys` didesain sejak awal supaya siap diaktifkan)
- Kolaborasi tim/workspace bersama di IDE
- Ekstensi pihak ketiga untuk IDE
- Integrasi tools eksternal (Slack, Notion, GitHub) di semua pilar

---

## 8. Success Metrics

**Leading indicators (mingguan, per fase):**
- v1: tingkat penyelesaian agent task ≥70%; waktu jawaban pertama <5 detik
- v2: jumlah request sukses lewat endpoint router publik; tingkat error 429/500 <5%
- v3: tingkat berhasil dari "edit file → jalankan → lihat output" tanpa error sistem

**Lagging indicators (3 bulan):**
- Wangun dipakai nyata di ≥1 proyek internal PT Kiracau (G5)
- Minimal 1 integrasi eksternal berhasil pakai endpoint router Wangun (G6)
- Biaya API kumulatif tetap Rp0 di v1–v2 (100% provider gratis)
- Jumlah bug/error kritis menurun tiap iterasi

---

## 9. Open Questions

- **[Produk]** Mode agentic dipicu otomatis atau toggle manual di v1? *(Rekomendasi: toggle manual dulu)*
- **[Teknis]** Berapa batas kuota harian yang adil antara traffic chat internal vs API key eksternal, supaya satu sisi tidak menghabiskan kuota gratis provider untuk sisi lain?
- **[Teknis - IDE]** Sandbox eksekusi kode di IDE pakai Docker container per workspace, atau layanan terkelola (E2B/sejenis)? Trade-off: kontrol penuh vs kompleksitas ops
- **[Bisnis]** Kapan Router-as-a-Service mulai dipertimbangkan untuk dibuka ke publik luas (bukan cuma dogfooding), mengingat NG8/NG9 mengeluarkan billing/SLA dari v2?
- **[Desain]** Apakah IDE dan Chat jadi satu aplikasi dengan mode switch, atau dua halaman terpisah yang berbagi akun? — mempengaruhi kompleksitas navigasi

---

## 10. Timeline & Phasing

| Fase | Fokus | Perkiraan durasi |
|---|---|---|
| **v1: Fondasi Chat & Agent** | Auth, chat streaming, router 2 provider, agent v1 (web search), memory dasar | 9 minggu (lihat Blueprint Bagian 21) |
| **v2: Router-as-a-Service** | API key management, endpoint publik kompatibel OpenAI, rate limit terpisah, dokumentasi developer | +4–6 minggu setelah v1 stabil |
| **v3: Modul IDE** | Monaco Editor, terminal (xterm.js), sandbox per workspace, agent coding (write_file/run_terminal) | +6–8 minggu setelah v2 |

**Dependensi:** v2 bergantung pada Model Router v1 sudah stabil (endpoint publik cuma "membuka" router yang sudah ada ke luar). v3 bergantung pada Agent Orchestrator v1 sudah matang (tool baru `write_file`/`run_terminal` adalah ekstensi dari tool layer yang sama).

**Rekomendasi urutan**: jangan kerjakan v1/v2/v3 paralel — masing-masing sudah cukup besar sendiri-sendiri. Selesaikan v1 sampai benar-benar dipakai nyata (G5) sebelum mulai v2.

---

## 11. Referensi

- Blueprint Teknis Wangun: arsitektur sistem, ERD/LRS, desain Model Router, Router-as-a-Service, Agent Loop, Modul IDE, rekomendasi tech stack (dokumen terpisah)
