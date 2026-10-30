import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

function serveRootIndex() {
  return {
    name: 'serve-root-index',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (request.url === '/') {
          response.statusCode = 302;
          response.setHeader('Location', '/index.html');
          response.end();
          return;
        }
        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [serveRootIndex(), react()],
  root: resolve(__dirname, 'frontend'),
  server: {
    proxy: {
      '/api/': 'http://127.0.0.1:8000'
    }
  },
  build: {
    emptyOutDir: true,
    outDir: resolve(__dirname, 'dist')
  }
});
