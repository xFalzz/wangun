import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Resolve @/ path alias — sama seperti tsconfig.json
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
    },
  },
});
