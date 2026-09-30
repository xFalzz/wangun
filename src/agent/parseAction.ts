/**
 * Agent Action Parser (Build #7)
 *
 * Parsing dan validasi output JSON dari LLM dalam ReAct loop.
 *
 * Format yang diharapkan (sesuai Blueprint §7):
 *   { "thought": "...", "action": "web_search|final_answer", "action_input": {...} }
 *
 * Strategi error handling:
 *   1. Coba parse JSON langsung
 *   2. Kalau gagal, ekstrak JSON dari dalam markdown/teks (LLM kadang membungkus JSON)
 *   3. Kalau tetap gagal, kembalikan ParseResult dengan isValid=false
 *      → Loop akan retry sekali dengan prompt lebih tegas (buildRetryPrompt)
 *      → Kalau retry juga gagal → task ditandai "failed"
 */

import { z } from "zod";

// ============================================================
// TYPES
// ============================================================

/** Tool yang diizinkan di v1 (chat mode) */
export type AgentTool = "web_search" | "final_answer";

/** Action yang berhasil di-parse dari output LLM */
export interface AgentAction {
  thought: string;
  action: AgentTool;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  action_input: Record<string, any>;
}

/** Hasil parsing — selalu kembalikan objek ini, bukan throw */
export type ParseResult =
  | { isValid: true; action: AgentAction }
  | { isValid: false; rawOutput: string; reason: string };

// ============================================================
// ZOD SCHEMA — validasi struktur action
// ============================================================

const agentActionSchema = z.object({
  thought: z.string().min(1, "thought tidak boleh kosong"),
  action: z.enum(["web_search", "final_answer"], {
    errorMap: () => ({
      message: "action harus 'web_search' atau 'final_answer'",
    }),
  }),
  action_input: z.record(z.unknown()),
});

// ============================================================
// HELPER — ekstrak JSON dari dalam teks/markdown
// ============================================================

function extractJson(text: string): string | null {
  // Kasus 1: teks sudah JSON murni
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) return trimmed;

  // Kasus 2: JSON dibungkus markdown code block
  const fenced = trimmed.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (fenced?.[1]) return fenced[1];

  // Kasus 3: JSON ada di dalam teks biasa (ambil dari { pertama ke } terakhir)
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return null;
}

// ============================================================
// MAIN EXPORT — parseAgentAction
// ============================================================

/**
 * Parse output LLM menjadi AgentAction yang terstruktur.
 *
 * Tidak pernah throw — selalu kembalikan ParseResult.
 * Caller (loop.ts) yang bertanggung jawab retry / mark failed.
 */
export function parseAgentAction(rawOutput: string): ParseResult {
  const jsonStr = extractJson(rawOutput);

  if (!jsonStr) {
    return {
      isValid: false,
      rawOutput,
      reason: "Tidak ditemukan JSON dalam output. Output murni teks biasa.",
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    return {
      isValid: false,
      rawOutput,
      reason: `JSON tidak valid: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  const validated = agentActionSchema.safeParse(parsed);
  if (!validated.success) {
    const firstError = validated.error.errors[0]?.message ?? "Struktur tidak sesuai";
    return {
      isValid: false,
      rawOutput,
      reason: `Validasi schema gagal: ${firstError}`,
    };
  }

  return { isValid: true, action: validated.data as AgentAction };
}
