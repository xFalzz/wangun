/**
 * Model Router Config — Wangun v1
 *
 * Sumber kebenaran tunggal untuk semua provider dan model yang dipakai
 * router. Jangan hardcode nama model di adapter masing-masing.
 *
 * CARA UPDATE:
 *   1. Cek model aktif via endpoint /models provider (lihat komentar tiap section)
 *   2. Update array models[] di bawah
 *   3. Commit dengan pesan "chore(router): update model list — <provider>"
 *
 * Terakhir diverifikasi: 2026-09-26 via live API call ke masing-masing endpoint
 */

// ============================================================
// TYPES
// ============================================================

export type ProviderName = "gemini" | "groq" | "deepseek" | "openrouter";

export type Tier = 1 | 2;

export interface ModelConfig {
  /** ID model persis seperti diterima oleh API provider */
  id: string;
  /** Label human-readable untuk logging & admin UI */
  label: string;
  /** Context window dalam token */
  contextWindow: number;
  /** Cocok untuk task kompleks/reasoning? Dipakai router untuk routing cerdas */
  supportsReasoning?: boolean;
}

export interface ProviderConfig {
  name: ProviderName;
  /**
   * Tier 1 = Direct API (utamakan, paling murah/cepat, quota terpisah).
   * Tier 2 = Fallback terakhir (OpenRouter) — hanya dipakai kalau semua Tier 1 gagal.
   */
  tier: Tier;
  /** Env var yang menyimpan API key. Dibaca saat runtime, bukan di-embed di sini. */
  apiKeyEnv: string;
  /** Base URL endpoint API */
  baseUrl: string;
  /**
   * Urutan prioritas model dalam provider ini.
   * Router mencoba models[0] dulu, turun ke models[1] dst. kalau:
   *   - HTTP 429 (rate limit / quota habis)
   *   - HTTP 503 (server overloaded)
   *   - HTTP 404 (model deprecated)
   */
  models: ModelConfig[];
}

export interface RouterConfig {
  /**
   * Daftar provider diurutkan berdasarkan tier (ascending) dan prioritas.
   * Router iterasi list ini dari atas ke bawah.
   */
  providers: ProviderConfig[];
}

// ============================================================
// CONFIG
// ============================================================

