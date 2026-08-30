import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  build: {
    emptyOutDir: true,
    outDir: 'dist',
    lib: {
      entry: resolve(__dirname, 'src/content/index.ts'),
      name: 'ReelControls',
      formats: ['iife'],
      fileName: () => 'content.js',
    },
    minify: 'esbuild',
    sourcemap: false,
  },
});
