import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React core — cached separately, almost never changes
          'vendor-react': ['react', 'react-dom'],
          // Admin panel — only loaded when #admin is accessed
          'admin': ['./src/admin.jsx'],
        },
      },
    },
    // Smaller chunk warning threshold
    chunkSizeWarningLimit: 300,
  },
})
