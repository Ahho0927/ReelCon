import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  root: 'src/popup',
  base: './',
  build: {
    emptyOutDir: false,
    outDir: resolve(__dirname, 'dist'),
    rollupOptions: {
      input: resolve(__dirname, 'src/popup/popup.html'),
      output: {
        entryFileNames: 'popup.js',
        assetFileNames: 'popup.[ext]',
      },
    },
  },
});
