import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/se-take-home-assignment/',  // 仓库名
  plugins: [react()],
})
