/**
 * Database client — Drizzle ORM + node-postgres
 *
 * Dua mode koneksi (keduanya tersedia dari Neon/Vercel env vars):
 *
 * 1. DATABASE_URL (pooled via pgbouncer)
 *    → Dipakai untuk query runtime di Next.js API routes
 *    → Efisien untuk banyak koneksi singkat (serverless)
 *
 * 2. DATABASE_URL_UNPOOLED (direct connection)
 *    → Dipakai untuk drizzle-kit migrate/generate (lihat drizzle.config.ts)
 *    → Tidak perlu di sini — drizzle-kit baca langsung dari env
 */

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Pastikan .env.local sudah terisi dengan connection string Neon."
  );
}

// Pool koneksi — pg otomatis reuse koneksi, efisien untuk serverless
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // ssl wajib untuk Neon (sudah termasuk di connection string via ?sslmode=require)
  ssl: process.env.DATABASE_URL.includes("sslmode=require")
    ? { rejectUnauthorized: false }
    : false,
  max: 10, // maks koneksi simultan (cukup untuk dev + staging)
});

// Instance Drizzle — diexport dan dipakai di seluruh codebase
export const db = drizzle(pool, { schema });

// Re-export schema untuk kemudahan import
export * from "./schema";
