/**
 * Vitest configuration for Pact contract tests.
 *
 * Runs separately from the main test suite:
 *   npm run test:pact
 *
 * Pact tests are slower (they spin up mock servers) and generate
 * contract JSON files in /pacts. They should run in CI but not
 * in the default dev loop.
 */
import { defineConfig } from 'vitest/config';
import path from 'path';
import fs from 'fs';

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

// Plugin to resolve extensionless relative imports (CRA compatibility)
function resolveExtensionsPlugin() {
  const extensions = ['.js', '.jsx', '.ts', '.tsx', '.mjs'];
  return {
    name: 'resolve-extensions',
    enforce: 'pre',
    resolveId(source, importer) {
      if (!importer || !source.startsWith('.') || path.extname(source)) return null;
      const importerDir = path.dirname(importer);
      const basePath = path.resolve(importerDir, source);
      for (const ext of extensions) {
        const fullPath = basePath + ext;
        if (fs.existsSync(fullPath)) {
          return fullPath;
        }
      }
      for (const ext of extensions) {
        const indexPath = path.join(basePath, 'index' + ext);
        if (fs.existsSync(indexPath)) {
          return indexPath;
        }
      }
      return null;
    },
  };
}

export default defineConfig({
  plugins: [
    resolveExtensionsPlugin(),
    jsxInJsPlugin(),
  ],
  resolve: {
    alias: {
      src: path.resolve(__dirname, 'src'),
    },
    extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
  },
  test: {
    globals: true,
    // Pact tests run in Node (not jsdom) since they're API-only
    environment: 'node',
    // Only match Pact test files
    include: ['src/pact/**/*.pact.test.js'],
    // Pact tests need longer timeouts (mock server startup)
    testTimeout: 30000,
    // Serialize file execution — each PactV3 `executeTest` spins up a
    // mock HTTP server on an OS-assigned port. When vitest runs files in
    // parallel threads, two mock servers can race on the same ephemeral
    // port and one test's axios request lands in the wrong mock (or the
    // mock isn't listening yet), surfacing as intermittent
    // "request expected but not received" failures in different files
    // each run. One file at a time fixes it without hurting total runtime
    // meaningfully — the whole pact suite is ~40s.
    fileParallelism: false,
    deps: {
      optimizer: {
        web: {
          include: [
            'axios',
            '@pact-foundation',
          ],
        },
      },
    },
  },
});
