import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { execSync } from 'node:child_process';

// Version für die Anzeige in den Einstellungen: Commit + Build-Datum
const commit = (process.env.GITHUB_SHA || (() => {
  try { return execSync('git rev-parse HEAD').toString(); } catch { return 'dev'; }
})()).trim().slice(0, 7);
const APP_VERSION = `${commit} · ${new Date().toISOString().slice(0, 10)}`;

export default defineConfig({
  // Relative Pfade, damit die App auch in einem Unterordner gehostet werden kann.
  base: './',
  define: { __APP_VERSION__: JSON.stringify(APP_VERSION) },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png', 'favicon.svg'],
      manifest: {
        name: 'Kraftbuch',
        short_name: 'Kraftbuch',
        description: 'Strength training log · Trainingstagebuch für Kraftsport',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f3f5f0',
        theme_color: '#f3f5f0', // Statusleiste in der Hintergrundfarbe der App
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png}'],
      },
    }),
  ],
});
