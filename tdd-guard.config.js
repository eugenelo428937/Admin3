/**
 * TDD Guard Configuration for Admin3 Project
 * Enforces test-driven development across Django backend and React frontend
 */

module.exports = {
  // Project structure configuration
  projects: {
    backend: {
      name: 'Django Backend',
      workingDir: 'backend/django_Admin3',
      language: 'python',
      testFramework: 'pytest',
      testCommand: 'python manage.py test',
      testPattern: '**/test_*.py',
      srcPattern: '**/!(test_|conftest)*.py',
      coverageCommand: 'python manage.py test --coverage',
      minCoverage: 80
    },
    frontend: {
      name: 'React Frontend',
      workingDir: 'frontend/react-Admin3',
      language: 'javascript',
      testFramework: 'jest',
      testCommand: 'npm test -- --watchAll=false',
      testPattern: '**/*.{test,spec}.{js,jsx}',
      srcPattern: '**/!(*.{test,spec}).{js,jsx}',
      coverageCommand: 'npm test -- --coverage --watchAll=false',
      minCoverage: 80
    }
  },

  // TDD enforcement rules
  rules: {
    enforceTestFirst: true,
    enforceMinimalImplementation: true,
    enforceRefactorStep: true,
    blockWithoutFailingTests: true,
    requireCoverageIncrease: true
  },

  // File patterns to ignore (configuration, migrations, etc.)
  ignorePatterns: [
    '**/migrations/**',
    '**/*.config.js',
    '**/setup_*.py',
    '**/manage.py',
    '**/settings/**',
    '**/node_modules/**',
    '**/.venv/**',
    '**/dist/**',
    '**/build/**'
  ],

  // Custom test discovery patterns
  testDiscovery: {
    backend: {
      // Map implementation files to test files
      testFilePattern: (srcFile) => {
        const relativePath = srcFile.replace('backend/django_Admin3/', '');
        const testPath = relativePath.replace(/\.py$/, '_test.py');
        return `backend/django_Admin3/tests/${testPath}`;
      }
    },
    frontend: {
      testFilePattern: (srcFile) => {
        const dir = srcFile.substring(0, srcFile.lastIndexOf('/'));
        const fileName = srcFile.substring(srcFile.lastIndexOf('/') + 1);
        const testName = fileName.replace(/\.(js|jsx)$/, '.test.$1');
        return `${dir}/__tests__/${testName}`;
      }
    }
  },

  // Integration with Claude Code agents
  claude: {
    enhanceTodoTracking: true,
    tddStageTracking: true,
    autoRunTests: true,
    blockImplementationWithoutTests: true
  },

  // Debugging and logging
  debug: process.env.NODE_ENV === 'development',
  logLevel: 'info'
};