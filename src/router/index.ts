/**
 * Model Router — src/router/index.ts
 *
 * Entry point untuk semua panggilan LLM di Wangun.
 * Dipanggil oleh Chat Engine (Build #5) dan Agent Orchestrator (Build #6).
 *
 * Logika (mengikuti Blueprint §6):
 * 1. Ambil provider aktif via rules.ts (query DB + lookup config)
 * 2. Untuk setiap provider, coba model-model secara berurutan (models[0] → models[n])
 * 3. Kalau model gagal (ProviderFallbackError, isProviderDead=false) → coba model berikutnya
 * 4. Kalau provider mati (isProviderDead=true, misal 402/401) → skip seluruh provider
 * 5. Kalau semua model di provider habis → lanjut ke provider berikutnya
 * 6. Kalau SEMUA provider+model gagal → throw error jelas
 * 7. Setiap percobaan (sukses maupun gagal) dicatat ke tabel usage_logs
 *
 * STREAMING:
 *   routeRequestStream() menyediakan jalur streaming (AsyncGenerator<string>).
 *   Logika fallback sama persis — stream dicoba, kalau gagal sebelum yield pertama
 *   maka fallback ke model/provider berikutnya.
 */

import { db } from "@/db/client";
import { usageLogs, modelProviders } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { ChatMessage, GenerateResult } from "@/providers/types";
import { ProviderFallbackError, ProviderFatalError } from "@/providers/types";
import { getActiveProvidersSortedByPriority } from "./rules";
import {
  type ProviderConfig,
  type ProviderName,
  DEFAULT_TOKEN_BUDGETS,
} from "./models.config";

// Lazy import adapters — menghindari circular dependency
import { GeminiAdapter } from "@/providers/gemini";
import { GroqAdapter } from "@/providers/groq";
import { DeepSeekAdapter } from "@/providers/deepseek";
import { OpenRouterAdapter } from "@/providers/openrouter";

import type { ModelProviderAdapter } from "@/providers/types";

// ============================================================
// TYPES
// ============================================================

export interface RouteRequestOptions {
  /** Kompleksitas task — v1 diabaikan, v2+ untuk routing cerdas */
  complexity?: "ringan" | "berat";
  /** Sumber request — untuk isolasi kuota internal vs eksternal */
  source?: "internal_chat" | "api_external";
  /** ID sumber (userId, apiKeyId, dsb.) — untuk audit trail */
  sourceId: string;
  /** Override max_tokens — jika tidak diisi, pakai DEFAULT_TOKEN_BUDGETS */
  maxTokens?: number;
}

export interface RouteResult extends GenerateResult {
  /** Provider yang berhasil menjawab */
  providerName: ProviderName;
  /** Model yang berhasil menjawab */
  modelId: string;
}

// ============================================================
// ADAPTER FACTORY
// ============================================================

/**
 * Buat instance adapter berdasarkan nama provider dan model ID.
 * Ini satu-satunya tempat mapping provider-name → adapter class.
 */
function createAdapter(
  providerName: ProviderName,
  modelId: string
): ModelProviderAdapter {
  switch (providerName) {
    case "gemini":
      return new GeminiAdapter(modelId);
    case "groq":
      return new GroqAdapter(modelId);
    case "deepseek":
      return new DeepSeekAdapter(modelId);
    case "openrouter":
      return new OpenRouterAdapter(modelId);
    default:
      throw new Error(`Provider "${providerName}" tidak punya adapter`);
  }
}

// ============================================================
// USAGE LOGGING
// ============================================================

/**
 * Cari model_provider ID dari DB berdasarkan nama provider.
 * Di-cache per-request — model_providers jarang berubah.
 */
const providerIdCache = new Map<string, number>();

async function getModelProviderId(providerName: string): Promise<number | null> {
  if (providerIdCache.has(providerName)) {
    return providerIdCache.get(providerName)!;
  }

  // Cari semua provider, map nama ke ID
  const rows = await db
    .select({ id: modelProviders.id, name: modelProviders.name })
    .from(modelProviders);

  for (const row of rows) {
    const normalized = row.name.toLowerCase().trim();
    if (normalized === providerName || normalized.includes(providerName)) {
      providerIdCache.set(providerName, row.id);
      return row.id;
    }
  }

  return null;
}

