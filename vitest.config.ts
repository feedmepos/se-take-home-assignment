import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    passWithNoTests: true,
    exclude: ["**/node_modules/**", "**/e2e/**"],
    env: {
      TZ: "UTC",
    },
    setupFiles: [],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
