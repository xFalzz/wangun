/**
 * Tool: web_search (Build #8)
 *
 * Wrapper tipis di atas Tavily Search REST API.
 *
 * Format API terkonfirmasi dari docs.tavily.com/documentation/api-reference/endpoint/search.md
 * (dibaca langsung 2026-09-30):
 *   POST https://api.tavily.com/search
 *   Auth: Bearer tvly-...
 *   Request: { query, search_depth, max_results }
 *   Response: { results: [{ title, url, content, score }] }
 *
 * Mapping ke interface internal kita:
 *   content → snippet (nama lebih deskriptif untuk agent context)
 *
 * Error handling:
 *   - 401 → API key salah/tidak ada → ProviderFatalError (tidak perlu retry)
 *   - 429 → rate limit → lempar Error biasa (loop agent akan handle sebagai tool error)
 *   - 432 → kuota bulanan habis → lempar Error dengan pesan jelas
 *   - Network error → rethrow
 *
 * Konfigurasi:
 *   Env var: TAVILY_API_KEY (format: tvly-...)
 *   search_depth: "basic" — 1 kredit per panggilan (cukup untuk v1, agent biasa)
 *   max_results: 5 — fokus, cukup untuk agent context window
 */

import { z } from "zod";

// ============================================================
// TYPES
// ============================================================

export interface SearchResult {
  title: string;
  snippet: string; // maps dari response.results[].content
  url: string;
  score: number;
}

export interface WebSearchInput {
  query: string;
  maxResults?: number;
}

// ============================================================
// TAVILY RESPONSE SCHEMA — validasi response API
// ============================================================

const tavilyResultSchema = z.object({
  title: z.string(),
  url: z.string(),
  content: z.string(),  // Tavily menyebut ini "content", kita expose sebagai "snippet"
  score: z.number().optional().default(0),
});

const tavilyResponseSchema = z.object({
  results: z.array(tavilyResultSchema),
  // field lain (query, response_time, answer) tidak kita pakai
});

// ============================================================
// MAIN EXPORT: webSearch
// ============================================================

/**
 * Panggil Tavily Search API dan kembalikan array SearchResult.
 *
 * Throws Error kalau:
 *   - API key tidak diset
 *   - Response tidak 200 (dengan pesan yang mencantumkan status code dan detail)
 *   - Response body tidak sesuai schema
 */
export async function webSearch({
  query,
  maxResults = 5,
}: WebSearchInput): Promise<SearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error(
      "[web_search] TAVILY_API_KEY tidak diset di environment. " +
      "Tambahkan ke .env.local: TAVILY_API_KEY=tvly-..."
    );
  }

  const requestBody = {
    query,
    search_depth: "basic",   // 1 kredit per request (free tier: 1000/bulan)
    max_results: Math.min(maxResults, 10), // cap di 10, sesuai spec default max
    include_answer: false,   // tidak butuh LLM answer dari Tavily — agent punya LLMnya sendiri
  };

  let res: Response;
  try {
    res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });
  } catch (networkErr) {
    throw new Error(
      `[web_search] Network error saat menghubungi Tavily API: ${
        networkErr instanceof Error ? networkErr.message : String(networkErr)
      }`
    );
  }

  if (!res.ok) {
    let detail = "";
    try {
      const errBody = (await res.json()) as { detail?: { error?: string } };
      detail = errBody.detail?.error ?? "";
    } catch {
      // response bukan JSON
    }

    if (res.status === 401) {
      throw new Error(
        `[web_search] TAVILY_API_KEY tidak valid (401 Unauthorized). ` +
        `Pastikan key formatnya tvly-... dan sudah aktif di app.tavily.com.`
      );
    }

    if (res.status === 429) {
      throw new Error(
        `[web_search] Rate limit Tavily tercapai (429). ` +
        `Coba lagi sebentar. Detail: ${detail}`
      );
    }

    if (res.status === 432) {
      throw new Error(
        `[web_search] Kuota bulanan Tavily habis (432). ` +
        `Free tier: 1000 kredit/bulan. Cek https://app.tavily.com.`
      );
    }

    throw new Error(
      `[web_search] Tavily API error ${res.status}: ${detail || res.statusText}`
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await res.json();
  } catch {
    throw new Error("[web_search] Tavily mengembalikan response yang bukan JSON.");
  }

  const parsed = tavilyResponseSchema.safeParse(rawBody);
  if (!parsed.success) {
    const firstErr = parsed.error.errors[0]?.message ?? "Format tidak sesuai";
    throw new Error(`[web_search] Response Tavily tidak sesuai schema: ${firstErr}`);
  }

  return parsed.data.results.map((r) => ({
    title: r.title,
    snippet: r.content,
    url: r.url,
    score: r.score,
  }));
}
