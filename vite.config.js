import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // 'spa' mode = all unknown routes served as index.html (fixes refresh / back-button 404)
  appType: 'spa',
  server: {
    host: true,   // expose on local network so phone/tablet can connect
  },
})

