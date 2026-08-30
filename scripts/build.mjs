import { cp, mkdir } from 'node:fs/promises';
import { build } from 'vite';

await build({ configFile: 'vite.content.config.ts' });
await build({ configFile: 'vite.popup.config.ts' });
await mkdir('dist', { recursive: true });
await cp('manifest.json', 'dist/manifest.json');
await cp('assets', 'dist/assets', { recursive: true });
