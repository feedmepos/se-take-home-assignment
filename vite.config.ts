import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  // Served from "/" locally; the Pages workflow sets BASE_PATH to the repo
  // sub-path (e.g. "/se-take-home-assignment/") for the production build.
  base: process.env.BASE_PATH || '/',
  plugins: [react()],
  test: {
    // Domain logic is pure, so unit tests run in a plain Node environment.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
