# Prompt: Bersihkan & Refactor Dead Code — Wangun

Berperanlah sebagai senior engineer yang melakukan cleanup pass di repo Wangun ini. Kerjakan dalam dua fase dan berhenti di antaranya.

**FASE 1 — AUDIT (jangan ubah apapun):**
Temukan dan list, dengan bukti, yang benar-benar tidak terpakai:
- File, komponen, hook, util yang tidak terpakai (perhatikan khususnya modul `providers/`, `tools/`, `gateway/`, `ide/` — mudah ada sisa adapter/tool percobaan yang tidak jadi dipakai)
- Import, variabel, fungsi, export yang tidak terpakai
- Dependency yang tidak terpakai di package.json
- Env var, route, API endpoint yang tidak terpakai
- Blok kode yang di-comment out
- Logic yang terduplikasi di 2+ tempat — perhatikan khususnya logic parsing response provider AI (harusnya cuma ada di masing-masing file `providers/*.ts`, bukan diulang di tempat lain) dan logic validasi tool input (harusnya cuma di `tools/registry.ts` atau setara)
- File yang sudah kebesaran dan sebaiknya dipecah (perhatikan `agent/loop.ts` dan `router/index.ts` — modul inti yang paling rawan membengkak)

Sajikan sebagai tabel dengan risk level tiap item yang mau dihapus. Tandai apapun yang confidence-nya di bawah 90% — JANGAN hapus itu. Lalu berhenti dan tunggu.

**FASE 2 — EKSEKUSI (hanya setelah saya approve):**
- Hapus yang sudah saya approve
- Extract logic terduplikasi ke shared utilities
- Pecah file yang kebesaran sesuai garis tanggung jawab (misal: pisahkan `agent/loop.ts` jadi loop utama + parsing action, kalau memang sudah terlalu besar)

Aturan: behaviour harus tetap identik, tidak ada dependency baru, tidak ada rename public API (termasuk nama tool di registry dan format endpoint `/v1/chat/completions` — ini dipakai developer eksternal, breaking change di sini dampaknya besar). Kasih saya ringkasan tiap perubahan supaya bisa saya review diff-nya.
