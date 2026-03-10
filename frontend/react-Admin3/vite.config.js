import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Match CRA's baseUrl: "src" from tsconfig.json
      src: path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8888',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'build', // Match CRA's output dir (used by Docker)
    sourcemap: true,
  },
  css: {
    preprocessorOptions: {
      scss: {
        // Sass options if needed
      },
    },
  },
});
