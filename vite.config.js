import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Serve index.html for all routes on refresh (SPA fallback)
    historyApiFallback: true,
  },
  build: {
    rollupOptions: {
      output: {
        // Split vendor libs into separate cached chunks so the browser can
        // load them in parallel and cache them independently from app code.
        manualChunks: {
          'react-vendor':  ['react', 'react-dom', 'react-router-dom'],
          'query-vendor':  ['@tanstack/react-query'],
          'ui-vendor':     ['lucide-react', 'react-hot-toast'],
          'state-vendor':  ['zustand'],
          'http-vendor':   ['axios'],
        },
      },
    },
    // Warn when a chunk exceeds 500 kB
    chunkSizeWarningLimit: 500,
  },
})
