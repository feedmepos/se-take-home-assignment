import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// The frontend talks to the Node.js backend (default http://localhost:3001).
// Override at build/dev time with VITE_API_BASE.
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    open: true,
  },
});
