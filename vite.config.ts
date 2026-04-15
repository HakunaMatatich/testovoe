import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/backend': {
        target: 'https://showroom.eis24.me',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/backend/, '/c300'),
      },
    },
  },
})
