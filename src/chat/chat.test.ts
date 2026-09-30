/**
 * Acceptance test Build #6 — Chat Engine
 *
 * Verifikasi empiris (bukan mock):
 *  1. POST /api/conversations → buat conversation baru → dapat ID
 *  2. POST /api/chat          → stream jawaban dari LLM → content non-kosong
 *  3. GET /api/conversations/[id]/messages → setelah stream selesai,
 *     riwayat (user + assistant) tersimpan di DB
 *
 * Requirement acceptance dari spec: "kirim 1 pesan, refresh halaman, pesan dan
 * jawabannya masih tampil dari database (bukan hilang karena cuma di state React)."
 *
 * Prasyarat: dev server running + user test ada di DB (dibuat via /api/auth/register)
 * Timeout: 60s — chat endpoint memanggil LLM nyata + DB writes
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/db/client";
import { users, conversations, messages, plans } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hash } from "bcryptjs";

const BASE_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
const TIMEOUT = 60_000;

// ——————————————————————————————————————
// Setup: buat test user + login untuk dapat cookie session
// ——————————————————————————————————————
const SUFFIX = Date.now();
const TEST_EMAIL = `chat-test-${SUFFIX}@test.internal`;
const TEST_PASSWORD = "ChatTest123!";
const TEST_NAME = "Chat Test User";

let sessionCookie = "";
let testUserId: number | null = null;
let testConversationId: number | null = null;

beforeAll(async () => {
  // Pastikan plan Free ada
  await db.insert(plans).values({ id: 1, name: "Free", quotaDaily: 50, price: "0" }).onConflictDoNothing();

  // Buat user test langsung ke DB (bypass register endpoint — lebih cepat)
  const passwordHash = await hash(TEST_PASSWORD, 12);
  const inserted = await db
    .insert(users)
    .values({ name: TEST_NAME, email: TEST_EMAIL, passwordHash, planId: 1 })
    .returning({ id: users.id });
  testUserId = inserted[0]?.id ?? null;

  // Login via NextAuth credentials endpoint untuk dapat session cookie
  // NextAuth v5 butuh CSRF token dulu
  const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`);
  const csrfData = (await csrfRes.json()) as { csrfToken: string };
  const csrfCookies = csrfRes.headers.get("set-cookie") ?? "";

  const loginRes = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: csrfCookies,
    },
    redirect: "manual",
    body: new URLSearchParams({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      csrfToken: csrfData.csrfToken,
      callbackUrl: BASE_URL,
      json: "true",
    }),
  });

  // Kumpulkan semua cookies dari response (session + CSRF)
  const rawCookies = loginRes.headers.getSetCookie?.() ?? [];
  sessionCookie = [csrfCookies, ...rawCookies].join("; ");
}, TIMEOUT);

afterAll(async () => {
  // Hapus data test (cascade: conversations → messages otomatis terhapus)
  if (testUserId) {
    await db.delete(users).where(eq(users.id, testUserId));
  }
});

// ============================================================
// Tests
// ============================================================

describe("Build #6 — Chat Engine acceptance test", () => {
  it(
    "POST /api/conversations → 201 + dapat conversation ID",
    async () => {
      const res = await fetch(`${BASE_URL}/api/conversations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: sessionCookie,
        },
        body: JSON.stringify({ title: "Test conversation" }),
      });

      expect(res.status).toBe(201);
      const data = (await res.json()) as { id: number; title: string };
      expect(data.id).toBeTypeOf("number");
      expect(data.id).toBeGreaterThan(0);

      testConversationId = data.id;
    },
    TIMEOUT
  );

  it(
    "POST /api/chat → stream jawaban LLM (content non-kosong)",
    async () => {
      expect(testConversationId).not.toBeNull();

      const res = await fetch(`${BASE_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: sessionCookie,
        },
        body: JSON.stringify({
          conversationId: testConversationId,
          message: "What is 2+2? Answer in one sentence.",
        }),
      });

      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("text/plain");

      // Baca seluruh stream
      const text = await res.text();
      expect(text.trim().length).toBeGreaterThan(0);
      console.log(`   → Streaming response: "${text.trim().slice(0, 80)}"`);
    },
    TIMEOUT
  );

  it(
    "GET /api/conversations/[id]/messages → pesan user + assistant tersimpan di DB (acceptance check utama)",
    async () => {
      expect(testConversationId).not.toBeNull();

      // Beri sedikit jeda untuk DB write setelah stream selesai
      await new Promise((r) => setTimeout(r, 500));

      const res = await fetch(
        `${BASE_URL}/api/conversations/${testConversationId}/messages`,
        {
          headers: { Cookie: sessionCookie },
        }
      );

      expect(res.status).toBe(200);
      const msgs = (await res.json()) as Array<{
        id: number;
        role: string;
        content: string;
      }>;

      // Harus ada minimal 2 pesan: user + assistant
      expect(msgs.length).toBeGreaterThanOrEqual(2);

      const userMsg = msgs.find((m) => m.role === "user");
      const assistantMsg = msgs.find((m) => m.role === "assistant");

      expect(userMsg).toBeDefined();
      expect(userMsg?.content).toContain("2+2");

      expect(assistantMsg).toBeDefined();
      expect(assistantMsg?.content.trim().length).toBeGreaterThan(0);

      console.log(`   → user: "${userMsg?.content}"`);
      console.log(`   → assistant: "${assistantMsg?.content.slice(0, 80)}"`);
    },
    TIMEOUT
  );

  it(
    "GET /api/conversations/[id]/messages dengan ID conversation lain → 404",
    async () => {
      const res = await fetch(`${BASE_URL}/api/conversations/999999/messages`, {
        headers: { Cookie: sessionCookie },
      });
      expect(res.status).toBe(404);
    },
    TIMEOUT
  );

  it(
    "POST /api/chat tanpa login → 401",
    async () => {
      const res = await fetch(`${BASE_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // tanpa Cookie → tidak ada session
        body: JSON.stringify({ conversationId: 1, message: "test" }),
      });
      expect(res.status).toBe(401);
    },
    TIMEOUT
  );
});
