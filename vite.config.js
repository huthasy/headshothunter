import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // important for Telegram Mini Apps (relative paths)
  server: {
    port: 3000,
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
  }
});
