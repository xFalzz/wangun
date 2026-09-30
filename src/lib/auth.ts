/**
 * Auth.js (NextAuth v5) — Konfigurasi Autentikasi Wangun
 *
 * Provider:
 *   1. Credentials — email + password (validasi via Zod, hash via bcryptjs)
 *   2. Google OAuth — baca GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET dari env
 *
 * Tabel yang dipakai: users (sudah ada dari Build #2)
 *   - password_hash nullable → user OAuth tidak punya password lokal
 *   - plan_id default 1 (Free) → user baru Google otomatis dapat plan Free
 *
 * Session strategy: JWT (default NextAuth v5, tanpa adapter DB khusus)
 *   - userId disimpan di JWT payload → tersedia di server components & route handlers
 *   - Tidak pakai database adapter NextAuth → tidak buat tabel sessions tambahan,
 *     karena session di Wangun v1 tidak perlu revokasi per-device (cukup JWT expiry)
 *
 * Digunakan oleh:
 *   - src/app/api/auth/[...nextauth]/route.ts (handler HTTP)
 *   - middleware.ts (proteksi route /chat)
 *   - Server components & API routes via auth() / getServerSession()
 */

import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { compare } from "bcryptjs";
import { z } from "zod";
import { db } from "@/db/client";
import { users, plans } from "@/db/schema";
import { eq } from "drizzle-orm";

// ============================================================
// SCHEMA VALIDASI — Credentials login
// ============================================================

const credentialsSchema = z.object({
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(8, "Password minimal 8 karakter"),
});

// ============================================================
// HELPER — Ambil user dari DB berdasarkan email
// ============================================================

async function getUserByEmail(email: string) {
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase().trim()))
    .limit(1);
  return rows[0] ?? null;
}

// ============================================================
// HELPER — Buat user baru (untuk OAuth pertama kali)
// ============================================================

async function createOAuthUser(params: { name: string; email: string }) {
  // Pastikan plan Free (id=1) ada — bisa tidak ada jika seed belum dijalankan
  await db
    .insert(plans)
    .values({ id: 1, name: "Free", quotaDaily: 50, price: "0" })
    .onConflictDoNothing();

  const inserted = await db
    .insert(users)
    .values({
      name: params.name,
      email: params.email.toLowerCase().trim(),
      passwordHash: null, // OAuth user tidak punya password lokal
      planId: 1,
    })
    .returning({ id: users.id, name: users.name, email: users.email });

  return inserted[0] ?? null;
}

// ============================================================
// NEXTAUTH CONFIG
// ============================================================

export const authConfig: NextAuthConfig = {
  // Secret dari env — NEXTAUTH_SECRET wajib ada di production
  secret: process.env.NEXTAUTH_SECRET,

  // JWT session — tidak perlu tabel sessions di DB
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 hari
  },

  // Halaman custom (Build #5 — fungsional, belum styling final)
  pages: {
    signIn: "/login",
    error: "/login", // error query param diteruskan ke halaman login
  },

  providers: [
    // ——————————————————————————————————————
    // Provider 1: Credentials (email + password)
    // ——————————————————————————————————————
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // Validasi input via Zod — jangan trust data mentah dari form
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) {
          // Pesan generik — hindari user enumeration
          throw new Error("Email atau password tidak valid");
        }

        const { email, password } = parsed.data;
        const user = await getUserByEmail(email);

        // Kondisi gagal yang menghasilkan pesan SAMA untuk semua kasus:
        //   - email tidak terdaftar
        //   - email terdaftar tapi via Google (tidak punya password_hash)
        //   - password salah
        // → Tidak boleh membedakan pesan error ketiga kasus ini (user enumeration)
        if (!user || !user.passwordHash) {
          throw new Error("Email atau password salah");
        }

        const passwordOk = await compare(password, user.passwordHash);
        if (!passwordOk) {
          throw new Error("Email atau password salah");
        }

        // Return minimal user object — akan dimasukkan ke JWT
        return {
          id: String(user.id),
          name: user.name,
          email: user.email,
        };
      },
    }),

    // ——————————————————————————————————————
    // Provider 2: Google OAuth
    // ——————————————————————————————————————
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],

  callbacks: {
    // ——————————————————————————————————————
    // signIn: handle Google user baru — buat baris di tabel users
    // ——————————————————————————————————————
    async signIn({ user, account }) {
      // Credentials provider: authorize() sudah validasi, langsung izinkan
      if (account?.provider === "credentials") return true;

      // Google OAuth: cek apakah user sudah ada di DB
      if (account?.provider === "google" && user.email) {
        const existing = await getUserByEmail(user.email);

        if (!existing) {
          // User baru via Google → buat baris di tabel users
          const created = await createOAuthUser({
            name: user.name ?? user.email.split("@")[0],
            email: user.email,
          });

          if (!created) {
            console.error("[auth] Gagal membuat user baru via Google:", user.email);
            return false; // Tolak login jika gagal buat user
          }

          // Simpan DB id ke user object agar tersedia di jwt callback
          user.id = String(created.id);
        } else {
          user.id = String(existing.id);
        }

        return true;
      }

      return false; // Provider lain tidak diizinkan
    },

    // ——————————————————————————————————————
    // jwt: simpan userId dari DB ke JWT payload
    // Ini yang membuat userId tersedia di session tanpa query DB tiap request
    // ——————————————————————————————————————
    async jwt({ token, user, account }) {
      if (user?.id) {
        // Saat login pertama kali — user object ada
        token.userId = user.id;
      }

      // Untuk Credentials, user.id sudah berupa DB id (string dari authorize())
      // Untuk Google, user.id sudah diset di signIn callback dari DB
      if (account?.provider === "google" && user?.email && !token.userId) {
        // Fallback: cari dari DB kalau userId belum terisi
        const dbUser = await getUserByEmail(user.email);
        if (dbUser) token.userId = String(dbUser.id);
      }

      return token;
    },

    // ——————————————————————————————————————
    // session: expose userId ke client via session object
    // Diakses via useSession() / getServerSession() / auth()
    // ——————————————————————————————————————
    async session({ session, token }) {
      if (token.userId) {
        session.user.id = token.userId as string;
      }
      return session;
    },
  },
};

// Export handler dan helper yang dipakai di seluruh app
export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
