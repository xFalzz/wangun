/**
 * NextAuth v5 Route Handler
 * Semua request ke /api/auth/* dihandle di sini.
 *
 * Endpoint yang dibuat otomatis oleh NextAuth:
 *   GET  /api/auth/session        — ambil session aktif
 *   GET  /api/auth/providers      — daftar provider tersedia
 *   GET  /api/auth/csrf           — CSRF token
 *   POST /api/auth/signin/...     — mulai login
 *   POST /api/auth/signout        — logout
 *   GET  /api/auth/callback/...   — OAuth callback (Google redirect ke sini)
 */

import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
