import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: ['lucide-react/dist/esm/icons/file-text', 'lucide-react/dist/esm/icons/settings', /* other specific icons */]
  },
  server: {
    proxy: {
      // Proxy API requests to the backend server during development
      '/api': 'http://localhost:3001',
    },
  },
});
