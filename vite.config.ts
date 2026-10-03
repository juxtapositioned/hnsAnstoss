import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: { port: Number(process.env.PORT) || 5173 },
  // two pages: the v0.27 match (index.html) and the collaborator's Heilige mode (heilige.html)
  build: { rollupOptions: { input: { main: 'index.html', heilige: 'heilige.html' } } },
});
