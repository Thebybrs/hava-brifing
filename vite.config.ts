import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: process.env.VITE_BASE || './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt', // yeni sürümde UpdateToast göster
      manifestFilename: 'manifest.json',
      includeAssets: [
        'favicon.svg',
        'icons/apple-touch-icon.png',
        'offline.html',
      ],
      manifest: {
        name: 'Hava Brifing — Günlük Havacılık & AI',
        short_name: 'Brifing',
        description: 'Günlük havacılık, pilotaj ve yapay zeka brifingi',
        lang: 'tr',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#0A0E14',
        background_color: '#0A0E14',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /\/data\/briefings\/index\.json$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'briefing-index',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 1 },
            },
          },
          {
            urlPattern: /\/data\/briefings\/\d{4}-\d{2}-\d{2}\.json$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'briefing-days',
              expiration: {
                maxEntries: 45,
                maxAgeSeconds: 60 * 60 * 24 * 45,
              },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
});
