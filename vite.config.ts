import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dbGuard from './vite-plugin-db-guard.js';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), dbGuard()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom'],
          'supabase': ['@supabase/supabase-js'],
          'ui-lib': ['lucide-react'],
        },
      },
    },
  },
});
