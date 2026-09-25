import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Aktifkan strict mode untuk deteksi masalah React lebih awal
  reactStrictMode: true,

  // Logging untuk development — mempermudah debug streaming & API calls
  logging: {
    fetches: {
      fullUrl: true,
    },
  },

  // Headers keamanan dasar (akan diperluas di Build #15 saat deployment)
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
