/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@contracts': resolve(__dirname, '../backend/src/contracts.ts') } },
  server: { proxy: { '/api': { target: 'http://localhost:3000', changeOrigin: true } } },
  build: { outDir: '../frontend-dist', emptyOutDir: true },
  test: { environment: 'jsdom', globals: true, setupFiles: './src/test/setup.ts' },
});
