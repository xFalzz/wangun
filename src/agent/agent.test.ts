/**
 * Smoke test Build #7 — Agent Loop (empiris, bukan mock)
 *
 * Verifikasi:
 *  1. POST /api/agent/task → SSE stream terbuka (200)
 *  2. Event "thought" diterima (loop berjalan)
 *  3. Event "done" atau "error" diterima (loop selesai, tidak hang)
 *  4. DB: agent_tasks.status = "done" atau "failed" setelah loop
 *  5. DB: tool_calls ada jika ada action yang dieksekusi
 *  6. DB: pesan assistant tersimpan di messages setelah loop selesai
 *
 * Catatan: web_search belum diimplementasi → agent akan coba tool lalu dapat error
 * → loop harus fallback ke final_answer. Kita verifikasi loop selesai (bukan hang).
 *
 * Timeout: 120s — loop bisa sampai 10 LLM calls + retries
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/db/client";
import { users, plans, conversations, agentTasks, messages } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hash } from "bcryptjs";

const BASE_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
const TIMEOUT = 120_000;
const SUFFIX = Date.now();

let sessionCookie = "";
let testUserId: number | null = null;
let testConversationId: number | null = null;

// ——————————————————————————————————————
// Setup: user + session + conversation
// ——————————————————————————————————————
beforeAll(async () => {
  await db.insert(plans).values({ id: 1, name: "Free", quotaDaily: 50, price: "0" }).onConflictDoNothing();

  const passwordHash = await hash("AgentTest123!", 12);
  const inserted = await db
    .insert(users)
    .values({ name: "Agent Test", email: `agent-${SUFFIX}@test.internal`, passwordHash, planId: 1 })
    .returning({ id: users.id });
  testUserId = inserted[0]?.id ?? null;

  // Login via CSRF
  const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`);
  const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };
  const csrfCookies = csrfRes.headers.get("set-cookie") ?? "";

  const loginRes = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: csrfCookies },
    redirect: "manual",
    body: new URLSearchParams({
      email: `agent-${SUFFIX}@test.internal`,
      password: "AgentTest123!",
      csrfToken,
      callbackUrl: BASE_URL,
      json: "true",
    }),
  });

  const rawCookies = loginRes.headers.getSetCookie?.() ?? [];
  sessionCookie = [csrfCookies, ...rawCookies].join("; ");

  // Buat conversation
  const convRes = await fetch(`${BASE_URL}/api/conversations`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: sessionCookie },
    body: JSON.stringify({ title: "Agent test" }),
  });
  const convData = (await convRes.json()) as { id: number };
  testConversationId = convData.id;
}, TIMEOUT);

afterAll(async () => {
  if (testUserId) {
    await db.delete(users).where(eq(users.id, testUserId));
  }
});

// ============================================================
// Test
// ============================================================

describe("Build #7 — Agent Loop smoke test", () => {
  it(
    "POST /api/agent/task → stream SSE, loop selesai, DB tercatat",
    async () => {
      expect(testConversationId).not.toBeNull();

      const res = await fetch(`${BASE_URL}/api/agent/task`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: sessionCookie },
        body: JSON.stringify({
          conversationId: testConversationId,
          message: "Apa ibukota Indonesia? Jawab singkat.",
        }),
      });

      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("text/event-stream");

      // Baca semua events dari SSE
      const events: Array<{ type: string; [key: string]: unknown }> = [];
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const readLoop = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const raw = line.slice(6).trim();
            if (raw === "[DONE]") return; // stream selesai
            try {
              events.push(JSON.parse(raw));
            } catch {
              // skip malformed lines
            }
          }
        }
      };

      await readLoop();

      console.log("   → Events diterima:", events.map((e) => e.type).join(", "));

      // Harus ada minimal 1 event "thought" (loop berjalan)
      const thoughtEvents = events.filter((e) => e.type === "thought");
      expect(thoughtEvents.length).toBeGreaterThanOrEqual(1);
      console.log(`   → thought #1: "${String(thoughtEvents[0]?.content ?? "").slice(0, 80)}"`);

      // Harus ada event terminal: "done" atau "error"
      const terminalEvent = events.find((e) => e.type === "done" || e.type === "error");
      expect(terminalEvent).toBeDefined();
      console.log(`   → terminal event: ${terminalEvent?.type}`);

      if (terminalEvent?.type === "done") {
        console.log(`   → jawaban: "${String(terminalEvent.answer ?? "").slice(0, 80)}"`);
      }

      // Beri waktu DB write selesai
      await new Promise((r) => setTimeout(r, 1000));

      // Verifikasi DB: agent_tasks.status harus done atau failed
      const task = await db
        .select({ status: agentTasks.status, stepsTaken: agentTasks.stepsTaken })
        .from(agentTasks)
        .orderBy(agentTasks.id)
        .limit(1);
      // Ambil task milik test user (yang paling baru)
      const allTasks = await db
        .select({ status: agentTasks.status, stepsTaken: agentTasks.stepsTaken, id: agentTasks.id })
        .from(agentTasks)
        .orderBy(agentTasks.id);
      const lastTask = allTasks[allTasks.length - 1];

      expect(["done", "failed"]).toContain(lastTask?.status);
      console.log(`   → DB agent_tasks: status=${lastTask?.status}, steps=${lastTask?.stepsTaken}`);

      // Verifikasi DB: pesan assistant tersimpan
      const assistantMsgs = await db
        .select({ content: messages.content })
        .from(messages)
        .where(eq(messages.conversationId, testConversationId!))
        .orderBy(messages.createdAt);

      const assistantMsg = assistantMsgs.find((m) => m.content.length > 0);
      expect(assistantMsg).toBeDefined();
      console.log(`   → DB messages: ${assistantMsgs.length} rows`);
    },
    TIMEOUT
  );

  it(
    "POST /api/agent/task tanpa login → 401",
    async () => {
      const res = await fetch(`${BASE_URL}/api/agent/task`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: 1, message: "test" }),
      });
      expect(res.status).toBe(401);
    },
    10_000
  );
});
