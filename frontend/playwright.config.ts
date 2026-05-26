import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60000,
  workers: 1,
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
  },
  webServer: [
    {
      command: 'cd ../backend && npx tsx src/server.ts',
      port: 3000,
      reuseExistingServer: true,
      timeout: 10000,
    },
    {
      command: 'npx vite',
      port: 5173,
      reuseExistingServer: true,
      timeout: 10000,
    },
  ],
});
