import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  build: {
    emptyOutDir: false,
    outDir: 'dist',
    lib: {
      entry: resolve(__dirname, 'src/background/index.ts'),
      name: 'ReelControlsBackground',
      formats: ['iife'],
      fileName: () => 'background.js',
    },
    minify: 'esbuild',
    sourcemap: false,
  },
});
