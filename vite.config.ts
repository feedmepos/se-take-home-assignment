import { defineConfig } from 'vite';
import viteReact from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';

// https://vitejs.dev/config/
export default defineConfig({
    base: '/FeedMe-Take-Home-Assignment/',
    plugins: [viteReact(), tsconfigPaths(), TanStackRouterVite()],
});
