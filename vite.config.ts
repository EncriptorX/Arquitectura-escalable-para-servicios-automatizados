import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    proxy: {
      '/solicitar-proteccion': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      }
    }
  }
})

