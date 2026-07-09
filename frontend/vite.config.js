import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// P3-31 fix: proxy target was hardcoded to localhost:5002, making local
// onboarding brittle if the backend port ever changes. Reads VITE_API_PROXY_TARGET
// from .env.development (or the shell env) with the previous value as fallback.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.VITE_API_PROXY_TARGET || 'http://localhost:5002';

  return {
    plugins: [react()],
    server: {
      host: true,
      port: 5173,
      proxy: {
        '/api': { target, changeOrigin: true },
        '/uploads': { target, changeOrigin: true },
      },
    },
  };
});
