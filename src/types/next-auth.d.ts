/**
 * NextAuth v5 — TypeScript type augmentation
 *
 * Menambahkan field `id` (DB user id) ke tipe Session.User bawaan NextAuth.
 * Tanpa ini, `session.user.id` akan error TypeScript di server components
 * dan route handlers.
 *
 * Ref: https://authjs.dev/getting-started/typescript
 */

import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      /** DB user id dari tabel users.id (string karena JWT menyimpan string) */
      id: string;
    } & DefaultSession["user"];
  }
}

// JWT token type augmentation
declare module "next-auth/jwt" {
  interface JWT {
    /** DB user id — diisi di jwt callback saat login */
    userId?: string;
  }
}
