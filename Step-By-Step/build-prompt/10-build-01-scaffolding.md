# Prompt Build #1 (KRUSIAL): Project Scaffolding — Wangun

Kamu adalah senior fullstack engineer. Kita mulai membangun Wangun v1 (fondasi Chat & Agent saja — JANGAN sentuh apapun terkait Router-as-a-Service/API key atau IDE/workspace, itu fase v2/v3 nanti).

Inisialisasi project dengan keputusan teknis berikut (SUDAH FINAL, jangan tanya ulang atau usulkan alternatif):
- Next.js 14+, App Router, TypeScript strict mode
- Tailwind CSS
- ORM: **Drizzle ORM** + drizzle-kit untuk migrasi, driver `node-postgres`
- Auth: **Auth.js (NextAuth v5)** — akan diimplementasikan di prompt terpisah, sekarang cukup install dependency-nya saja
- Validasi input: **zod**
- Password hashing: **bcrypt**

⚠️ **ATURAN FOLDER — WAJIB DIPATUHI**: folder yang sedang terbuka di editor SEKARANG adalah root project Wangun. Inisialisasi Next.js harus dilakukan LANGSUNG di folder ini (misal `npx create-next-app@latest . ` dengan titik/current-directory, BUKAN `npx create-next-app wangun` yang akan membuat subfolder baru bernama `wangun` di dalamnya). Jangan buat folder pembungkus/nested apapun untuk project ini — hasil akhirnya adalah `package.json`, `src/`, dll langsung di root yang sudah terbuka, bukan di dalam subfolder tambahan.

Langkah:
1. Inisialisasi project Next.js LANGSUNG di root folder yang sudah terbuka (lihat aturan folder di atas)
2. Buat struktur folder PERSIS sesuai Blueprint Bagian 14 (tampilkan strukturnya sebelum membuat file, untuk saya cek dulu)
3. Install semua dependency yang disebut di atas, plus `drizzle-orm`, `drizzle-kit`, `pg`, `next-auth@beta`, `bcrypt`, `zod`
4. Setup `tsconfig.json` (strict: true), ESLint, Prettier dengan config standar Next.js
5. Buat `.env.example` berisi semua variabel yang akan dibutuhkan: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GEMINI_API_KEY`, `DEEPSEEK_API_KEY`
6. Buat `docker-compose.yml` untuk PostgreSQL + ekstensi pgvector khusus development lokal

**Larangan eksplisit**: jangan install LangChain, LangGraph, atau agent framework apapun — Agent Orchestrator akan ditulis manual di prompt build berikutnya (sesuai prinsip "dari nol" di Blueprint Bagian 2). Jangan buat halaman/komponen UI apapun dulu di prompt ini — murni setup project.

Output akhir: tampilkan struktur folder final, isi `package.json`, dan cara menjalankan `docker-compose up` + `npm run dev`.
