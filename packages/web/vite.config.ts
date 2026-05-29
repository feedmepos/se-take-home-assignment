import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  root: path.resolve(__dirname),
  plugins: [react()],
  resolve: {
    alias: {
      "@feedme/core": path.resolve(__dirname, "../core/src/index.ts"),
    },
  },
  server: {
    port: 3000,
  },
});