/**
 * Catat penggunaan ke tabel usage_logs.
 * Dipanggil untuk SETIAP percobaan — baik sukses maupun gagal.
 *
 * Jika gagal menulis log, error di-swallow (tidak boleh menghentikan
 * fallback flow — logging adalah best-effort).
 */
async function logUsage(params: {
  providerName: string;
  tokensUsed: number;
  source: string;
  sourceId: string;
  isError: boolean;
}): Promise<void> {
  try {
    const modelProviderId = await getModelProviderId(params.providerName);
    if (!modelProviderId) {
      console.warn(
        `[router] Tidak bisa log usage: provider "${params.providerName}" tidak ditemukan di DB`
      );
      return;
    }

    // sourceId diharapkan berisi userId (sebagai string).
    // Untuk v1, semua request datang dari internal_chat → sourceId = userId.
    const userId = parseInt(params.sourceId, 10);
    if (isNaN(userId)) {
      console.warn(
        `[router] sourceId "${params.sourceId}" bukan angka valid — skip log usage`
      );
      return;
    }

    await db.insert(usageLogs).values({
      userId,
      modelProviderId,
      source: params.source,
      tokensInput: 0, // v1: belum bisa split input/output tokens dari semua provider
      tokensOutput: params.tokensUsed,
      cost: "0", // v1: semua provider gratis / biaya belum dihitung detail
    });
  } catch (err) {
    // Best-effort — jangan crash router karena gagal logging
    console.error("[router] Gagal menulis usage_logs:", err);
  }
}

// ============================================================
// NON-STREAMING ROUTE
// ============================================================

/**
 * Kirim request ke LLM dengan fallback otomatis antar provider+model.
 *
 * Ini fungsi utama yang dipanggil oleh Chat Engine dan Agent Orchestrator.
 * Caller tidak perlu tahu provider mana yang menjawab.
 */
export async function routeRequest(
  messages: ChatMessage[],
  opts: RouteRequestOptions
): Promise<RouteResult> {
  const {
    complexity = "ringan",
    source = "internal_chat",
    sourceId,
    maxTokens,
  } = opts;

  // Tentukan token budget default berdasarkan complexity
  const effectiveMaxTokens =
    maxTokens ??
    (complexity === "berat"
      ? DEFAULT_TOKEN_BUDGETS.agentPlanning
      : DEFAULT_TOKEN_BUDGETS.chat);

  const providers = await getActiveProvidersSortedByPriority(complexity);

  if (providers.length === 0) {
    throw new Error(
      "Tidak ada provider aktif di database. Jalankan seed (npm run db:seed) atau aktifkan provider di tabel model_providers."
    );
  }

  // Kumpulkan semua error untuk pesan diagnostik
  const errors: Array<{ provider: string; model: string; error: string }> = [];

  for (const provider of providers) {
    // Cek apakah API key tersedia — skip provider tanpa key (bukan error, cuma belum diset)
    const apiKey = process.env[provider.apiKeyEnv];
    if (!apiKey) {
      errors.push({
        provider: provider.name,
        model: "*",
        error: `Env var ${provider.apiKeyEnv} tidak diset`,
      });
      continue;
    }

    for (const model of provider.models) {
      try {
        const adapter = createAdapter(provider.name, model.id);
        const result = await adapter.generate({
          messages,
          maxTokens: effectiveMaxTokens,
        });

        // Sukses — log dan return
        await logUsage({
          providerName: provider.name,
          tokensUsed: result.tokensUsed,
          source,
          sourceId,
          isError: false,
        });

        return {
          ...result,
          providerName: provider.name,
          modelId: model.id,
        };
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : String(err);

        // Log percobaan gagal ke usage_logs (token=0)
        await logUsage({
          providerName: provider.name,
          tokensUsed: 0,
          source,
          sourceId,
          isError: true,
        });

        errors.push({
          provider: provider.name,
          model: model.id,
          error: errorMsg,
        });

        if (err instanceof ProviderFallbackError) {
          if (err.isProviderDead) {
            // Provider mati total (402/401) — skip seluruh provider
            break;
          }
          // Model bermasalah (429/503/404/403) — coba model berikutnya
          continue;
        }

        if (err instanceof ProviderFatalError) {
          // Bug di kode kita (400) — lempar langsung, jangan fallback
          throw err;
        }

        // Error tak terduga — coba model berikutnya (defensive)
        continue;
      }
    }
  }

  // Semua provider+model gagal
  const diagnostic = errors
    .map((e) => `  [${e.provider}/${e.model}] ${e.error}`)
    .join("\n");

  throw new Error(
    `Semua provider gagal/kuota habis. Detail percobaan:\n${diagnostic}`
  );
}

