import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    globals: true,
    exclude: ["node_modules/**", "tests/e2e/**"]
  },
  resolve: {
    alias: {
      "server-only": new URL(".", import.meta.url).pathname + "lib/security/__server_only_stub.ts",
      "@": new URL(".", import.meta.url).pathname
    }
  }
});
