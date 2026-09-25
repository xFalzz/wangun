# Prompt: Onboarding Konteks Project — Wangun (kirim ini PALING PERTAMA)

Kita akan mulai kerja di project baru bernama **Wangun**. Sebelum saya kirim dokumennya, ikuti aturan ini:

1. **Jangan mulai menulis atau mengubah kode apapun** sampai saya eksplisit bilang "mulai kerjakan" — meskipun dokumen yang saya kirim nanti berisi hal yang terlihat bisa langsung dieksekusi.
2. Saya akan kirim beberapa dokumen secara berurutan dalam pesan-pesan terpisah. Untuk tiap dokumen yang saya kirim:
   - Baca dan pahami isinya
   - Balas dengan **ringkasan singkat 3-5 poin** untuk konfirmasi kamu paham inti dokumennya (jangan mengulang/menyalin seluruh isi dokumen kembali ke saya)
   - Tunggu dokumen berikutnya atau instruksi saya — jangan berinisiatif lanjut sendiri
3. Anggap kamu **tidak tahu apa-apa** soal project ini sebelumnya. Semua definisi (apa itu Wangun, fitur apa saja, arsitektur seperti apa) HANYA berasal dari dokumen yang saya kirim — jangan berasumsi atau mengisi kekosongan dengan tebakan dari pengetahuan umum soal "AI chat platform" pada umumnya.
4. **Folder project ini yang sedang terbuka sekarang ADALAH root project Wangun.** Semua file dan struktur folder dari Blueprint (termasuk hasil scaffolding nanti) dibuat LANGSUNG di dalam folder yang sudah terbuka ini. JANGAN membuat folder project baru di dalamnya (misal folder bernama `wangun/` atau `my-app/` di dalam root yang sudah terbuka) — itu akan membuat struktur folder jadi bersarang dua kali dan berantakan. Kalau ada tool/command yang secara default membuat folder baru (misal `create-next-app` tanpa flag tertentu), sesuaikan supaya hasilnya tetap berada langsung di root yang sudah terbuka, bukan di subfolder baru.
5. **Repo GitHub project ini adalah `https://github.com/xFalzz/wangun`.** Setiap kali menjalankan prompt Git Commit, commit yang sudah dibuat WAJIB langsung di-push ke repo ini (bukan hanya commit lokal) — ikuti instruksi push di dalam prompt Git Commit itu sendiri.

Dokumen yang akan saya kirim, dalam urutan ini:
1. **PRD (Product Requirements Document)** — definisi APA yang dibangun dan KENAPA: tujuan produk, target pengguna, requirement per fase (v1/v2/v3), yang termasuk dan tidak termasuk scope. Jadikan ini sumber kebenaran untuk pertanyaan "apakah fitur ini seharusnya ada/tidak".
2. **Blueprint Teknis** — definisi BAGAIMANA dibangun: arsitektur sistem, skema database (ERD/LRS), desain komponen inti (Model Router, Agent Orchestrator, Router-as-a-Service, Modul IDE), rekomendasi tech stack, dan struktur folder. Jadikan ini sumber kebenaran untuk keputusan teknis, penamaan modul, dan struktur kode — jangan menyimpang dari struktur folder atau skema yang sudah ditetapkan di sini tanpa alasan eksplisit.
3. **Prompt task spesifik** (akan menyusul satu per satu, kapan pun saya butuh) — setiap prompt ini adalah instruksi untuk SATU jenis pekerjaan (misalnya membuat design brief, audit keamanan, atau menulis commit). Prompt-prompt ini akan merujuk balik ke PRD dan Blueprint yang sudah kamu terima — pastikan kamu masih mengacu ke keduanya saat mengerjakannya, jangan menganggapnya task berdiri sendiri yang lepas dari konteks project.

Balas pesan ini dengan konfirmasi singkat bahwa kamu siap menerima dokumen pertama (PRD).
