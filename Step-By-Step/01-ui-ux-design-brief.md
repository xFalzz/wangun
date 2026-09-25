# Prompt: Full UI & UX Design Brief — Wangun

Konteks proyek: **Wangun** — platform 3 pilar (1. Agentic AI Chat, 2. Router-as-a-Service, 3. IDE terintegrasi). Dokumen sumber: PRD Wangun v2 dan Blueprint Wangun (sudah dilampirkan/ditempel di context ini). Arahan desain yang SUDAH ditetapkan di Blueprint Bagian 18 dan WAJIB dipatuhi sebagai constraint, bukan didesain ulang dari nol:
- Palet netral (monokrom) + satu warna aksen saja, tanpa gradient
- Font sans-serif bersih untuk UI (Inter/Geist/IBM Plex Sans) + font monospace untuk area kode (JetBrains Mono/Fira Code)
- Dark mode sebagai default
- Progress agent ditampilkan sebagai list yang bisa expand/collapse, bukan animasi ramai
- Konsistensi visual antara halaman Chat dan halaman IDE (komponen dipakai ulang)

---

Kamu adalah senior product designer. Berdasarkan PRD dan Blueprint Wangun di atas, buatkan design brief lengkap sebelum satu baris kode pun ditulis. Brief ini harus taat pada arahan desain yang sudah ditetapkan di atas — jangan usulkan palet/font baru kecuali kamu jelaskan kenapa yang sudah ditetapkan tidak cukup.

Hasilkan:
1. **Design principles** — 3 aturan yang wajib dipatuhi UI ini, diturunkan dari sifat produk (agentic, transparan, 3 pilar dalam satu identitas visual)
2. **Visual direction** — mood, referensi (boleh sebut produk sejenis: Linear, Vercel dashboard, VSCode), apa yang dihindari (jangan sebut kompetitor closed-source tanpa alasan teknis)
3. **Design tokens** — palet warna + hex (turunkan dari 1 aksen yang ditetapkan), skala tipografi (UI font & monospace font terpisah), skala spacing, radius, shadow (kalau ada — ingat prinsip "tidak mentereng")
4. **Screen inventory** — screen apa saja yang dibutuhkan untuk MVP v1 (auth, chat, riwayat percakapan, pengaturan memory) — JANGAN masukkan screen v2 (dashboard API key) atau v3 (IDE) kecuali diminta eksplisit
5. **User flow** — langkah demi langkah untuk 2 journey utama v1: (a) kirim pesan chat biasa sampai dapat jawaban, (b) mulai mode agentic sampai lihat hasil
6. **Layout per screen** — section, hierarki, primary action, komponen yang dipakai, untuk tiap screen di inventory
7. **Component library** — tiap komponen reusable + variant dan state-nya (termasuk: chat bubble, kartu progress agent thought/action/observation, sidebar item percakapan)
8. **State** — empty, loading, error, offline untuk tiap screen kunci (khususnya: chat kosong pertama kali, agent task gagal, provider AI semua down)
9. **Responsive behaviour** — mobile, tablet, desktop
10. **Accessibility** — rasio kontras (penting karena dark mode default), focus order, keyboard nav, kebutuhan ARIA untuk streaming text & progress agent yang update dinamis

Ambil keputusan yang tegas dan jelaskan alasannya, dengan mengaitkan ke tujuan produk (Goals G1–G5 di PRD) yang relevan. Jangan usulkan default yang generic. Kalau ragu antara dua opsi, pilih salah satu dan jelaskan trade-off yang kamu tolak.
