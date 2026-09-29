/**
 * Shared types & error classes untuk semua provider adapter
 *
 * Import ini dari file adapter masing-masing — jangan duplikat definisi.
 */

// ============================================================
// TYPES
// ============================================================

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface GenerateResult {
  content: string;
  tokensUsed: number;
}

export interface ModelProviderAdapter {
  /** Nama provider — cocok dengan ProviderName di models.config.ts */
  readonly name: string;
  /** ID model yang sedang aktif dipakai adapter ini */
  readonly modelId: string;

  /** Non-streaming: tunggu seluruh response selesai */
  generate(params: {
    messages: ChatMessage[];
    maxTokens?: number;
  }): Promise<GenerateResult>;

  /** Streaming: yield token satu per satu */
  stream(params: {
    messages: ChatMessage[];
    maxTokens?: number;
  }): AsyncGenerator<string>;
}

// ============================================================
// ERROR CLASSES
// ============================================================

/**
 * Error yang dilempar adapter ketika provider bisa di-fallback.
 * Router menangkap ini dan mencoba model/provider berikutnya.
 */
export class ProviderFallbackError extends Error {
  readonly httpStatus: number;
  /**
   * true  → provider mati sepenuhnya (402 saldo habis, 401 auth invalid)
   *         router langsung skip ke PROVIDER berikutnya (bukan coba model lain di provider sama)
   * false → model bermasalah (429 rate limit, 503 overload, 404 deprecated)
   *         router coba MODEL berikutnya di provider yang sama dulu
   */
  readonly isProviderDead: boolean;

  constructor(message: string, httpStatus: number, isProviderDead = false) {
    super(message);
    this.name = "ProviderFallbackError";
    this.httpStatus = httpStatus;
    this.isProviderDead = isProviderDead;
  }
}

/**
 * Error fatal yang TIDAK di-fallback — langsung naik ke caller.
 * Contoh: 400 bad request (bug di kode kita, bukan masalah provider).
 */
export class ProviderFatalError extends Error {
  readonly httpStatus: number;

  constructor(message: string, httpStatus: number) {
    super(message);
    this.name = "ProviderFatalError";
    this.httpStatus = httpStatus;
  }
}

// ============================================================
// HELPER: klasifikasi HTTP status code
// ============================================================

/**
 * Tentukan jenis error berdasarkan HTTP status dari provider.
 * Dipakai oleh semua adapter untuk konsistensi.
 */
export function classifyHttpError(
  status: number,
  body: string,
  providerName: string,
  modelId: string
): never {
  switch (status) {
    case 402:
      // Saldo/billing habis — provider mati total, bukan transient
      // TODO(Observability/Build #13): kirim alert "provider dead — billing" ke admin dashboard
      // supaya tidak baru ketahuan saat semua request gagal beruntun di production
      throw new ProviderFallbackError(
        `[${providerName}/${modelId}] HTTP 402: Saldo/billing habis. Provider di-skip. Body: ${body.slice(0, 300)}`,
        402,
        true // isProviderDead = true → skip seluruh provider
      );

    case 401:
      // API key invalid — juga provider dead, bukan transient
      // TODO(Observability/Build #13): kirim alert "provider dead — auth invalid"
      throw new ProviderFallbackError(
        `[${providerName}/${modelId}] HTTP 401: API key tidak valid. Body: ${body.slice(0, 300)}`,
        401,
        true // isProviderDead = true
      );

    case 429:
      // Rate limit / quota — transient, coba model berikutnya
      throw new ProviderFallbackError(
        `[${providerName}/${modelId}] HTTP 429: Rate limit. Body: ${body.slice(0, 300)}`,
        429,
        false
      );

    case 404:
      // Model deprecated / tidak tersedia — coba model berikutnya
      throw new ProviderFallbackError(
        `[${providerName}/${modelId}] HTTP 404: Model tidak tersedia. Body: ${body.slice(0, 300)}`,
        404,
        false
      );

    case 503:
    case 502:
    case 500:
      // Server error — transient, coba model/provider berikutnya
      throw new ProviderFallbackError(
        `[${providerName}/${modelId}] HTTP ${status}: Server error. Body: ${body.slice(0, 300)}`,
        status,
        false
      );

    case 403:
      // Model diblokir di level project/permission (mis: Groq project limits)
      // Bukan bug di kode kita — coba model berikutnya
      throw new ProviderFallbackError(
        `[${providerName}/${modelId}] HTTP 403: Model diblokir (permission). Body: ${body.slice(0, 300)}`,
        403,
        false
      );

    default:
      // 400, dll — bug di kode kita, fatal
      throw new ProviderFatalError(
        `[${providerName}/${modelId}] HTTP ${status}: Fatal error. Body: ${body.slice(0, 300)}`,
        status
      );
  }
}
