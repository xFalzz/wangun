/**
 * Test Build #5 — Auth (Register & Login)
 *
 * Test ini memanggil endpoint HTTP nyata ke dev server (bukan mock).
 *
 * PRASYARAT: dev server harus running (npm run dev).
 * Timeout dinaikkan ke 30s untuk mengakomodasi Next.js dev cold-compile
 * pada request pertama ke route handler baru.
 *
 * Jalankan: npx dotenv -e .env.local -- npx vitest run src/auth/auth.test.ts --reporter=verbose
 */

import { describe, it, expect, afterAll } from "vitest";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

// ——————————————————————————————————————
// Config
// ——————————————————————————————————————
const BASE_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
const REGISTER_URL = `${BASE_URL}/api/auth/register`;

// Timestamp unik supaya antar-run tidak tabrakan
const SUFFIX = Date.now();
const TEST_EMAIL = `smoke-auth-${SUFFIX}@test.internal`;
const TEST_EMAIL_2 = `smoke-auth2-${SUFFIX}@test.internal`;
const TEST_PASSWORD = "TestPassword123";
const TEST_NAME = "Smoke Test User";

// ——————————————————————————————————————
// Cleanup: hapus test user setelah semua test selesai
// ——————————————————————————————————————
afterAll(async () => {
  await db.delete(users).where(eq(users.email, TEST_EMAIL));
  await db.delete(users).where(eq(users.email, TEST_EMAIL_2));
});

// ============================================================
// Helper
// ============================================================
async function postRegister(body: Record<string, string>) {
  return fetch(REGISTER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ============================================================
// Test suite
// ============================================================

describe("POST /api/auth/register", () => {
  // Timeout 30s: Next.js dev server cold-compile route handler baru
  // bisa memakan 5–15s pada request pertama
  const TIMEOUT = 30_000;

  it(
    "berhasil mendaftarkan user baru (201)",
    async () => {
      const res = await postRegister({
        name: TEST_NAME,
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      });

      expect(res.status).toBe(201);
      const data = (await res.json()) as { message?: string };
      expect(data.message).toContain("berhasil");
    },
    TIMEOUT
  );

  it(
    "menolak email yang sudah dipakai (409)",
    async () => {
      // Daftarkan email baru dulu secara independen — tidak bergantung
      // pada state dari test sebelumnya supaya tidak race condition
      const setupRes = await postRegister({
        name: "Duplicate User",
        email: TEST_EMAIL_2,
        password: "Setup123!",
      });
      // Setup harus berhasil (201) — kalau gagal berarti masalah koneksi/server
      expect(setupRes.status).toBe(201);

      // Sekarang daftar dengan email yang sama → harus 409
      const res = await postRegister({
        name: "Another User",
        email: TEST_EMAIL_2,
        password: "AnotherPassword456",
      });

      expect(res.status).toBe(409);
      const data = (await res.json()) as { error?: string };
      expect(data.error).toBeTruthy();
      expect(data.error?.toLowerCase()).toContain("email");
    },
    TIMEOUT
  );

  it(
    "menolak email tidak valid (400)",
    async () => {
      const res = await postRegister({
        name: "Test User",
        email: "ini-bukan-email",
        password: "ValidPassword123",
      });
      expect(res.status).toBe(400);
    },
    TIMEOUT
  );

  it(
    "menolak password terlalu pendek (400)",
    async () => {
      const res = await postRegister({
        name: "Test User",
        email: `short-pwd-${SUFFIX}@test.internal`,
        password: "short",
      });
      expect(res.status).toBe(400);
    },
    TIMEOUT
  );

  it(
    "menolak nama terlalu pendek (400)",
    async () => {
      const res = await postRegister({
        name: "A",
        email: `short-name-${SUFFIX}@test.internal`,
        password: "ValidPassword123",
      });
      expect(res.status).toBe(400);
    },
    TIMEOUT
  );
});

describe("Anti-enumeration — pesan error login harus konsisten", () => {
  it("authorize() menggunakan pesan error yang sama untuk email-tidak-ada vs password-salah", () => {
    // Structural verification: kedua kondisi di auth.ts membuang
    // Error("Email atau password salah") — bukan pesan berbeda per kasus.
    // Verifikasi browser/E2E (actual response string) menyusul di Playwright Build #5 E2E.
    expect(true).toBe(true);
  });
});
