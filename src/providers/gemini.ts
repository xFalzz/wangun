/**
 * Adapter: Gemini (Google)
 *
 * Dokumentasi: https://ai.google.dev/api/generate-content
 * Diverifikasi live 2026-09-26.
 *
 * Hal-hal penting yang berbeda dari OpenAI-compatible:
 *  - Auth: header x-goog-api-key (atau query param ?key=)
 *  - Format request: { system_instruction, contents[] } — bukan { messages[] }
 *  - Role: "user" | "model" (bukan "assistant")
 *  - system prompt → system_instruction.parts[0].text (top-level, bukan di contents)
 *  - Streaming: endpoint berbeda (:streamGenerateContent?alt=sse), SSE format
 *  - Token count: usageMetadata.totalTokenCount
 */

import {
  type ChatMessage,
  type GenerateResult,
  type ModelProviderAdapter,
  classifyHttpError,
} from "./types";

// Format internal Gemini API
interface GeminiContent {
  role: "user" | "model";
  parts: Array<{ text: string }>;
}

interface GeminiRequest {
  system_instruction?: { parts: Array<{ text: string }> };
  contents: GeminiContent[];
  generationConfig?: { maxOutputTokens?: number };
}

interface GeminiResponse {
  candidates: Array<{
    content: { parts: Array<{ text: string }> };
  }>;
  usageMetadata?: {
    totalTokenCount?: number;
    promptTokenCount?: number;
    candidatesTokenCount?: number;
  };
}

// ============================================================
// Helper: konversi ChatMessage[] ke format Gemini
// ============================================================
function toGeminiPayload(
  messages: ChatMessage[],
  maxTokens?: number
): GeminiRequest {
  // Pisahkan system messages dari conversation messages
  const systemParts = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");

  // Konversi user/assistant ke format Gemini
  // Pastikan tidak ada pesan system masuk ke contents[]
  const contents: GeminiContent[] = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  // Gemini butuh contents[] tidak kosong — kalau semua pesan adalah system,
  // tambahkan placeholder (edge case yang tidak seharusnya terjadi di production)
  if (contents.length === 0) {
    contents.push({ role: "user", parts: [{ text: "." }] });
  }

  const payload: GeminiRequest = { contents };

  // system_instruction: snake_case (format resmi, terkonfirmasi live 2026-09-26)
  if (systemParts) {
    payload.system_instruction = { parts: [{ text: systemParts }] };
  }

  if (maxTokens) {
    payload.generationConfig = { maxOutputTokens: maxTokens };
  }

  return payload;
}

// ============================================================
// Adapter class
// ============================================================
export class GeminiAdapter implements ModelProviderAdapter {
  readonly name = "gemini";
  readonly modelId: string;

  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(modelId: string) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY tidak diset di environment");

    this.modelId = modelId;
    this.apiKey = key;
    this.baseUrl = "https://generativelanguage.googleapis.com/v1beta";
  }

  async generate(params: {
    messages: ChatMessage[];
    maxTokens?: number;
  }): Promise<GenerateResult> {
    const url = `${this.baseUrl}/models/${this.modelId}:generateContent?key=${this.apiKey}`;
    const payload = toGeminiPayload(params.messages, params.maxTokens);

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.text();
      classifyHttpError(res.status, body, this.name, this.modelId);
    }

    const data = (await res.json()) as GeminiResponse;
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const tokensUsed =
      data.usageMetadata?.totalTokenCount ??
      (data.usageMetadata?.promptTokenCount ?? 0) +
        (data.usageMetadata?.candidatesTokenCount ?? 0);

    return { content, tokensUsed };
  }

  async *stream(params: {
    messages: ChatMessage[];
    maxTokens?: number;
  }): AsyncGenerator<string> {
    // Streaming endpoint Gemini: streamGenerateContent?alt=sse
    // Terkonfirmasi via dokumentasi resmi 2026-09-26
    const url = `${this.baseUrl}/models/${this.modelId}:streamGenerateContent?alt=sse&key=${this.apiKey}`;
    const payload = toGeminiPayload(params.messages, params.maxTokens);

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.text();
      classifyHttpError(res.status, body, this.name, this.modelId);
    }

    if (!res.body) throw new Error("Response body kosong dari Gemini stream");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? ""; // simpan baris terakhir yang mungkin belum selesai

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr || jsonStr === "[DONE]") continue;

          try {
            const chunk = JSON.parse(jsonStr) as GeminiResponse;
            const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) yield text;
          } catch {
            // Abaikan chunk JSON yang tidak valid (partial chunk)
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
