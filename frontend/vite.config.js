import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Dev lokal: forward /api ke backend yang jalan di localhost, meniru proxy nginx
    // di production (lihat nginx.conf) supaya kode fetch relatif ("/api/...") sama
    // persis perilakunya di dev maupun production.
    proxy: {
      '/api': {
        target: process.env.VITE_DEV_PROXY_TARGET || 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
})
