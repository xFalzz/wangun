# Prompt: Debug Error dengan Cepat — Wangun

Saya ada bug di Wangun. JANGAN tulis fix dulu.

Error / perilaku yang tidak diharapkan: [TEMPEL ERROR]
Modul yang terdampak: [router / agent / gateway / ide / db / auth / ui — pilih yang relevan]
Yang saya harapkan: [JELASKAN]
Yang sebenarnya terjadi: [JELASKAN]
Kode relevan: [TEMPEL ATAU TUNJUK FILE]
Yang sudah saya coba: [DAFTAR]

Langkah 1: Restate masalahnya pakai kata-katamu sendiri supaya kita satu pemahaman.
Langkah 2: Daftar 3-5 kemungkinan root cause paling besar, urut berdasarkan probabilitas, tiap poin sertakan alasan — pertimbangkan juga apakah ini terkait pola arsitektur Wangun yang relevan (misal: kalau bug di agent loop, cek apakah ini soal parsing JSON action yang gagal, state status yang salah, atau maxSteps; kalau di router, cek apakah ini soal fallback provider atau format adapter yang salah).
Langkah 3: Untuk tiap penyebab, kasih satu cara tercepat untuk konfirmasi atau eliminasi — satu log line, satu pengecekan, satu test singkat.
Langkah 4: Berhenti dan tunggu hasil dari saya.
Langkah 5: Setelah penyebabnya terkonfirmasi, baru tulis fix paling minimal, jelaskan kenapa itu berhasil, dan beri tahu persis apa yang harus saya tes untuk verifikasi.

Jangan shotgun perubahan. Jangan refactor kode yang tidak terkait. Jangan benerin hal yang tidak saya minta.
