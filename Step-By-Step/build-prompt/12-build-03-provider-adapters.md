# Prompt Build #3 (KRUSIAL): Provider Adapter — Wangun
> **Catatan folder**: kerjakan langsung di dalam folder project Wangun yang sudah terbuka (root project hasil scaffolding di Prompt Build #1) — jangan buat folder project baru atau subfolder pembungkus tambahan di dalamnya.

Implementasikan adapter untuk 2 provider AI pertama, mengikuti interface `ModelProviderAdapter` PERSIS seperti didefinisikan di Blueprint Bagian 6:

```ts
interface ModelProviderAdapter {
  name: string;
  generate(params: { messages: ChatMessage[]; maxTokens?: number }): Promise<{ content: string; tokensUsed: number }>;
  stream(params: { messages: ChatMessage[] }): AsyncGenerator<string>;
}
```

Langkah:
1. Sebelum menulis kode, **cek dokumentasi resmi terbaru** Gemini API dan DeepSeek API (format request/response bisa sudah berubah dari training data kamu) — laporkan endpoint dan format yang kamu temukan sebelum implementasi
2. Buat `/src/providers/gemini.ts` — baca API key dari `process.env.GEMINI_API_KEY`, implementasikan `generate()` dan `stream()`, konversi format Gemini ke bentuk `{ content, tokensUsed }` yang seragam
3. Buat `/src/providers/deepseek.ts` — sama, baca dari `process.env.DEEPSEEK_API_KEY`
4. Tangani error dari tiap provider dengan jelas: bedakan error rate-limit/quota (harus bisa dikenali oleh Model Router untuk fallback) vs error lain (auth invalid, network) yang harus dilempar apa adanya
5. Tulis unit test untuk kedua adapter memakai **mock HTTP response** (jangan panggil API sungguhan di test) — tes untuk: response sukses, response error quota, response error lain

Larangan: jangan pakai SDK agent/orchestration pihak ketiga — cukup SDK resmi provider (`@google/generative-ai` untuk Gemini) atau `fetch` biasa kalau SDK resmi tidak tersedia/tidak perlu.
