/**
 * Seed script — mengisi data awal yang diperlukan agar aplikasi bisa jalan
 *
 * Jalankan dengan: npm run db:seed
 *
 * Isi:
 * - plans: 1 baris "Free" (quota_daily=50)
 * - model_providers: 4 provider — gemini (1), groq (2), deepseek (3), openrouter (4)
 *
 * Aman dijalankan berulang:
 *   - plans: INSERT ... ON CONFLICT DO NOTHING (tidak ada kolom yang perlu di-update)
 *   - model_providers: INSERT ... ON CONFLICT DO UPDATE (upsert)
 *     → Memastikan nama canonical dan priority selalu up-to-date, bahkan kalau
 *       seed sebelumnya pakai nama lama ("Gemini Flash", "DeepSeek-V3").
 *     → ID dipertahankan agar FK dari usage_logs tidak rusak.
 *
 * CATATAN: nama provider di kolom `name` HARUS cocok dengan ProviderName di
 * models.config.ts ("gemini", "groq", "deepseek", "openrouter") — lowercase,
 * tanpa spasi. Fungsi mapDbNameToConfigName() di rules.ts bergantung pada ini.
 */

import { db } from "./client";
import { plans, modelProviders } from "./schema";
import { sql } from "drizzle-orm";

async function seed() {
  console.log("🌱 Memulai seed database...");

  // ——————————————————————————————————————————
  // Plans
  // ——————————————————————————————————————————
  await db
    .insert(plans)
    .values({
      id: 1,
      name: "Free",
      quotaDaily: 50,
      price: "0",
    })
    .onConflictDoNothing();

  console.log("✅ plans: Free (quota_daily=50)");

  // ——————————————————————————————————————————
  // Model Providers — upsert (ON CONFLICT DO UPDATE)
  //
  // Priority menentukan urutan fallback di router (Blueprint §6):
  //   1 = Gemini    → default utama, gratis, cepat
  //   2 = Groq      → open-weight, cepat, gratis tier
  //   3 = DeepSeek  → reasoning/coding (saat ini saldo habis)
  //   4 = OpenRouter → fallback terakhir, model :free
  //
  // Nama HARUS lowercase canonical — dipakai oleh router/rules.ts
  // untuk lookup ke models.config.ts.
  // ——————————————————————————————————————————
  const providerValues = [
    {
      id: 1,
      name: "gemini",
      apiEndpoint: "https://generativelanguage.googleapis.com/v1beta",
      priority: 1,
      costPer1kToken: "0",
      isActive: true,
    },
    {
      id: 2,
      name: "groq",
      apiEndpoint: "https://api.groq.com/openai/v1",
      priority: 2,
      costPer1kToken: "0",
      isActive: true,
    },
    {
      id: 3,
      name: "deepseek",
      apiEndpoint: "https://api.deepseek.com",
      priority: 3,
      costPer1kToken: "0",
      isActive: false, // Saldo habis per 2026-09-29, di-disable sampai di-topup
    },
    {
      id: 4,
      name: "openrouter",
      apiEndpoint: "https://openrouter.ai/api/v1",
      priority: 4,
      costPer1kToken: "0",
      isActive: true,
    },
  ];

  for (const pv of providerValues) {
    await db
      .insert(modelProviders)
      .values(pv)
      .onConflictDoUpdate({
        target: modelProviders.id,
        set: {
          name: sql`excluded.name`,
          apiEndpoint: sql`excluded.api_endpoint`,
          priority: sql`excluded.priority`,
          costPer1kToken: sql`excluded.cost_per_1k_token`,
          isActive: sql`excluded.is_active`,
        },
      });
  }

  console.log(
    "✅ model_providers: gemini (p=1), groq (p=2), deepseek (p=3, inactive), openrouter (p=4)"
  );

  console.log("\n✨ Seed selesai.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed gagal:", err);
  process.exit(1);
});
