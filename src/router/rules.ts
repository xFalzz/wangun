/**
 * Router Rules — src/router/rules.ts
 *
 * Menentukan provider mana yang aktif dan urutan prioritasnya.
 *
 * DESAIN v1:
 *   - Sumber kebenaran: models.config.ts (statik) + tabel model_providers (dinamis is_active)
 *   - models.config.ts menyimpan detail teknis (model list, endpoint, tier)
 *   - Tabel DB model_providers menyimpan status runtime (is_active, priority)
 *   - Fungsi ini menggabungkan keduanya: ambil nama provider aktif dari DB,
 *     lalu lookup detail lengkapnya dari config.
 *
 * PARAMETER complexity:
 *   v1: diabaikan (semua complexity pakai urutan yang sama).
 *   v2+: bisa dipakai untuk routing cerdas (misal: task "berat" → DeepSeek dulu).
 *   Tetap diterima sekarang agar interface tidak berubah nanti.
 */

import { db } from "@/db/client";
import { modelProviders } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import {
  routerConfig,
  type ProviderConfig,
  type ProviderName,
} from "./models.config";

/**
 * Ambil daftar provider yang aktif, diurutkan berdasarkan priority dari DB.
 *
 * Alur:
 * 1. Query DB: SELECT name, priority FROM model_providers WHERE is_active = true ORDER BY priority ASC
 * 2. Untuk setiap nama provider dari DB, cari konfigurasi lengkapnya di models.config.ts
 * 3. Provider yang ada di DB tapi TIDAK ada di config (typo, belum dikonfigurasi) → dilewati
 * 4. Provider yang ada di config tapi TIDAK ada di DB → tidak dipakai (belum di-seed)
 *
 * @param _complexity — v1 diabaikan, diterima untuk forward-compat
 */
export async function getActiveProvidersSortedByPriority(
  _complexity: "ringan" | "berat" = "ringan"
): Promise<ProviderConfig[]> {
  // Query DB untuk status runtime provider
  const activeFromDb = await db
    .select({
      name: modelProviders.name,
      priority: modelProviders.priority,
    })
    .from(modelProviders)
    .where(eq(modelProviders.isActive, true))
    .orderBy(asc(modelProviders.priority));

  // Map nama DB ke config statik, abaikan yang tidak cocok
  const result: ProviderConfig[] = [];

  for (const row of activeFromDb) {
    // Normalisasi nama dari DB ke ProviderName.
    // DB seed menyimpan nama canonical lowercase ("gemini", "groq", dsb).
    const providerName = mapDbNameToConfigName(row.name);
    if (!providerName) continue;

    const config = routerConfig.providers.find((p) => p.name === providerName);
    if (!config) continue;

    // Hindari duplikat (kalau DB punya >1 baris dengan nama yang map ke provider sama)
    if (!result.some((r) => r.name === config.name)) {
      result.push(config);
    }
  }

  return result;
}

/**
 * Map nama provider dari tabel model_providers ke ProviderName di config.
 *
 * DB seed menyimpan nama canonical lowercase: "gemini", "groq", "deepseek", "openrouter".
 * Fungsi ini melakukan exact match dulu, lalu fuzzy fallback untuk backward compat
 * dengan seed lama yang pakai nama human-readable ("Gemini Flash", "DeepSeek-V3").
 */
function mapDbNameToConfigName(dbName: string): ProviderName | null {
  const normalized = dbName.toLowerCase().trim();

  // Exact match (seed v2 — canonical names)
  const validNames: ProviderName[] = ["gemini", "groq", "deepseek", "openrouter"];
  if (validNames.includes(normalized as ProviderName)) {
    return normalized as ProviderName;
  }

  // Fuzzy fallback (backward compat dengan seed lama)
  if (normalized.includes("gemini")) return "gemini";
  if (normalized.includes("groq")) return "groq";
  if (normalized.includes("deepseek")) return "deepseek";
  if (normalized.includes("openrouter")) return "openrouter";

  // Nama tidak dikenali — log warning, jangan crash
  console.warn(
    `[router/rules] Provider "${dbName}" dari DB tidak cocok dengan config manapun — dilewati`
  );
  return null;
}
