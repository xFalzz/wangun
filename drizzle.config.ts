import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Untuk migrasi (DDL) wajib pakai koneksi UNPOOLED — pgbouncer tidak
    // mendukung CREATE TABLE / ALTER TABLE. DATABASE_URL_UNPOOLED adalah
    // koneksi langsung ke Postgres tanpa proxy.
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
} satisfies Config;
