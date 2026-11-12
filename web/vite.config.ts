import { defineConfig } from 'vite';
import path from 'node:path';

export default defineConfig({
  base: '/',
  publicDir: 'public',
  build: {
    outDir: path.resolve(__dirname, '../internal/ui/dist'),
    emptyOutDir: true,
    sourcemap: false,
    target: 'es2022',
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
});
