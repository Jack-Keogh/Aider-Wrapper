import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  root: resolve(__dirname, 'frontend'),
  build: {
    emptyOutDir: true,
    outDir: resolve(__dirname, 'dist')
  }
});
