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
    // Each PactV3 `executeTest` spins up a fresh HTTP mock server on an
    // OS-assigned port and tears it down at the end of the test. The
    // teardown→startup boundary has a small window where the next test's
    // axios call can fire against a port the OS hasn't fully bound yet,
    // surfacing as a fast-fail "request expected but not received" — see
    // PR #94 run 25057437896 (admin-store + auth) and PR #96 run
    // 25059690383 (rules-engine), each failing on a different test.
    //
    // `fileParallelism: false` already forces `maxWorkers: 1` (vitest
    // resolves it that way internally), so we are not racing across
    // workers — the race is inside a single worker between back-to-back
    // mock servers, which no pool tuning can fix.
    //
    // `retry: 2` lets vitest re-run a transient mock-server race once
    // before failing the build. It's the standard remedy for inherently
    // timing-sensitive contract tests; a real contract mismatch fails
    // all attempts and is still reported.
    fileParallelism: false,
    retry: 2,
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
