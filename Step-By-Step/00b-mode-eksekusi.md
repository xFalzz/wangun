konfirmasi ini# Mode Eksekusi Wangun — Otonomi Bertingkat & Checkpoint Report

Ini aturan standing tambahan setelah `00a-onboarding-context.md`. Tujuannya: kamu (AGV) bisa mengerjakan lebih banyak langkah tanpa berhenti tiap tool call kecil, TAPI tetap berhenti di titik yang benar-benar butuh keputusan manusia — bukan berhenti karena ragu-ragu, dan bukan juga lanjut terus padahal seharusnya berhenti.

Baca ini sekali di awal sesi kerja, lalu terapkan sepanjang sesi tanpa perlu ditanya ulang setiap kali.

---

## 1. Klasifikasi Tugas — Tentukan Dulu Sebelum Mulai

Sebelum mengerjakan task apapun (satu Build #, satu bugfix, satu fitur kecil), klasifikasikan dulu ke salah satu tier ini. Kalau ragu tugas masuk tier mana, **anggap Tier 1** (lebih aman salah konservatif daripada salah longgar).

### Tier 1 — Krusial, butuh checkpoint approval
Karakteristik: kesalahan di sini menjalar ke banyak lapisan lain, sulit dideteksi otomatis, atau menyentuh hal yang tidak bisa di-undo dengan mudah.
- Model Router, Agent Loop, arsitektur inti
- Auth, session, credential handling
- Skema database & migrasi (terutama yang mengubah/menghapus kolom/tabel)
- Apapun yang menyentuh eksekusi kode/sandbox/terminal command (`run_terminal`, `write_file` di luar scope yang jelas)
- Menambah dependency/package baru yang belum pernah disebut di PRD/Blueprint
- Keputusan yang menyimpang dari apa yang sudah disepakati di PRD/Blueprint (termasuk kalau kamu merasa caramu "lebih baik")
- Apapun yang berpotensi memakan biaya (API call ke provider berbayar dalam jumlah besar, keputusan yang mempengaruhi tagihan)

### Tier 2 — Medium, kerjakan otonom lalu lapor di checkpoint
Karakteristik: mengikuti pola yang sudah ada/disetujui sebelumnya, kesalahan mudah dideteksi dan diperbaiki sendiri.
- Fitur CRUD yang mengikuti pola dari Build sebelumnya yang sudah disetujui
- Komponen UI baru yang memakai design token yang sudah dikunci di Design Brief
- Menulis test untuk kode yang sudah ada
- Endpoint API baru yang tidak mengubah skema/auth

### Tier 3 — Rendah, kerjakan otonom penuh tanpa lapor detail
- Styling/formatting, perbaikan typo, komentar kode, refactor internal yang tidak mengubah interface publik
- Perbaikan bug kecil yang scope-nya sudah jelas dan sudah dites sendiri berhasil

---

## 2. Kapan WAJIB Berhenti dan Tanya (berlaku di semua tier)

Berhenti — walau sedang di tengah task Tier 2/3 sekalipun — kalau salah satu ini terjadi:

1. **Ada 2+ pilihan valid dengan trade-off berbeda** yang tidak bisa kamu putuskan sendiri lewat test (misal: pilih library A vs B, ubah struktur folder, ganti pendekatan arsitektur)
2. **Command yang destruktif atau tidak bisa dibatalkan**: `DROP TABLE`, `rm -rf`, force push, overwrite file yang belum di-commit, apapun yang menghapus data
3. **Menemukan sesuatu yang bertentangan dengan yang sudah disepakati** di PRD/Blueprint/percakapan sebelumnya (contoh nyata: menemukan perlu Docker padahal user sudah bilang tidak mau)
4. **Kredensial/dana habis atau bermasalah** (402, 401, quota habis) — laporkan sebagai blocker, jangan coba workaround sendiri (misal ganti ke API key lain tanpa izin)
5. **Baru pertama kali integrasi ke provider/service eksternal** — minimal satu kali konfirmasi hasil test sebelum dipakai di banyak tempat

## 3. Kapan BOLEH Lanjut Otonom Tanpa Bertanya

- Memperbaiki bug yang scope-nya jelas dan bisa kamu verifikasi sendiri hasilnya benar (seperti kasus `max_tokens` kemarin — coba, buktikan lewat test nyata, baru lanjut)
- Retry dengan parameter yang sudah terbukti salah dari hasil test sebelumnya
- Menulis dokumentasi/komentar/test tambahan
- Mengikuti pola yang sudah eksplisit disetujui sebelumnya di Build # lain

---

## 4. Aturan Anti-Tebakan (Non-Negotiable)

Ini berlaku di SEMUA tier, tanpa kecuali:

- **Jangan menyimpulkan penyebab suatu masalah tanpa verifikasi empiris.** Kalau tidak yakin kenapa sesuatu gagal/kosong/error, tulis "penyebab belum dikonfirmasi" dan coba buktikan dengan test — jangan menulis dugaan seolah fakta (contoh yang harus dihindari: menyimpulkan "mungkin ini model safety" tanpa bukti, padahal penyebabnya cuma `max_tokens` kekecilan)
- **Jangan menambahkan sesuatu yang tidak diminta** meski menurutmu itu best practice (contoh: menambah Docker Compose tanpa diminta). Kalau menurutmu sesuatu itu perlu, laporkan sebagai saran, jangan langsung dieksekusi.
- **Klaim teknis penting (format API, nama field, perilaku provider) harus diverifikasi lewat dokumentasi resmi TERBARU atau test langsung** — jangan andalkan pengetahuan lama, karena provider API sering berubah tanpa pemberitahuan (lihat kasus `deepseek-v4-pro` yang diam-diam di-reroute).

---

## 5. Format Laporan di Checkpoint

Untuk task Tier 1 dan Tier 2, laporkan di titik checkpoint (bukan tiap tool call kecil) dengan format ini:

```
## Ringkasan [nama Build/task]

**Selesai dikerjakan:**
- (poin-poin apa yang dibuat/diubah)

**Sudah diuji, hasilnya:**
- (test apa yang dijalankan, hasil nyata — bukan "seharusnya bekerja")

**Keputusan yang saya ambil sendiri (Tier 2/3, tidak perlu approval tapi transparan):**
- (keputusan + alasan singkat)

**Butuh keputusan/approval kamu:**
- (list hal yang masuk kriteria "wajib berhenti" di atas — kalau kosong, tulis "tidak ada")

**Isu terbuka/belum terselesaikan:**
- (kalau ada)
```

Jangan lapor tiap kali menjalankan satu command kecil (`npm install`, satu `view` file, dst) — kumpulkan dulu sampai ada unit kerja yang selesai (satu Build # penuh, atau satu fitur Tier 2 penuh), baru lapor sekali dengan format di atas.

---

## Catatan untuk kamu (user), bukan untuk AGV

Cara pakai: kirim file ini setelah `00a-onboarding-context.md` dikonfirmasi, sebelum mulai Build # berikutnya. Untuk Build # yang menurutmu risikonya rendah (styling, CRUD sederhana), kamu bisa eksplisit bilang "ini Tier 2, kerjakan sampai selesai baru lapor" di pesan pembuka task itu — supaya AGV tidak ragu-ragu mengklasifikasikan sendiri kalau kamu sudah tahu levelnya.

Untuk Build # yang jelas Tier 1 (Router, Agent Loop, Security Audit, Memory/RAG) tetap wajar kalau review-nya lebih rapat seperti yang kita lakukan sejauh ini — bukan berarti aturan ini menghilangkan kehati-hatian di situ, cuma mengurangi kehati-hatian yang tidak perlu di task yang risikonya memang rendah.
