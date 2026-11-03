import fs from 'fs';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
        manifest: {
          id: '/',
          name: 'সফর',
          short_name: 'সফর',
          description: 'স্মার্ট ট্রান্সপোর্ট এন্ড ইমারজেন্সি সার্ভিস',
          theme_color: '#059669',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'portrait-primary',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globIgnores: ['**/assets/aistudio/**', '**/*.zip'],
          maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
          navigateFallbackDenylist: [/^\/.*\.zip$/, /^\/api\/.*/],
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
      {
        name: 'download-zip-and-api-middleware',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            const urlPath = req.url ? req.url.split('?')[0] : '';
            if (
              urlPath === '/safar-app.zip' || 
              urlPath === '/safar-gafargaon-clean-source.zip' ||
              urlPath === '/download-zip' ||
              urlPath === '/api/download-zip'
            ) {
              const primaryZip = path.resolve(process.cwd(), 'public', 'safar-gafargaon-clean-source.zip');
              const fallbackZip = path.resolve(process.cwd(), 'public', 'safar-app.zip');
              const zipPath = fs.existsSync(primaryZip) ? primaryZip : fallbackZip;
              if (fs.existsSync(zipPath)) {
                const stat = fs.statSync(zipPath);
                res.writeHead(200, {
                  'Content-Type': 'application/zip',
                  'Content-Length': stat.size,
                  'Content-Disposition': 'attachment; filename="safar-gafargaon-clean-source.zip"',
                  'Access-Control-Allow-Origin': '*',
                  'Access-Control-Allow-Methods': 'GET, OPTIONS',
                  'Cache-Control': 'no-cache, no-store, must-revalidate',
                  'Pragma': 'no-cache',
                  'Expires': '0',
                });
                fs.createReadStream(zipPath).pipe(res);
                return;
              }
            }

            if (req.url && (req.url === '/api/live/health' || req.url.startsWith('/api/live/health?'))) {
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.end(JSON.stringify({
                status: 'online',
                server: 'সফর গফরগাঁও বিল্ট-ইন লাইভ এজ সার্ভার',
                edgeColo: 'Local / Edge Simulator',
                timestamp: new Date().toISOString(),
                activeDriversCount: 12,
                activePassengersCount: 6,
                features: {
                  webSockets: true,
                  liveGpsStreaming: true,
                  emergencyAlerts: true
                }
              }));
              return;
            }

            if (req.url && (req.url === '/api/live/drivers' || req.url.startsWith('/api/live/drivers?'))) {
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.end(JSON.stringify({
                success: true,
                count: 12,
                message: 'Active drivers stream operational'
              }));
              return;
            }

            next();
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
