/**
 * POST /api/auth/register
 *
 * Endpoint registrasi user baru via Credentials (email + password).
 * Google OAuth tidak perlu endpoint register — user baru dibuat otomatis
 * di signIn callback (src/lib/auth.ts) saat pertama kali login via Google.
 *
 * Request body:
 *   { name: string, email: string, password: string }
 *
 * Response:
 *   201 { message: "Registrasi berhasil" }
 *   400 { error: "..." } — validasi gagal
 *   409 { error: "..." } — email sudah dipakai (pesan generik, hindari enumeration)
 *   500 { error: "..." } — server error
 *
 * Security:
 *   - Password di-hash dengan bcrypt (cost factor 12) sebelum disimpan
 *   - Pesan error tidak membedakan "email tidak ada" vs "password salah"
 *   - Email di-normalize (lowercase + trim) sebelum cek uniqueness
 */

import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { db } from "@/db/client";
import { users, plans } from "@/db/schema";
import { eq } from "drizzle-orm";

// ============================================================
// SCHEMA VALIDASI
// ============================================================

const registerSchema = z.object({
  name: z
    .string()
    .min(2, "Nama minimal 2 karakter")
    .max(255, "Nama terlalu panjang"),
  email: z
    .string()
    .email("Format email tidak valid")
    .max(255, "Email terlalu panjang"),
  password: z
    .string()
    .min(8, "Password minimal 8 karakter")
    .max(128, "Password terlalu panjang"),
});

// ============================================================
// HANDLER
// ============================================================

export async function POST(req: NextRequest) {
  try {
    // Parse dan validasi body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Request body harus berupa JSON" },
        { status: 400 }
      );
    }

    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message ?? "Input tidak valid";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { name, email, password } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Cek apakah email sudah terdaftar
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (existing.length > 0) {
      // Pesan generik — tidak bocorkan apakah email terdaftar via Google atau Credentials
      return NextResponse.json(
        { error: "Email sudah digunakan. Coba login atau gunakan email lain." },
        { status: 409 }
      );
    }

    // Pastikan plan Free (id=1) ada — jaga-jaga jika seed belum dijalankan
    await db
      .insert(plans)
      .values({ id: 1, name: "Free", quotaDaily: 50, price: "0" })
      .onConflictDoNothing();

    // Hash password sebelum simpan (cost 12 — keseimbangan keamanan vs kecepatan)
    const passwordHash = await hash(password, 12);

    // Simpan user baru
    await db.insert(users).values({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      planId: 1,
    });

    return NextResponse.json(
      { message: "Registrasi berhasil. Silakan login." },
      { status: 201 }
    );
  } catch (err) {
    console.error("[register] Error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan server. Coba lagi nanti." },
      { status: 500 }
    );
  }
}
