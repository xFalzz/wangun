"use client";

/**
 * Halaman /register
 *
 * Fungsional: form nama + email + password.
 * Styling minimal (Build #5) — desain final via Design Brief menyusul.
 *
 * Flow:
 *   1. User isi form → POST /api/auth/register
 *   2. Sukses → auto-login via signIn("credentials") → redirect ke /chat
 *   3. Error (duplikat email, validasi gagal) → tampilkan di UI
 */

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Langkah 1: Daftar via API
    let res: Response;
    try {
      res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
    } catch {
      setError("Tidak bisa terhubung ke server. Periksa koneksi internet kamu.");
      setLoading(false);
      return;
    }

    if (!res.ok) {
      let errorMsg = "Registrasi gagal. Coba lagi.";
      try {
        const data = (await res.json()) as { error?: string };
        if (data.error) errorMsg = data.error;
      } catch {
        // response bukan JSON — pakai pesan default
      }
      setError(errorMsg);
      setLoading(false);
      return;
    }

    // Langkah 2: Auto-login setelah registrasi sukses
    const loginResult = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (loginResult?.error) {
      // Registrasi berhasil tapi auto-login gagal — arahkan manual ke login
      router.push("/login?registered=1");
      return;
    }

    router.push("/chat");
    router.refresh();
  }

  return (
    <main style={{ maxWidth: 400, margin: "80px auto", padding: "0 16px" }}>
      <h1>Daftar — Wangun</h1>

      {error && (
        <div
          role="alert"
          style={{
            color: "red",
            border: "1px solid red",
            borderRadius: 4,
            padding: "8px 12px",
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <label htmlFor="register-name" style={{ display: "block", marginBottom: 4 }}>
            Nama
          </label>
          <input
            id="register-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
            autoComplete="name"
            disabled={loading}
            style={{ width: "100%", padding: "8px 10px", boxSizing: "border-box" }}
          />
        </div>

        <div>
          <label htmlFor="register-email" style={{ display: "block", marginBottom: 4 }}>
            Email
          </label>
          <input
            id="register-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            disabled={loading}
            style={{ width: "100%", padding: "8px 10px", boxSizing: "border-box" }}
          />
        </div>

        <div>
          <label htmlFor="register-password" style={{ display: "block", marginBottom: 4 }}>
            Password <small>(minimal 8 karakter)</small>
          </label>
          <input
            id="register-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            disabled={loading}
            style={{ width: "100%", padding: "8px 10px", boxSizing: "border-box" }}
          />
        </div>

        <button
          id="register-submit"
          type="submit"
          disabled={loading}
          style={{ padding: "10px", cursor: loading ? "not-allowed" : "pointer" }}
        >
          {loading ? "Mendaftarkan..." : "Daftar"}
        </button>
      </form>

      <p style={{ marginTop: 20, textAlign: "center" }}>
        Sudah punya akun?{" "}
        <Link href="/login">Login sekarang</Link>
      </p>
    </main>
  );
}
