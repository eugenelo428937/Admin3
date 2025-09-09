/**
 * TDD Guard Configuration for Django Backend
 * Enforces strict test-driven development practices
 */

module.exports = {
  // TDD enforcement settings
  enabled: true,
  testFramework: 'django',
  testCommand: 'python manage.py test --verbosity=2',
  testFilePattern: '**/test*.py',
  sourceFilePattern: '**/*.py',
  
  // Coverage requirements
  minCoverage: 80,
  coverageCommand: 'coverage run --source="." manage.py test && coverage report',
  
  // Enforcement rules
  enforceTestFirst: true,
  blockImplementationWithoutTests: true,
  requireFailingTestBeforeImplementation: true,
  
  // Files to ignore
  ignorePatterns: [
    '**/migrations/**',
    '**/settings/**',
    'manage.py',
    '**/__pycache__/**',
    '**/.venv/**',
    '**/venv/**',
    '**/tests/**',
    '**/test_*.py',
    '**/admin.py',
    '**/apps.py',
    '**/__init__.py'
  ],
  
  // Test mapping for Django apps
  testMapping: {
    pattern: (sourceFile) => {
      // Extract app name and module name from path
      const pathParts = sourceFile.split('/');
      const fileName = pathParts[pathParts.length - 1];
      const moduleName = fileName.replace('.py', '');
      
      // Look for tests in multiple possible locations
      const appPath = pathParts.slice(0, -1).join('/');
      
      return [
        `${appPath}/tests/test_${moduleName}.py`,
        `${appPath}/tests.py`,
        `${appPath}/test_${moduleName}.py`,
        `tests/test_${moduleName}.py`
      ];
    }
  },
  
  // Django specific settings
  django: {
    settingsModule: 'django_Admin3.settings',
    testRunner: 'django.test.runner.DiscoverRunner',
    testDatabase: {
      engine: 'django.db.backends.sqlite3',
      name: ':memory:'
    }
  },
  
  // Validation messages
  messages: {
    noTestFound: 'No Django test found. Write a failing test first (inherit from TestCase or APITestCase).',
    testNotFailing: 'Test must fail initially. This validates that your test actually tests the intended behavior.',
    coverageTooLow: 'Test coverage is below 80%. Please add more test cases.',
    implementationWithoutTest: 'Implementation without test detected. Follow TDD: Write failing test → Implement → Refactor.'
  },
  
  // Custom validation for Django models and views
  customValidations: {
    models: {
      requireTestForNewModel: true,
      requireTestForModelMethods: true
    },
    views: {
      requireTestForNewView: true,
      requireTestForViewMethods: true
    },
    serializers: {
      requireTestForNewSerializer: true,
      requireValidationTests: true
    }
  }
};