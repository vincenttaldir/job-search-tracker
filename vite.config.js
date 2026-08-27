import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      }
    }
  },
  // Base is always / — Flask serves the SPA at the root
  base: '/',
  build: {
    // Output directly into Flask's static/dist folder for production serving
    outDir: path.resolve(__dirname, '../Job search/static/dist'),
    emptyOutDir: true,
    // Route-level code splitting is handled by React.lazy in App.jsx
  },
})
