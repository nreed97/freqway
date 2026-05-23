/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    css: false,
  },
  server: {
    proxy: {
      '/api/repeaterbook': {
        target: 'https://www.repeaterbook.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/repeaterbook/, '/api/export.php'),
        secure: true,
      },
      '/api/nominatim': {
        target: 'https://nominatim.openstreetmap.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/nominatim/, ''),
        secure: true,
        headers: { 'User-Agent': 'Freqway/1.0 (ham radio route planner)' },
      },
      '/api/hearham': {
        target: 'https://hearham.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/hearham/, '/api/repeaters/v1'),
        secure: true,
      },
    },
  },
})