// ============================================================
// STREAMING ROUTE
// ============================================================

/**
 * Streaming route — sama seperti routeRequest tapi menghasilkan AsyncGenerator<string>.
 *
 * Fallback hanya terjadi kalau error terjadi SEBELUM stream mulai yield.
 * Kalau stream sudah mulai yield lalu putus di tengah jalan, error dilempar ke caller
 * (tidak di-fallback, karena partial response sudah terkirim).
 */
export async function* routeRequestStream(
  messages: ChatMessage[],
  opts: RouteRequestOptions
): AsyncGenerator<string, RouteResult> {
  const {
    complexity = "ringan",
    source = "internal_chat",
    sourceId,
    maxTokens,
  } = opts;

  const effectiveMaxTokens =
    maxTokens ??
    (complexity === "berat"
      ? DEFAULT_TOKEN_BUDGETS.agentPlanning
      : DEFAULT_TOKEN_BUDGETS.chat);

  const providers = await getActiveProvidersSortedByPriority(complexity);

  if (providers.length === 0) {
    throw new Error(
      "Tidak ada provider aktif di database. Jalankan seed (npm run db:seed) atau aktifkan provider di tabel model_providers."
    );
  }

  const errors: Array<{ provider: string; model: string; error: string }> = [];

  for (const provider of providers) {
    const apiKey = process.env[provider.apiKeyEnv];
    if (!apiKey) {
      errors.push({
        provider: provider.name,
        model: "*",
        error: `Env var ${provider.apiKeyEnv} tidak diset`,
      });
      continue;
    }

    for (const model of provider.models) {
      try {
        const adapter = createAdapter(provider.name, model.id);
        const stream = adapter.stream({
          messages,
          maxTokens: effectiveMaxTokens,
        });

        // Coba ambil chunk pertama — kalau gagal di sini, masih bisa fallback
        const first = await stream.next();
        if (first.done) {
          // Stream kosong — coba model berikutnya
          errors.push({
            provider: provider.name,
            model: model.id,
            error: "Stream kosong (0 chunks)",
          });
          continue;
        }

        // Stream berhasil dimulai — yield chunk pertama, lalu sisanya
        yield first.value;

        let totalChunks = 1;
        for await (const chunk of stream) {
          yield chunk;
          totalChunks++;
        }

        // Stream selesai — log usage (estimasi token dari jumlah chunk)
        await logUsage({
          providerName: provider.name,
          tokensUsed: totalChunks, // estimasi kasar: 1 chunk ≈ 1 token
          source,
          sourceId,
          isError: false,
        });

        // Return metadata tentang provider yang berhasil
        return {
          content: "", // content sudah di-yield, ini hanya metadata
          tokensUsed: totalChunks,
          providerName: provider.name,
          modelId: model.id,
        };
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : String(err);

        await logUsage({
          providerName: provider.name,
          tokensUsed: 0,
          source,
          sourceId,
          isError: true,
        });

        errors.push({
          provider: provider.name,
          model: model.id,
          error: errorMsg,
        });

        if (err instanceof ProviderFallbackError) {
          if (err.isProviderDead) {
            break;
          }
          continue;
        }

        if (err instanceof ProviderFatalError) {
          throw err;
        }

        continue;
      }
    }
  }

  const diagnostic = errors
    .map((e) => `  [${e.provider}/${e.model}] ${e.error}`)
    .join("\n");

  throw new Error(
    `Semua provider gagal/kuota habis (stream). Detail percobaan:\n${diagnostic}`
  );
}
