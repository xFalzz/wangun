/**
 * Middleware — Proteksi route /chat
 *
 * Aturan:
 *   - Semua route di bawah /chat wajib login
 *   - User yang belum login di-redirect ke /login
 *   - Route lain (/, /login, /register, /api/*) tidak diproteksi
 *
 * Menggunakan auth() dari NextAuth v5 sebagai middleware wrapper.
 * Session dibaca dari JWT cookie — tidak ada DB query per-request.
 */

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Daftar path prefix yang wajib login
const PROTECTED_PREFIXES = ["/chat"];

export default auth((req) => {
  const { nextUrl, auth: session } = req as NextRequest & { auth: unknown };

  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    nextUrl.pathname.startsWith(prefix)
  );

  if (isProtected && !session) {
    // Simpan URL yang dituju agar bisa redirect balik setelah login
    const loginUrl = new URL("/login", nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

// Konfigurasi matcher — tentukan route mana yang dijalankan middleware
// Exclude: static files, _next, favicon, api/auth (agar callback OAuth tidak diblokir)
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth).*)",
  ],
};
