import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

// Reuse the extension's pure logic (parsing, conversion, currency names,
// formatting) from ../src/lib via the @lib alias.
export default defineConfig({
  resolve: {
    alias: {
      '@lib': fileURLToPath(new URL('../src/lib', import.meta.url)),
    },
  },
  clearScreen: false,
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'esnext',
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        settings: fileURLToPath(new URL('./settings.html', import.meta.url)),
      },
    },
  },
  server: { port: 1420, strictPort: true },
});
