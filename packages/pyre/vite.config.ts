/// <reference types="vitest/config" />
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const here = path.dirname(fileURLToPath(import.meta.url));

// Base matches this repo's GitHub Pages layout: Pages serves /docs as the
// site root, and the built demo is committed to docs/pyre/, so the deployed
// URL is https://<org>.github.io/testing-agents/pyre/.
const isBuild = process.env.NODE_ENV === 'production';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: isBuild ? '/testing-agents/pyre/' : '/',
  publicDir: false,
  build: {
    outDir: path.join(here, '../../docs/pyre'),
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      // Registry component source imports its co-shipped files via the
      // shadcn "@/lib/..." / "@/components/..." alias convention, so it
      // resolves identically here and in any real shadcn-initialized
      // consumer project (which always defines that alias).
      '@/lib': path.join(here, 'src'),
      '@/components': path.join(here, 'src'),
      '@pyre/core': path.join(here, 'src/pyre-core.ts'),
      '@pyre/glass-clock': path.join(here, 'src/glass-clock.tsx'),
    },
  },
  define: {
    'import.meta.vitest': 'undefined',
  },
  test: {
    includeSource: ['src/**/*.{ts,tsx}', 'versions/**/*.{ts,tsx}'],
    environment: 'node',
  },
});
