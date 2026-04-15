import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  server: {
    proxy: {
      '/backend': {
        target: 'http://showroom.eis24.me',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/backend/, '/c300'),
      },
    },
  },
})
