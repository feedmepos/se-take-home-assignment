import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './specs',
  timeout: 60_000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:8080',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'cd ../../src && go run . serve --port 8080',
    port: 8080,
    reuseExistingServer: !process.env.CI,
    timeout: 15_000,
  },
});
