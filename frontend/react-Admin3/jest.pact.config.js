/**
 * Jest configuration for Pact contract tests.
 *
 * Runs separately from the main test suite:
 *   npm run test:pact
 *
 * Pact tests are slower (they spin up mock servers) and generate
 * contract JSON files in /pacts. They should run in CI but not
 * in the default watch-mode dev loop.
 */
module.exports = {
  // Only match Pact test files
  testMatch: ['<rootDir>/src/pact/**/*.pact.test.js'],

  // Reuse the same transform config as CRA
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': require.resolve('react-scripts/config/jest/babelTransform'),
  },

  // Pact tests need longer timeouts (mock server startup)
  testTimeout: 30000,

  // Don't use CRA's module name mapper (no CSS/image imports in Pact tests)
  moduleNameMapper: {},

  // Same node_modules transform ignore as main config
  transformIgnorePatterns: [
    'node_modules/(?!(@reduxjs/toolkit|@standard-schema|msw|@mswjs)/)',
  ],

  // Pact tests run in Node (not jsdom) since they're API-only
  testEnvironment: 'node',
};
