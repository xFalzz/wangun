/**
 * Tool Registry (Build #8)
 *
 * Registry tunggal untuk semua tool yang bisa dipanggil agent.
 * Setiap tool adalah fungsi async: (input: Record<string, unknown>) => Promise<string>
 *
 * Desain:
 *   - Registry adalah Record sederhana — mudah di-extend tanpa restrukturisasi
 *   - callTool() di loop.ts lookup tool dari sini berdasarkan nama string
 *   - Tool yang belum diimplementasi tidak perlu didaftarkan — loop sudah handle "unknown tool"
 *   - Filter tool per mode (chat vs ide) dilakukan di buildPlannerSystemPrompt()
 *     saat system prompt dikompilasi, bukan di sini
 *
 * Tool v1 (chat mode):
 *   - web_search — Tavily Search API
 *
 * Tool yang akan ditambahkan di v3 (IDE mode):
 *   - write_file, run_terminal, read_file — daftarkan saat Build #IDE
 */

import { webSearch } from "./webSearch";

// ============================================================
// TYPE
// ============================================================

export type ToolFunction = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  input: Record<string, any>
) => Promise<string>;

// ============================================================
// REGISTRY
// ============================================================

export const toolRegistry: Record<string, ToolFunction> = {
  /**
   * web_search — mencari informasi terkini di internet via Tavily
   * Input: { query: string, max_results?: number }
   * Output: JSON string array hasil search
   */
  web_search: async (input) => {
    const query = String(input.query ?? "");
    if (!query) {
      return JSON.stringify({ error: "Parameter 'query' wajib diisi dan tidak boleh kosong." });
    }

    const maxResults = typeof input.max_results === "number" ? input.max_results : 5;

    const results = await webSearch({ query, maxResults });

    if (results.length === 0) {
      return JSON.stringify({
        message: "Tidak ada hasil ditemukan untuk query ini.",
        query,
      });
    }

    // Format output sebagai teks yang mudah dibaca agent (bukan JSON mentah)
    // Agent akan menggunakan ini sebagai "Observation" di context selanjutnya
    const formatted = results
      .map(
        (r, i) =>
          `[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.snippet}`
      )
      .join("\n\n---\n\n");

    return `Hasil pencarian untuk "${query}":\n\n${formatted}`;
  },
};

// ============================================================
// HELPER — lookup tool dari registry
// ============================================================

/**
 * Ambil tool function dari registry.
 * Kembalikan null kalau tool tidak ada — caller yang putuskan apa yang dilakukan.
 */
export function getTool(name: string): ToolFunction | null {
  return toolRegistry[name] ?? null;
}
