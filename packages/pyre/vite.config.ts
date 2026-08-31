/// <reference types="vitest/config" />
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const here = path.dirname(fileURLToPath(import.meta.url));

// Base matches this repo's GitHub Pages layout: Pages serves /docs as the
// site root, and the built demo is committed to docs/pyre/, so the deployed
// URL is https://<org>.github.io/testing-agents/pyre/.
const isBuild = process.env.NODE_ENV === 'production';

export default defineConfig({
  plugins: [react()],
  base: isBuild ? '/testing-agents/pyre/' : '/',
  publicDir: false,
  build: {
    outDir: path.join(here, '../../docs/pyre'),
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@pyre/core': path.join(here, 'src/pyre-core.ts'),
      '@pyre/glass-clock': path.join(here, 'src/glass-clock.tsx'),
    },
  },
  define: {
    'import.meta.vitest': 'undefined',
  },
  test: {
    includeSource: ['src/**/*.{ts,tsx}'],
    environment: 'node',
  },
});
