import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Core tests are pure TypeScript — node environment, no DOM needed
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