export const routerConfig: RouterConfig = {
  providers: [

    // ——————————————————————————————————————
    // TIER 1-A: Gemini (Google)
    // Cek model aktif: GET https://generativelanguage.googleapis.com/v1beta/models?key={key}
    // Diverifikasi 2026-09-26.
    //
    // PRIMARY: gemini-3.8-flash (pinned eksplisit ke versi tertentu — lebih aman untuk
    // sistem agentic yang butuh perilaku konsisten).
    // FALLBACK-1: gemini-flash-latest (rolling alias — Google bisa ganti model di baliknya
    // kapan saja tanpa pemberitahuan, dipakai hanya kalau versi pinned bermasalah).
    // ——————————————————————————————————————
    {
      name: "gemini",
      tier: 1,
      apiKeyEnv: "GEMINI_API_KEY",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta",
      models: [
        {
          id: "gemini-3.8-flash",
          label: "Gemini 3.8 Flash",
          contextWindow: 1_048_576,
          supportsReasoning: false,
        },
        {
          id: "gemini-3.6-flash",
          label: "Gemini 3.6 Flash",
          contextWindow: 1_048_576,
          supportsReasoning: false,
        },
        {
          id: "gemini-3.1-flash-lite",
          label: "Gemini 3.1 Flash Lite",
          contextWindow: 1_048_576,
          supportsReasoning: false,
        },
        {
          // Rolling alias — dipakai terakhir sebagai safety net kalau semua
          // versi pinned di atas deprecated sekaligus
          id: "gemini-flash-latest",
          label: "Gemini Flash (Latest alias)",
          contextWindow: 1_048_576,
          supportsReasoning: false,
        },
      ],
    },

    // ——————————————————————————————————————
    // TIER 1-B: Groq
    // Cek model aktif: GET https://api.groq.com/openai/v1/models (Authorization: Bearer {key})
    // Diverifikasi 2026-09-26 — model yang diminta (llama-4-maverick, kimi-k2)
    // TIDAK tersedia di key ini. Yang aktif dan tersedia:
    //   - qwen/qwen3.8-27b    (131k ctx, reasoning+)
    //   - openai/gpt-oss-120b (131k ctx, general)
    //   - openai/gpt-oss-20b  (131k ctx, fast/cheap)
    // Format: pakai OpenAI-compatible endpoint
    // ——————————————————————————————————————
    {
      name: "groq",
      tier: 1,
      apiKeyEnv: "GROQ_API_KEY",
      baseUrl: "https://api.groq.com/openai/v1",
      models: [
        {
          id: "qwen/qwen3.8-27b",
          label: "Qwen 3.8 27B (Groq)",
          contextWindow: 131_072,
          supportsReasoning: true,
        },
        {
          id: "openai/gpt-oss-120b",
          label: "GPT OSS 120B (Groq)",
          contextWindow: 131_072,
          supportsReasoning: false,
        },
        {
          id: "openai/gpt-oss-20b",
          label: "GPT OSS 20B (Groq)",
          contextWindow: 131_072,
          supportsReasoning: false,
        },
      ],
    },

    // ——————————————————————————————————————
    // TIER 1-C: DeepSeek
    // Cek model aktif: GET https://api.deepseek.com/models (Authorization: Bearer {key})
    // Diverifikasi 2026-09-26 via /models endpoint — 2 model terdaftar:
    //   - deepseek-flash   (nama aktual, bukan "deepseek-chat" yang retired 24 Juli 2026)
    //   - deepseek-v4-pro
    //
    // STATUS SALDO: HTTP 402 per 2026-09-29 — saldo habis, provider tidak aktif.
    // Isi saldo di platform.deepseek.com sebelum provider ini bisa dipakai.
    //
    // CATATAN deepseek-v4-pro (per info 14 September 2026):
    //   DeepSeek sedang me-retire V4 Pro bertahap. Semua request ke deepseek-v4-pro
    //   kemungkinan besar di-reroute ke model yang sama dengan deepseek-flash (V4.1-Flash),
    //   ditagih harga Flash. Test empiris TIDAK bisa diverifikasi saat ini karena saldo habis.
    //   Konsekuensi: deepseek-v4-pro saat ini BUKAN tier reasoning terpisah yang lebih kuat
    //   — hanya fallback endpoint redundan. Pertahankan di config supaya kalau DeepSeek nanti
    //   merilis V4.1-Pro dan memetakan nama ini ke model yang benar-benar lebih kuat,
    //   kita tidak perlu ubah kode adapter.
    // Format: OpenAI-compatible
    // ——————————————————————————————————————
    {
      name: "deepseek",
      tier: 1,
      apiKeyEnv: "DEEPSEEK_API_KEY",
      baseUrl: "https://api.deepseek.com",
      models: [
        {
          id: "deepseek-flash",
          label: "DeepSeek Flash",
          contextWindow: 65_536,
          supportsReasoning: false,
        },
        {
          // Kemungkinan alias/redirect ke deepseek-flash saat ini (per 14 Sept 2026).
          // Dijaga untuk forward-compat ketika V4.1-Pro rilis dan nama ini dipetakan ulang.
          id: "deepseek-v4-pro",
          label: "DeepSeek V4 Pro (saat ini: alias flash)",
          contextWindow: 65_536,
          supportsReasoning: false, // set true lagi kalau V4.1-Pro sudah live
        },
      ],
    },

    // ——————————————————————————————————————
    // TIER 2: OpenRouter — FALLBACK TERAKHIR
    // Dipakai HANYA kalau semua provider Tier 1 gagal sekaligus.
    // Cek model :free aktif: GET https://openrouter.ai/api/v1/models
    // Diverifikasi 2026-09-26 — 17 model :free, dipilih yang punya ctx besar
    // dan tidak overlap dengan provider Tier 1 (tidak ada Gemini/DeepSeek di sini).
    //
    // ATURAN: jangan tambahkan model Gemini/DeepSeek di sini
    // meski ada varian :free-nya — supaya tidak ada 2 jalur ke provider yang sama.
    // ——————————————————————————————————————
    {
      name: "openrouter",
      tier: 2,
      apiKeyEnv: "OPENROUTER_API_KEY",
      baseUrl: "https://openrouter.ai/api/v1",
      models: [
        // Prioritas :free dulu (price=0), urutkan: ctx terbesar & model terkuat
        {
          id: "nvidia/nemotron-3-ultra-550b-a55b:free",
          label: "Nemotron 3 Ultra 550B (OR Free)",
          contextWindow: 1_000_000,
          supportsReasoning: true,
        },
        {
          id: "thinkingmachines/inkling:free",
          label: "Inkling (OR Free)",
          contextWindow: 1_049_000,
          supportsReasoning: true,
        },
        {
          id: "qwen/qwen3.8-27b:free",
          label: "Qwen 3.8 27B (OR Free)",
          contextWindow: 262_144,
          supportsReasoning: true,
        },
        {
          id: "nvidia/nemotron-3-super-120b-a12b:free",
          label: "Nemotron 3 Super 120B (OR Free)",
          contextWindow: 262_144,
          supportsReasoning: false,
        },
        {
          id: "nvidia/nemotron-3.5-lightning:free",
          label: "Nemotron 3.5 Lightning (OR Free)",
          contextWindow: 1_000_000,
          supportsReasoning: false,
        },
      ],
    },
  ],
};

// ============================================================
// HELPERS — dipakai oleh router/index.ts
// ============================================================

/** Semua provider Tier 1, urutan prioritas */
export const tier1Providers = routerConfig.providers.filter(p => p.tier === 1);

/** Semua provider Tier 2 (OpenRouter), urutan prioritas */
export const tier2Providers = routerConfig.providers.filter(p => p.tier === 2);

/** Cari provider config berdasarkan nama */
export function getProviderConfig(name: ProviderName): ProviderConfig | undefined {
  return routerConfig.providers.find(p => p.name === name);
}

/**
 * Error code yang diklasifikasikan sebagai "dapat di-fallback"
 * (router boleh coba provider/model berikutnya).
 * Error di luar list ini (401, 400) dilempar langsung ke caller.
 */
export const FALLBACK_HTTP_CODES = new Set([
  429, // rate limit / quota habis
  503, // server overloaded
  502, // bad gateway (jaringan)
  404, // model deprecated / tidak tersedia
  500, // server error sementara
]);
