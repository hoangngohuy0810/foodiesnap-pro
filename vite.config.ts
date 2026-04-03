import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    // Removed define for secure backend approach
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            // Firebase core + auth (heavy)
            'firebase-core': ['firebase/app', 'firebase/auth'],
            // Firestore (very heavy ~400KB)
            'firebase-firestore': ['firebase/firestore'],
            // React ecosystem
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            // Animation + UI libs
            'ui-vendor': ['motion/react', 'lucide-react'],
            // Confetti (small but separate)
            'confetti': ['canvas-confetti'],
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        '/api': {
          target: process.env.VITE_API_URL || 'http://127.0.0.1:8080',
          changeOrigin: true,
        },
      },
    },
  };
});
