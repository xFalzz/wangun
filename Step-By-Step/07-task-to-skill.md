# Prompt: Ubah Task Jadi Skill — Wangun

Kita baru saja menyelesaikan satu task bersama di proyek Wangun (Agentic AI Chat + Router-as-a-Service + IDE). Ubah jadi reusable Skill supaya saya tidak perlu menjelaskannya lagi.

Task-nya: [JELASKAN, ATAU BILANG "apa yang baru kita kerjakan"]

Hasilkan:
1. **Nama** — singkat, action-oriented
2. **Deskripsi** — trigger yang presisi: kapan persis Skill ini harus dan tidak boleh dipakai, termasuk kalimat yang mungkin diucapkan user. Cukup spesifik supaya selalu terpicu di task yang tepat dan tidak pernah terpicu di task yang tidak terkait.
3. **Instructions** — bernomor, langkah demi langkah, ditulis untuk model tanpa konteks sebelumnya (anggap dia tidak tahu apa itu Wangun, apa itu router/agent/gateway/ide). Sertakan apa yang harus dicek duluan (misal: baca `router/index.ts` dulu sebelum ubah provider), apa yang harus ditanyakan ke user, dan urutan pengerjaannya.
4. **Rules dan constraint** — requirement wajib (misal: jangan ubah format endpoint publik, jangan hardcode provider baru tanpa masuk tabel `model_providers`), dan hal yang tidak boleh terjadi.
5. **Output format** — persis seperti apa hasilnya, lengkap dengan template.
6. **Contoh lengkap** — satu contoh input sampai output, spesifik ke konteks Wangun.
7. **Failure mode** — 3-5 cara task ini biasa gagal di konteks Wangun dan cara menghindarinya (misal: lupa update dua tempat yang pakai logic sama, lupa isolasi kuota internal/eksternal, dsb — sesuaikan dengan task-nya).

Tulis supaya berdiri sendiri. Anggap pembacanya tidak tahu apa-apa soal project Wangun — skill ini harus tetap jelas dipakai bulan depan meski konteks percakapan ini sudah hilang.
