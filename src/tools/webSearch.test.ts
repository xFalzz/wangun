/**
 * Acceptance Test Build #8 — Tool web_search (empiris, bukan mock)
 *
 * Verifikasi:
 *  1. webSearch() memanggil Tavily API secara langsung dan mengembalikan hasil valid
 *  2. Registry memformat hasil pencarian dengan baik
 *  3. Agent Loop (POST /api/agent/task) memanggil web_search minimal 1x sebelum final_answer
 *  4. Database mencatat tool_calls (tool_name="web_search", is_error=false)
 *
 * Timeout: 120s untuk agent loop end-to-end
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { webSearch } from "./webSearch";
import { getTool } from "./registry";
import { db } from "@/db/client";
import { users, plans, messages, agentTasks, toolCalls } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { hash } from "bcryptjs";

const BASE_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
const TIMEOUT = 120_000;
const SUFFIX = Date.now();

let sessionCookie = "";
let testUserId: number | null = null;
let testConversationId: number | null = null;

beforeAll(async () => {
  await db.insert(plans).values({ id: 1, name: "Free", quotaDaily: 50, price: "0" }).onConflictDoNothing();

  const passwordHash = await hash("WebSearchTest123!", 12);
  const inserted = await db
    .insert(users)
    .values({ name: "WebSearch Test", email: `websearch-${SUFFIX}@test.internal`, passwordHash, planId: 1 })
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
      email: `websearch-${SUFFIX}@test.internal`,
      password: "WebSearchTest123!",
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
    body: JSON.stringify({ title: "WebSearch Test Conversation" }),
  });
  const convData = (await convRes.json()) as { id: number };
  testConversationId = convData.id;
}, TIMEOUT);

afterAll(async () => {
  if (testUserId) {
    await db.delete(users).where(eq(users.id, testUserId));
  }
});

describe("Build #8 — web_search tool tests", () => {
  it(
    "Unit: webSearch() langsung menghubungi Tavily dan mengembalikan array SearchResult",
    async () => {
      const results = await webSearch({ query: "piala dunia 2022 juara", maxResults: 3 });

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty("title");
      expect(results[0]).toHaveProperty("url");
      expect(results[0]).toHaveProperty("snippet");
      expect(results[0]?.url).toMatch(/^https?:\/\//);
      expect(results[0]?.snippet.length).toBeGreaterThan(10);
    },
    30_000
  );

  it("Unit: getTool('web_search') mengembalikan format teks yang informatif untuk agent", async () => {
    const tool = getTool("web_search");
    expect(tool).not.toBeNull();

    const output = await tool!({ query: "indonesia ibukota nusantara" });
    expect(typeof output).toBe("string");
    expect(output).toContain("Hasil pencarian untuk");
    expect(output).toContain("URL:");
  });

  it(
    "Acceptance: Agent loop memanggil web_search minimal 1x sebelum final_answer",
    async () => {
      expect(testConversationId).not.toBeNull();

      const res = await fetch(`${BASE_URL}/api/agent/task`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: sessionCookie },
        body: JSON.stringify({
          conversationId: testConversationId,
          message: "Cari di internet dengan web_search: siapa juara Piala Dunia FIFA terakhir dan tahun berapa?",
        }),
      });

      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("text/event-stream");

      const reader = res.body?.getReader();
      expect(reader).toBeDefined();

      const decoder = new TextDecoder();
      const events: Array<{ type: string; [key: string]: unknown }> = [];
      let buffer = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith("data:")) {
              try {
                const parsed = JSON.parse(trimmed.replace(/^data:\s*/, ""));
                events.push(parsed);
              } catch {
                // partial JSON, abaikan
              }
            }
          }
        }
      }

      // Verifikasi event stream
      const eventTypes = events.map((e) => e.type);
      expect(eventTypes).toContain("thought");

      // Verifikasi tool web_search benar-benar dipanggil!
      const actionEvents = events.filter((e) => e.type === "action");
      const webSearchActions = actionEvents.filter((e) => e.tool === "web_search");
      expect(webSearchActions.length).toBeGreaterThanOrEqual(1);

      // Verifikasi observation diterima
      expect(eventTypes).toContain("observation");

      // Verifikasi loop selesai dengan final_answer / done
      expect(eventTypes).toContain("done");
      const doneEvent = events.find((e) => e.type === "done");
      expect(doneEvent).toBeDefined();
      expect(String(doneEvent?.answer).toLowerCase()).toMatch(/argentina/i);

      // Verifikasi database: tool_calls mencatat web_search tanpa error
      const convMessages = await db
        .select({ id: messages.id })
        .from(messages)
        .where(eq(messages.conversationId, testConversationId!));

      const messageIds = convMessages.map((m) => m.id);
      expect(messageIds.length).toBeGreaterThan(0);

      const tasks = await db
        .select()
        .from(agentTasks)
        .where(inArray(agentTasks.messageId, messageIds));

      expect(tasks.length).toBeGreaterThan(0);
      const taskRecord = tasks[tasks.length - 1];
      expect(taskRecord?.status).toBe("done");

      const recordedToolCalls = await db
        .select()
        .from(toolCalls)
        .where(eq(toolCalls.agentTaskId, taskRecord!.id));

      expect(recordedToolCalls.length).toBeGreaterThanOrEqual(1);
      const searchCall = recordedToolCalls.find((tc) => tc.toolName === "web_search");
      expect(searchCall).toBeDefined();
      expect(searchCall?.isError).toBe(false);
      expect(searchCall?.output).toContain("Hasil pencarian untuk");
    },
    TIMEOUT
  );
});
