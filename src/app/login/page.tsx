"use client";

/**
 * Halaman /login
 *
 * Fungsional: form email+password + tombol Google OAuth.
 * Styling minimal (Build #5) — desain final via Design Brief menyusul.
 *
 * Flow:
 *   1. User isi form → POST via signIn("credentials", ...)
 *   2. Error dari NextAuth → tampilkan di UI (pesan generik, tidak bocorkan detail)
 *   3. Sukses → redirect ke callbackUrl atau /chat
 *   4. Tombol Google → redirect ke Google OAuth consent screen
 */

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

// Map NextAuth error codes ke pesan user-friendly
const ERROR_MESSAGES: Record<string, string> = {
  CredentialsSignin: "Email atau password salah.",
  OAuthAccountNotLinked:
    "Email ini sudah terdaftar dengan metode login lain. Gunakan email/password.",
  Default: "Terjadi kesalahan. Coba lagi.",
};

export default function LoginPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const callbackUrl = searchParams.get("callbackUrl") ?? "/chat";
  const errorParam = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Tampilkan error dari URL param (NextAuth redirect error)
  useEffect(() => {
    if (errorParam) {
      setError(ERROR_MESSAGES[errorParam] ?? ERROR_MESSAGES.Default);
    }
  }, [errorParam]);

  // ——————————————————————————————————————
  // Submit: Credentials login
  // ——————————————————————————————————————
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false, // Tangani redirect manual agar bisa tampilkan error
    });

    setLoading(false);

    if (result?.error) {
      // NextAuth v5 mengembalikan error code, bukan pesan langsung
      setError(ERROR_MESSAGES[result.error] ?? ERROR_MESSAGES.Default);
      return;
    }

    // Login sukses → redirect
    router.push(callbackUrl);
    router.refresh();
  }

  // ——————————————————————————————————————
  // Google OAuth
  // ——————————————————————————————————————
  async function handleGoogle() {
    setLoading(true);
    await signIn("google", { callbackUrl });
    // signIn Google langsung redirect — setLoading tidak perlu di-reset
  }

  return (
    <main style={{ maxWidth: 400, margin: "80px auto", padding: "0 16px" }}>
      <h1>Login — Wangun</h1>

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
          <label htmlFor="login-email" style={{ display: "block", marginBottom: 4 }}>
            Email
          </label>
          <input
            id="login-email"
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
          <label htmlFor="login-password" style={{ display: "block", marginBottom: 4 }}>
            Password
          </label>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            disabled={loading}
            style={{ width: "100%", padding: "8px 10px", boxSizing: "border-box" }}
          />
        </div>

        <button
          id="login-submit"
          type="submit"
          disabled={loading}
          style={{ padding: "10px", cursor: loading ? "not-allowed" : "pointer" }}
        >
          {loading ? "Memproses..." : "Login"}
        </button>
      </form>

      <hr style={{ margin: "20px 0" }} />

      <button
        id="login-google"
        type="button"
        onClick={handleGoogle}
        disabled={loading}
        style={{
          width: "100%",
          padding: "10px",
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        Login dengan Google
      </button>

      <p style={{ marginTop: 20, textAlign: "center" }}>
        Belum punya akun?{" "}
        <Link href="/register">Daftar sekarang</Link>
      </p>
    </main>
  );
}
