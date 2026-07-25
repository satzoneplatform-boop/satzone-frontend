import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { resultsAdminPlugin } from './dev/resultsAdminPlugin';

// All upstream URLs come from env — no hardcoded production hosts here.
// Set VITE_API_TARGET in .env (or .env.local for dev overrides) to point
// at the backend you actually want this devserver to proxy `/api` and
// `/media` to. Empty → no proxy registered (use absolute VITE_API_BASE_URL
// from src/lib/env.ts instead).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.VITE_API_TARGET || '';

  return {
    // resultsAdminPlugin is `apply: 'serve'` — the /admin/results editor API
    // exists only on the local dev server, never in a build.
    plugins: [react(), tailwindcss(), resultsAdminPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
      proxy: {
        ...(apiTarget
          ? {
              '/api': {
                target: apiTarget,
                changeOrigin: true,
                // Forward client IP via X-Forwarded-For — the backend's HLS
                // playback tokens are IP-bound (FRONTEND.md §5.1).
                xfwd: true,
                secure: true,
              },
              '/media': {
                target: apiTarget,
                changeOrigin: true,
                xfwd: true,
                secure: true,
              },
            }
          : {}),
      },
    },
  };
});
