module.exports = {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(@standard-schema|@standard-schema/utils|@reduxjs/toolkit|axios|react-router|react-router-dom|msw|@mswjs|until-async|strict-event-emitter|@open-draft|is-node-process|outvariant|@bundled-es-modules)/)',
  ],
  moduleNameMapper: {
    '\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/__mocks__/fileMock.js',
  },
  setupFiles: ['<rootDir>/src/setupPolyfills.js'],
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],

  // Coverage configuration (T001 - Frontend Test Coverage Enhancement)
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.test.{js,jsx}',
    '!src/**/__tests__/**',
    '!src/test-utils/**',
    '!src/misc/**',
    '!src/**/*.examples.{js,jsx}',
    '!src/index.js',
    '!src/reportWebVitals.js',
    '!src/setupTests.js',
    // Exclude demo/sandbox/styleguide components (not production code)
    '!src/components/sandbox/**',
    '!src/components/styleguide/**',
    '!src/components/Test/**',
    '!src/components/Testing/**',
  ],
  coverageThresholds: {
    global: {
      statements: 95,
      branches: 95,
      functions: 95,
      lines: 95,
    },
  },
  coverageReporters: ['text', 'text-summary', 'lcov', 'html'],

  // Exclude non-production code from coverage analysis (regex patterns)
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/src/test-utils/',
    '/src/misc/',
    '/src/components/sandbox/',
    '/src/components/styleguide/',
    '/src/components/Test/',
    '/src/components/Testing/',
  ],
};
