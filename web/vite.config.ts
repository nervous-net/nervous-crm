import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Redirect root to the static landing page in dev
function landingPageRedirect(): Plugin {
  return {
    name: 'landing-page-redirect',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url === '/') {
          req.url = '/landing.html';
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), landingPageRedirect()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
