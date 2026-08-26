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
          // NOTE: admin.jsx deliberately has NO entry here. Naming a module in
          // manualChunks puts it in the STATIC graph, so Vite emitted a
          // <link rel="modulepreload"> for it in index.html — every visitor
          // downloaded the whole 58 KB admin panel at High priority, competing
          // with the LCP image, on a page they will never open. The
          // React.lazy(() => import('./admin')) in App.jsx already gives it its
          // own chunk; the entry here only defeated that.
          // Blog data — shared between main bundle and admin, own chunk
          'blog-data': ['./src/blog_data.js'],
          // Product catalog data — large, changes independently of app code,
          // shared between the storefront and admin. Own chunk = better caching.
          'catalog-data': ['./src/data.js'],
        },
      },
    },
    // Smaller chunk warning threshold
    chunkSizeWarningLimit: 300,
  },
})
