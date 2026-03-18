import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      src: path.resolve(__dirname, 'src'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/pact/**/*.pact.test.js'],
    testTimeout: 30000,
    // Run sequentially — all pact test files write to the same contract
    // JSON file (pacts/Admin3Frontend-Admin3Backend.json). Parallel
    // execution causes a race condition where the last writer wins and
    // earlier interactions are lost.
    fileParallelism: false,
  },
});
