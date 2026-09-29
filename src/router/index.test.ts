/**
 * Unit tests — Model Router
 *
 * 3 skenario sesuai Build #4:
 * (a) Provider pertama sukses langsung
 * (b) Provider pertama gagal karena quota → provider kedua sukses
 * (c) Semua provider gagal → error jelas + usage_logs tetap tercatat
 *
 * Strategi: mock adapter dan DB supaya test tidak tergantung pada:
 *   - Koneksi internet / API key aktif
 *   - Database Neon yang jalan
 *   - State provider (rate limit, saldo, dsb)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================
// MOCK SETUP
// ============================================================

// Mock DB client
const mockInsertValues = vi.fn().mockResolvedValue(undefined);
const mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues });
const mockSelectFrom = vi.fn().mockResolvedValue([
  { id: 1, name: "gemini" },
  { id: 2, name: "groq" },
  { id: 3, name: "deepseek" },
  { id: 4, name: "openrouter" },
]);
const mockSelect = vi.fn().mockReturnValue({ from: mockSelectFrom });

vi.mock("@/db/client", () => ({
  db: {
    insert: (...args: unknown[]) => mockInsert(...args),
    select: (...args: unknown[]) => mockSelect(...args),
  },
}));

vi.mock("@/db/schema", () => ({
  usageLogs: Symbol("usageLogs"),
  modelProviders: {
    id: Symbol("id"),
    name: Symbol("name"),
    isActive: Symbol("isActive"),
    priority: Symbol("priority"),
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((_col: unknown, _val: unknown) => "eq-mock"),
  asc: vi.fn((_col: unknown) => "asc-mock"),
}));

// ============================================================
// MOCK ADAPTERS
// ============================================================

// Store untuk mock adapter behavior — diset per test
let mockAdapterBehavior: Map<
  string,
  {
    generate?: () => Promise<{ content: string; tokensUsed: number }>;
    stream?: () => AsyncGenerator<string>;
  }
> = new Map();

// Helper: buat mock class yang bisa di-new
function makeMockAdapter(providerName: string) {
  return class MockAdapter {
    name = providerName;
    modelId: string;
    constructor(modelId: string) {
      this.modelId = modelId;
    }
    generate() {
      const behavior = mockAdapterBehavior.get(`${providerName}/${this.modelId}`);
      if (behavior?.generate) return behavior.generate();
      return Promise.resolve({ content: `mock ${providerName} response`, tokensUsed: 10 });
    }
    stream() {
      const behavior = mockAdapterBehavior.get(`${providerName}/${this.modelId}`);
      if (behavior?.stream) return behavior.stream();
      return (async function* () { yield "mock"; })();
    }
  };
}

vi.mock("@/providers/gemini", () => ({
  GeminiAdapter: makeMockAdapter("gemini"),
}));

vi.mock("@/providers/groq", () => ({
  GroqAdapter: makeMockAdapter("groq"),
}));

vi.mock("@/providers/deepseek", () => ({
  DeepSeekAdapter: makeMockAdapter("deepseek"),
}));

vi.mock("@/providers/openrouter", () => ({
  OpenRouterAdapter: makeMockAdapter("openrouter"),
}));

// Mock rules.ts
let mockActiveProviders: Array<{
  name: string;
  tier: number;
  apiKeyEnv: string;
  baseUrl: string;
  models: Array<{ id: string; label: string; contextWindow: number }>;
}> = [];

vi.mock("./rules", () => ({
  getActiveProvidersSortedByPriority: vi.fn(() =>
    Promise.resolve(mockActiveProviders)
  ),
}));

// ============================================================
// IMPORT ROUTER (setelah semua mock di-setup)
// ============================================================

import { routeRequest } from "./index";
import { ProviderFallbackError } from "@/providers/types";

// ============================================================
// TESTS
// ============================================================

describe("Model Router — routeRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdapterBehavior = new Map();
    mockActiveProviders = [];

    // Default: semua API key tersedia
    process.env.GEMINI_API_KEY = "test-gemini-key";
    process.env.GROQ_API_KEY = "test-groq-key";
    process.env.DEEPSEEK_API_KEY = "test-deepseek-key";
    process.env.OPENROUTER_API_KEY = "test-openrouter-key";

    // Reset DB mocks
    mockInsertValues.mockResolvedValue(undefined);
    mockInsert.mockReturnValue({ values: mockInsertValues });
    mockSelectFrom.mockResolvedValue([
      { id: 1, name: "gemini" },
      { id: 2, name: "groq" },
      { id: 3, name: "deepseek" },
      { id: 4, name: "openrouter" },
    ]);
    mockSelect.mockReturnValue({ from: mockSelectFrom });
  });

  // ——————————————————————————————————————————
  // (a) Provider pertama sukses langsung
  // ——————————————————————————————————————————
  it("sukses langsung dari provider pertama tanpa fallback", async () => {
    mockActiveProviders = [
      {
        name: "gemini",
        tier: 1,
        apiKeyEnv: "GEMINI_API_KEY",
        baseUrl: "https://generativelanguage.googleapis.com/v1beta",
        models: [
          { id: "gemini-3.8-flash", label: "Gemini 3.8", contextWindow: 1048576 },
        ],
      },
      {
        name: "groq",
        tier: 1,
        apiKeyEnv: "GROQ_API_KEY",
        baseUrl: "https://api.groq.com/openai/v1",
        models: [
          { id: "openai/gpt-oss-120b", label: "GPT OSS 120B", contextWindow: 131072 },
        ],
      },
    ];

    mockAdapterBehavior.set("gemini/gemini-3.8-flash", {
      generate: () =>
        Promise.resolve({ content: "Jawaban dari Gemini", tokensUsed: 42 }),
    });

    const result = await routeRequest(
      [{ role: "user", content: "Halo" }],
      { sourceId: "1" }
    );

    expect(result.content).toBe("Jawaban dari Gemini");
    expect(result.tokensUsed).toBe(42);
    expect(result.providerName).toBe("gemini");
    expect(result.modelId).toBe("gemini-3.8-flash");

    // usage_logs harus dicatat (insert dipanggil)
    expect(mockInsert).toHaveBeenCalled();
  });

  // ——————————————————————————————————————————
  // (b) Provider pertama gagal quota → provider kedua sukses
  // ——————————————————————————————————————————
  it("fallback ke provider kedua setelah provider pertama kena rate limit", async () => {
    mockActiveProviders = [
      {
        name: "gemini",
        tier: 1,
        apiKeyEnv: "GEMINI_API_KEY",
        baseUrl: "https://generativelanguage.googleapis.com/v1beta",
        models: [
          { id: "gemini-3.8-flash", label: "Gemini 3.8", contextWindow: 1048576 },
        ],
      },
      {
        name: "groq",
        tier: 1,
        apiKeyEnv: "GROQ_API_KEY",
        baseUrl: "https://api.groq.com/openai/v1",
        models: [
          { id: "openai/gpt-oss-120b", label: "GPT OSS 120B", contextWindow: 131072 },
        ],
      },
    ];

    // Gemini gagal: rate limit (429)
    mockAdapterBehavior.set("gemini/gemini-3.8-flash", {
      generate: () => {
        throw new ProviderFallbackError(
          "[gemini/gemini-3.8-flash] HTTP 429: Rate limit",
          429,
          false
        );
      },
    });

    // Groq sukses
    mockAdapterBehavior.set("groq/openai/gpt-oss-120b", {
      generate: () =>
        Promise.resolve({ content: "Jawaban dari Groq", tokensUsed: 55 }),
    });

    const result = await routeRequest(
      [{ role: "user", content: "Halo" }],
      { sourceId: "1" }
    );

    expect(result.content).toBe("Jawaban dari Groq");
    expect(result.providerName).toBe("groq");
    expect(result.modelId).toBe("openai/gpt-oss-120b");

    // usage_logs harus dicatat 2x: 1 gagal (gemini) + 1 sukses (groq)
    expect(mockInsert).toHaveBeenCalledTimes(2);
  });

  // ——————————————————————————————————————————
  // (c) Semua provider gagal → error jelas + usage_logs tercatat
  // ——————————————————————————————————————————
  it("throw error jelas saat semua provider gagal, usage_logs tetap tercatat", async () => {
    mockActiveProviders = [
      {
        name: "gemini",
        tier: 1,
        apiKeyEnv: "GEMINI_API_KEY",
        baseUrl: "https://generativelanguage.googleapis.com/v1beta",
        models: [
          { id: "gemini-3.8-flash", label: "Gemini 3.8", contextWindow: 1048576 },
        ],
      },
      {
        name: "groq",
        tier: 1,
        apiKeyEnv: "GROQ_API_KEY",
        baseUrl: "https://api.groq.com/openai/v1",
        models: [
          { id: "openai/gpt-oss-120b", label: "GPT OSS 120B", contextWindow: 131072 },
        ],
      },
    ];

    // Gemini gagal: 503
    mockAdapterBehavior.set("gemini/gemini-3.8-flash", {
      generate: () => {
        throw new ProviderFallbackError(
          "[gemini/gemini-3.8-flash] HTTP 503: Server overloaded",
          503,
          false
        );
      },
    });

    // Groq juga gagal: 429
    mockAdapterBehavior.set("groq/openai/gpt-oss-120b", {
      generate: () => {
        throw new ProviderFallbackError(
          "[groq/openai/gpt-oss-120b] HTTP 429: Rate limit",
          429,
          false
        );
      },
    });

    await expect(
      routeRequest(
        [{ role: "user", content: "Halo" }],
        { sourceId: "1" }
      )
    ).rejects.toThrow("Semua provider gagal/kuota habis");

    // usage_logs tetap dicatat untuk kedua percobaan gagal
    expect(mockInsert).toHaveBeenCalledTimes(2);
  });

  // ——————————————————————————————————————————
  // Tambahan: isProviderDead=true skip seluruh provider
  // ——————————————————————————————————————————
  it("skip seluruh provider saat isProviderDead=true (402 saldo habis)", async () => {
    mockActiveProviders = [
      {
        name: "deepseek",
        tier: 1,
        apiKeyEnv: "DEEPSEEK_API_KEY",
        baseUrl: "https://api.deepseek.com",
        models: [
          { id: "deepseek-flash", label: "DeepSeek Flash", contextWindow: 65536 },
          { id: "deepseek-v4-pro", label: "DeepSeek V4 Pro", contextWindow: 65536 },
        ],
      },
      {
        name: "groq",
        tier: 1,
        apiKeyEnv: "GROQ_API_KEY",
        baseUrl: "https://api.groq.com/openai/v1",
        models: [
          { id: "openai/gpt-oss-120b", label: "GPT OSS 120B", contextWindow: 131072 },
        ],
      },
    ];

    // DeepSeek: 402 saldo habis → isProviderDead=true
    mockAdapterBehavior.set("deepseek/deepseek-flash", {
      generate: () => {
        throw new ProviderFallbackError(
          "[deepseek/deepseek-flash] HTTP 402: Saldo habis",
          402,
          true
        );
      },
    });

    // deepseek-v4-pro TIDAK boleh dicoba (provider dead → skip semua model)
    mockAdapterBehavior.set("deepseek/deepseek-v4-pro", {
      generate: () => {
        throw new Error("deepseek-v4-pro seharusnya tidak dipanggil");
      },
    });

    // Groq sukses
    mockAdapterBehavior.set("groq/openai/gpt-oss-120b", {
      generate: () =>
        Promise.resolve({ content: "Fallback ke Groq", tokensUsed: 33 }),
    });

    const result = await routeRequest(
      [{ role: "user", content: "Halo" }],
      { sourceId: "1" }
    );

    // Harus langsung ke Groq, bukan coba deepseek-v4-pro
    expect(result.providerName).toBe("groq");
    expect(result.content).toBe("Fallback ke Groq");
  });

  // ——————————————————————————————————————————
  // Tambahan: tidak ada provider aktif → error jelas
  // ——————————————————————————————————————————
  it("throw error jelas saat tidak ada provider aktif", async () => {
    mockActiveProviders = [];

    await expect(
      routeRequest(
        [{ role: "user", content: "Halo" }],
        { sourceId: "1" }
      )
    ).rejects.toThrow("Tidak ada provider aktif");
  });

  // ——————————————————————————————————————————
  // Tambahan: skip provider tanpa API key
  // ——————————————————————————————————————————
  it("skip provider yang API key-nya tidak diset, lanjut ke berikutnya", async () => {
    // Hapus Gemini key
    delete process.env.GEMINI_API_KEY;

    mockActiveProviders = [
      {
        name: "gemini",
        tier: 1,
        apiKeyEnv: "GEMINI_API_KEY",
        baseUrl: "https://generativelanguage.googleapis.com/v1beta",
        models: [
          { id: "gemini-3.8-flash", label: "Gemini 3.8", contextWindow: 1048576 },
        ],
      },
      {
        name: "groq",
        tier: 1,
        apiKeyEnv: "GROQ_API_KEY",
        baseUrl: "https://api.groq.com/openai/v1",
        models: [
          { id: "openai/gpt-oss-120b", label: "GPT OSS 120B", contextWindow: 131072 },
        ],
      },
    ];

    mockAdapterBehavior.set("groq/openai/gpt-oss-120b", {
      generate: () =>
        Promise.resolve({ content: "Groq menjawab", tokensUsed: 15 }),
    });

    const result = await routeRequest(
      [{ role: "user", content: "Halo" }],
      { sourceId: "1" }
    );

    expect(result.providerName).toBe("groq");
  });
});
