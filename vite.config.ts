/**
 * @author: 花神
 * @description https://cn.vitejs.dev/config/
 */
import path from 'path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
// import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig({
  plugins: [
    vue(),
    // basicSsl(),
  ],
  server: {
    open: true,
    port: 5174,
    host: 'local.jd.com',
  },
  build: {
    // minify: false,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
        manualChunks: (id: string) => {
          if (id.includes('node_modules')) {
            return 'vendor'
          }
        },
      },
    },
    modulePreload: {
      polyfill: false,
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), 'src'),
    },
  },
})
