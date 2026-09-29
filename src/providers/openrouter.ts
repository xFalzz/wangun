/**
 * Adapter: OpenRouter
 *
 * Dokumentasi: https://openrouter.ai/docs
 * Format: OpenAI-compatible
 * Diverifikasi model :free aktif 2026-09-26 via GET /api/v1/models
 *
 * Header wajib OpenRouter (selain Authorization):
 *  - HTTP-Referer: URL aplikasi (dipakai untuk analytics & rate limit per-site)
 *  - X-Title: nama aplikasi (ditampilkan di dashboard OpenRouter)
 *
 * Catatan: OpenRouter adalah Tier 2 — hanya dipakai kalau semua Tier 1 gagal.
 * Prioritaskan model :free dulu (sudah diurutkan di models.config.ts).
 */

import {
  type ChatMessage,
  type GenerateResult,
  type ModelProviderAdapter,
  classifyHttpError,
} from "./types";
import { parseOAIStream } from "./groq"; // reuse helper yang sama

export class OpenRouterAdapter implements ModelProviderAdapter {
  readonly name = "openrouter";
  readonly modelId: string;

  private readonly apiKey: string;
  private readonly baseUrl = "https://openrouter.ai/api/v1";

  constructor(modelId: string) {
    const key = process.env.OPENROUTER_API_KEY;
    if (!key) throw new Error("OPENROUTER_API_KEY tidak diset di environment");
    this.modelId = modelId;
    this.apiKey = key;
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      // Wajib oleh OpenRouter — dipakai untuk analytics per-site
      "HTTP-Referer": process.env.NEXTAUTH_URL ?? "http://localhost:3000",
      "X-Title": "Wangun AI Platform",
    };
  }

  async generate(params: {
    messages: ChatMessage[];
    maxTokens?: number;
  }): Promise<GenerateResult> {
    const body: Record<string, unknown> = {
      model: this.modelId,
      messages: params.messages,
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

    const data = await res.json() as {
      choices: Array<{ message: { content: string | null } }>;
      usage?: { total_tokens?: number; prompt_tokens?: number; completion_tokens?: number };
    };

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

    if (!res.body) throw new Error("Response body kosong dari OpenRouter stream");
    yield* parseOAIStream(res.body);
  }
}
