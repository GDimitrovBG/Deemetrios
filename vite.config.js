import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React core — cached separately, almost never changes
          'vendor-react': ['react', 'react-dom'],
          // Admin panel — only loaded when #admin is accessed
          'admin': ['./src/admin.jsx'],
          // Blog data — shared between main bundle and admin, own chunk
          'blog-data': ['./src/blog_data.js'],
        },
      },
    },
    // Smaller chunk warning threshold
    chunkSizeWarningLimit: 300,
  },
})
