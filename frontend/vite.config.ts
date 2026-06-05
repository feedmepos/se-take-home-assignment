import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: process.env.GITHUB_PAGES ? '/se-take-home-assignment/' : '/',
  plugins: [react()],
  test: {
    environment: 'node',
  },
})
