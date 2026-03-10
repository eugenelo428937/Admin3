import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

// Custom plugin to handle JSX in .js files (CRA convention)
function jsxInJsPlugin() {
  return {
    name: 'jsx-in-js',
    enforce: 'pre',
    async transform(code, id) {
      if (/\.js$/.test(id) && !id.includes('node_modules') && code.includes('<')) {
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
      src: path.resolve(__dirname, 'src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupPolyfills.js', './src/setupTests.js'],
    css: {
      modules: {
        classNameStrategy: 'non-scoped',
      },
    },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{js,jsx,ts,tsx}'],
      exclude: [
        'src/**/*.test.{js,jsx}',
        'src/**/__tests__/**',
        'src/test-utils/**',
        'src/misc/**',
        'src/**/*.examples.{js,jsx}',
        'src/index.jsx',
        'src/reportWebVitals.js',
        'src/setupTests.js',
        'src/components/sandbox/**',
        'src/components/styleguide/**',
        'src/components/Test/**',
        'src/components/Testing/**',
      ],
      thresholds: {
        statements: 95,
        branches: 95,
        functions: 95,
        lines: 95,
      },
      reporter: ['text', 'text-summary', 'lcov', 'html'],
    },
    // Match CRA's transformIgnorePatterns behavior
    deps: {
      inline: [
        '@reduxjs/toolkit',
        '@standard-schema',
        'msw',
        '@mswjs',
        'axios',
        'react-router',
        'react-router-dom',
      ],
    },
  },
});
