# Prompt: Tulis Git Commit yang Rapi — Wangun

Review perubahan saya saat ini (staged dan unstaged) dan susun jadi commit yang rapi.

1. Rangkum apa yang benar-benar berubah dan kenapa, dikelompokkan berdasarkan intent. Kelompokkan per modul Wangun kalau relevan: `router` (Model Router/adapter provider), `agent` (Agent Orchestrator/ReAct loop), `gateway` (Router-as-a-Service/API key), `ide` (Monaco/xterm/sandbox), `db` (schema/migrasi), `auth`, `ui`, `docs`.
2. Pecah pekerjaan jadi commit atomic — satu perubahan logis per commit. Kalau ada yang mencampur fix dan refactor, pisahkan. Kalau ada perubahan yang menyentuh lebih dari satu modul di atas sekaligus, evaluasi apakah itu tanda perubahan perlu dipecah lebih jauh.
3. Untuk tiap commit, tulis pesan Conventional Commits:
   `type(scope): ringkasan imperatif singkat di bawah 60 karakter`
   Gunakan `scope` dari daftar modul di atas (`router`, `agent`, `gateway`, `ide`, `db`, `auth`, `ui`, `docs`) — jangan buat scope baru kecuali benar-benar di luar semua itu.

   Lalu baris kosong dan body yang menjelaskan KENAPA perubahan ini diperlukan beserta tradeoff-nya. Tandai breaking change dengan `BREAKING CHANGE:`.
4. Urutkan commit supaya repo tetap build dan test pass di setiap langkah.
5. Keluarkan perintah git yang persis, berurutan, termasuk file mana masuk commit yang mana.
6. **Setelah semua commit dibuat, push ke GitHub** di `https://github.com/xFalzz/wangun`:
   - Kalau remote `origin` belum diset: `git remote add origin https://github.com/xFalzz/wangun.git`, lalu `git branch -M main`, lalu `git push -u origin main`
   - Kalau remote sudah ada (push berikutnya): cukup `git push origin main` (atau branch yang sedang aktif)
   - Kalau push ditolak karena branch remote sudah punya history berbeda, JANGAN langsung force push — laporkan ke saya dulu apa isi perbedaannya
   - Konfirmasi ke saya URL commit yang berhasil di-push (link ke GitHub) sebagai bukti berhasil

Tipe: feat, fix, refactor, perf, docs, test, chore, style, build, ci
Jangan pernah tulis pesan samar seperti "update", "fix stuff", "changes", "wip", atau "improve wangun".
