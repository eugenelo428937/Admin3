import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Custom plugin to handle JSX in .js files (CRA convention)
// Vite's vite:define plugin uses esbuild internally with loader based on
// file extension. For .js files it uses 'js' loader which doesn't support JSX.
// This plugin transforms JSX before vite:define runs.
function jsxInJsPlugin() {
  return {
    name: 'jsx-in-js',
    enforce: 'pre',
    async transform(code, id) {
      if (/\/src\/.*\.js$/.test(id) && code.includes('<')) {
        const esbuild = await import('esbuild');
        const result = await esbuild.transform(code, {
          loader: 'jsx',
          jsx: 'automatic',
          sourcefile: id,
          sourcemap: true,
        });
        return {
          code: result.code,
          map: result.map,
        };
      }
    },
  };
}

export default defineConfig({
  plugins: [
    jsxInJsPlugin(),
    react(),
  ],
  resolve: {
    alias: {
      // Match CRA's baseUrl: "src" from tsconfig.json
      src: path.resolve(__dirname, 'src'),
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
  server: {
    port: 3000,
    host: '127.0.0.1',
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
    rollupOptions: {
      // Enable Rollup's native JSX parsing (Rollup 4+)
      jsx: 'react-jsx',
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        // Sass options if needed
      },
    },
  },
});
