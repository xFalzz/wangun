/**
 * Seed script — mengisi data awal yang diperlukan agar aplikasi bisa jalan
 *
 * Jalankan dengan: npm run db:seed
 *
 * Isi:
 * - plans: 1 baris "Free" (quota_daily=50)
 * - model_providers: Gemini Flash (priority=1), DeepSeek-V3 (priority=2)
 *
 * Aman dijalankan berulang — pakai INSERT ... ON CONFLICT DO NOTHING
 */

import { db } from "./client";
import { plans, modelProviders } from "./schema";
import { sql } from "drizzle-orm";

async function seed() {
  console.log("🌱 Memulai seed database...");

  // ——————————————————————————————————————————
  // Plans
  // quota_daily=50: angka konservatif untuk free tier karena Gemini Flash
  // memberi ~1500 request/hari, tapi kita batasi per user supaya satu user
  // tidak menghabiskan kuota provider untuk semua user lain.
  // Angka ini mudah diubah dari DB tanpa redeploy (kolom di tabel, bukan hardcode).
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
  // Model Providers
  // Priority menentukan urutan fallback di router (Blueprint §6):
  //   1 = Gemini Flash   → task ringan & default utama
  //   2 = DeepSeek-V3    → reasoning & coding kompleks
  // api_endpoint diisi dengan endpoint chat/completions masing-masing provider.
  // Kolom ini dibaca oleh router, bukan hardcode di kode adapter.
  // ——————————————————————————————————————————
  await db
    .insert(modelProviders)
    .values([
      {
        id: 1,
        name: "Gemini Flash",
        apiEndpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
        priority: 1,
        costPer1kToken: "0",
        isActive: true,
      },
      {
        id: 2,
        name: "DeepSeek-V3",
        apiEndpoint: "https://api.deepseek.com/chat/completions",
        priority: 2,
        costPer1kToken: "0",
        isActive: true,
      },
    ])
    .onConflictDoNothing();

  console.log("✅ model_providers: Gemini Flash (priority=1), DeepSeek-V3 (priority=2)");

  console.log("\n✨ Seed selesai.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed gagal:", err);
  process.exit(1);
});
