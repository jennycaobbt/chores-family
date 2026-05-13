import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'pwa-192.png', 'pwa-512.png', 'pwa-192-maskable.png', 'pwa-512-maskable.png'],
      manifest: {
        name: 'Chores',
        short_name: 'Chores',
        description: 'Family chore tracker',
        theme_color: '#8b5cf6',
        background_color: '#fdf4ff',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        icons: [
          // PNG icons for Android / Chrome install prompt
          { src: '/pwa-192.png',          sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/pwa-512.png',          sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/pwa-192-maskable.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/pwa-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          // SVG fallback for desktop browsers
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        navigateFallbackDenylist: [/^\/api/],
      },
    }),
  ],
  server: {
    host: true,
    port: 5173,
  },
})
