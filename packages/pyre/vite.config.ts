/// <reference types="vitest/config" />
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

const here = path.dirname(fileURLToPath(import.meta.url));

// Base matches this repo's GitHub Pages layout: Pages serves /docs as the
// site root, and the built demo is committed to docs/pyre/, so the deployed
// URL is https://<org>.github.io/testing-agents/pyre/.
const isBuild = process.env.NODE_ENV === 'production';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'icon-maskable.svg'],
      manifest: {
        name: 'Beat',
        short_name: 'Beat',
        description: 'A decimal clock and day planner. Every day is 100 beats.',
        theme_color: '#0b0d12',
        background_color: '#0b0d12',
        display: 'standalone',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,png,svg}'],
      },
    }),
  ],
  base: isBuild ? '/testing-agents/pyre/' : '/',
  build: {
    outDir: path.join(here, '../../docs/pyre'),
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': path.join(here, 'src'),
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
