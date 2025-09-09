/**
 * TDD Guard Configuration for React Frontend
 * Enforces strict test-driven development practices
 */

module.exports = {
  // TDD enforcement settings
  enabled: true,
  testFramework: 'jest',
  testCommand: 'npm test -- --watchAll=false --passWithNoTests',
  testFilePattern: '**/*.{test,spec}.{js,jsx,ts,tsx}',
  sourceFilePattern: 'src/**/*.{js,jsx,ts,tsx}',
  
  // Coverage requirements
  minCoverage: 80,
  coverageCommand: 'npm test -- --coverage --watchAll=false',
  
  // Enforcement rules
  enforceTestFirst: true,
  blockImplementationWithoutTests: true,
  requireFailingTestBeforeImplementation: true,
  
  // Files to ignore
  ignorePatterns: [
    'node_modules/**',
    'build/**',
    'public/**',
    'src/serviceWorker.js',
    'src/setupTests.js',
    'src/index.js',
    '**/*.config.js',
    '**/*.test.js',
    '**/*.spec.js'
  ],
  
  // Test mapping
  testMapping: {
    // Map source files to test files
    pattern: (sourceFile) => {
      const baseName = sourceFile.replace(/\.(jsx?|tsx?)$/, '');
      return [
        `${baseName}.test.js`,
        `${baseName}.test.jsx`,
        `${baseName}.spec.js`,
        `${baseName}.spec.jsx`,
        `__tests__/${baseName}.test.js`,
        `__tests__/${baseName}.spec.js`
      ];
    }
  },
  
  // Jest specific configuration
  jest: {
    testEnvironment: 'jsdom',
    setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
    collectCoverageFrom: [
      'src/**/*.{js,jsx}',
      '!src/index.js',
      '!src/serviceWorker.js',
      '!src/**/*.test.{js,jsx}',
      '!src/**/*.spec.{js,jsx}'
    ]
  },
  
  // Validation messages
  messages: {
    noTestFound: 'No test file found. Please write a failing test first before implementing.',
    testNotFailing: 'Test must fail first. This ensures the test is actually testing something.',
    coverageTooLow: 'Test coverage is below 80%. Please add more tests.',
    implementationWithoutTest: 'Implementation detected without a corresponding test. Follow TDD: Red → Green → Refactor.'
  }
};