import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 部署在子路径时：VITE_BASE_PATH=/feedme/ npm run build（与 Go -base /feedme 一致）
const base = process.env.VITE_BASE_PATH || "/";

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    outDir: "../internal/pack/webdist",
    emptyOutDir: true,
  },
  server: {
    proxy: {
      "/api": "http://127.0.0.1:8080",
      "/healthz": "http://127.0.0.1:8080",
    },
  },
});
