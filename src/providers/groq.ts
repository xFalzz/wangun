/**
 * Adapter: Groq
 *
 * Dokumentasi: https://console.groq.com/docs/openai
 * Format: OpenAI-compatible (chat/completions endpoint)
 * Diverifikasi model aktif 2026-09-26 via GET /openai/v1/models
 *
 * Rate limit Groq berbasis RPM dan TPM per model — HTTP 429 adalah transient.
 */

import {
  type ChatMessage,
  type GenerateResult,
  type ModelProviderAdapter,
  classifyHttpError,
} from "./types";

// OpenAI-compatible response shapes
interface OAIResponse {
  choices: Array<{
    message?: { content: string | null };
    delta?: { content?: string | null };
    finish_reason?: string | null;
  }>;
  usage?: {
    total_tokens?: number;
    prompt_tokens?: number;
    completion_tokens?: number;
  };
}

export class GroqAdapter implements ModelProviderAdapter {
  readonly name = "groq";
  readonly modelId: string;

  private readonly apiKey: string;
  private readonly baseUrl = "https://api.groq.com/openai/v1";

  constructor(modelId: string) {
    const key = process.env.GROQ_API_KEY;
    if (!key) throw new Error("GROQ_API_KEY tidak diset di environment");
    this.modelId = modelId;
    this.apiKey = key;
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };
  }

  async generate(params: {
    messages: ChatMessage[];
    maxTokens?: number;
  }): Promise<GenerateResult> {
    const body: Record<string, unknown> = {
      model: this.modelId,
      messages: params.messages, // format sudah cocok — role: user/assistant/system
    };
    if (params.maxTokens) body.max_tokens = params.maxTokens;

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errBody = await res.text();
      classifyHttpError(res.status, errBody, this.name, this.modelId);
    }

    const data = (await res.json()) as OAIResponse;
    const content = data.choices?.[0]?.message?.content ?? "";
    const tokensUsed =
      data.usage?.total_tokens ??
      (data.usage?.prompt_tokens ?? 0) + (data.usage?.completion_tokens ?? 0);

    return { content, tokensUsed };
  }

  async *stream(params: {
    messages: ChatMessage[];
    maxTokens?: number;
  }): AsyncGenerator<string> {
    const body: Record<string, unknown> = {
      model: this.modelId,
      messages: params.messages,
      stream: true,
    };
    if (params.maxTokens) body.max_tokens = params.maxTokens;

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errBody = await res.text();
      classifyHttpError(res.status, errBody, this.name, this.modelId);
    }

    if (!res.body) throw new Error("Response body kosong dari Groq stream");
    yield* parseOAIStream(res.body);
  }
}

// ============================================================
// Helper: parse OpenAI SSE stream (dipakai juga oleh DeepSeek & OpenRouter)
// ============================================================
export async function* parseOAIStream(
  body: ReadableStream<Uint8Array>
): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const jsonStr = line.slice(6).trim();
        if (!jsonStr || jsonStr === "[DONE]") continue;

        try {
          const chunk = JSON.parse(jsonStr) as OAIResponse;
          const text = chunk.choices?.[0]?.delta?.content;
          if (text) yield text;
        } catch {
          // Abaikan partial chunk
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
