/**
 * TDD Guard Root Configuration for Admin3 Project
 * Orchestrates TDD enforcement across Django backend and React frontend
 * Strict enforcement as per https://github.com/nizos/tdd-guard/blob/main/docs/enforcement.md
 */

module.exports = {
  // Global TDD enforcement - STRICT MODE
  enabled: true,
  strictMode: true,
  
  // Project structure configuration
  projects: {
    backend: {
      name: 'Django Backend',
      workingDir: 'backend/django_Admin3',
      configFile: 'backend/django_Admin3/tdd-guard.config.js',
      language: 'python',
      testFramework: 'django',
      testCommand: 'python manage.py test --verbosity=2',
      testPattern: '**/test*.py',
      srcPattern: '**/*.py',
      coverageCommand: 'coverage run --source="." manage.py test && coverage report',
      minCoverage: 80,
      enforceTestFirst: true
    },
    frontend: {
      name: 'React Frontend',
      workingDir: 'frontend/react-Admin3',
      configFile: 'frontend/react-Admin3/tdd-guard.config.js',
      language: 'javascript',
      testFramework: 'jest',
      testCommand: 'npm test -- --watchAll=false --passWithNoTests',
      testPattern: '**/*.{test,spec}.{js,jsx,ts,tsx}',
      srcPattern: 'src/**/*.{js,jsx,ts,tsx}',
      coverageCommand: 'npm test -- --coverage --watchAll=false',
      minCoverage: 80,
      enforceTestFirst: true
    }
  },

  // STRICT TDD enforcement rules
  rules: {
    enforceTestFirst: true,
    blockWithoutFailingTests: true,
    requireFailingTestBeforeImplementation: true,
    enforceMinimalImplementation: true,
    enforceRefactorStep: true,
    requireCoverageIncrease: true,
    preventTestSkipping: true,
    blockDirectFileModification: true
  },

  // Security enforcement (from enforcement.md)
  security: {
    // Prevent bypassing via shell commands
    blockShellBypass: [
      'echo *',
      'printf *',
      'sed *',
      'awk *',
      'perl *',
      'cat > *',
      'tee *'
    ],
    // Protect guard configuration
    protectConfig: true,
    configReadOnly: true
  },

  // File patterns to ignore
  ignorePatterns: [
    '**/migrations/**',
    '**/*.config.js',
    '**/setup_*.py',
    '**/manage.py',
    '**/settings/**',
    '**/node_modules/**',
    '**/.venv/**',
    '**/venv/**',
    '**/dist/**',
    '**/build/**',
    '**/__pycache__/**',
    '**/coverage/**',
    '**/.coverage'
  ],

  // Test discovery and mapping
  testDiscovery: {
    backend: {
      testFilePattern: (srcFile) => {
        const pathParts = srcFile.split('/');
        const fileName = pathParts[pathParts.length - 1];
        const moduleName = fileName.replace('.py', '');
        const appPath = pathParts.slice(0, -1).join('/');
        
        return [
          `${appPath}/tests/test_${moduleName}.py`,
          `${appPath}/test_${moduleName}.py`,
          `${appPath}/tests.py`
        ];
      },
      requireTestBeforeImplementation: true
    },
    frontend: {
      testFilePattern: (srcFile) => {
        const baseName = srcFile.replace(/\.(jsx?|tsx?)$/, '');
        return [
          `${baseName}.test.js`,
          `${baseName}.test.jsx`,
          `${baseName}.spec.js`,
          `${baseName}.spec.jsx`
        ];
      },
      requireTestBeforeImplementation: true
    }
  },

  // Integration with Claude Code
  claude: {
    // Enhanced todo tracking with TDD stages
    enhanceTodoTracking: true,
    tddStageTracking: true,
    trackStages: ['RED', 'GREEN', 'REFACTOR'],
    
    // Automatic test execution
    autoRunTests: true,
    runTestsBeforeImplementation: true,
    runTestsAfterImplementation: true,
    
    // Strict blocking rules
    blockImplementationWithoutTests: true,
    blockCommitWithoutTests: true,
    blockPushWithoutCoverage: true,
    
    // Validation messages
    messages: {
      noTest: '❌ TDD Violation: No test found. Write a failing test first.',
      testPassing: '❌ TDD Violation: Test is already passing. Test must fail first.',
      noImplementation: '✅ Good! Now implement the minimal code to make the test pass.',
      implementationWithoutTest: '❌ TDD Violation: Cannot write implementation without a failing test.',
      refactorTime: '✅ Tests passing! Time to refactor if needed.',
      coverageLow: '⚠️ Warning: Test coverage below 80%. Add more tests.'
    }
  },

  // Hook configuration
  hooks: {
    preWrite: 'tdd-guard validate --strict',
    preEdit: 'tdd-guard validate --strict',
    preMultiEdit: 'tdd-guard validate --strict',
    preTodoWrite: 'tdd-guard track-stage',
    postTest: 'tdd-guard check-coverage'
  },

  // Reporting
  reporting: {
    showCoverage: true,
    showTestStatus: true,
    trackTddCycles: true,
    logViolations: true,
    outputFile: '.tdd-guard-report.json'
  },

  // Debugging and logging
  debug: process.env.TDD_GUARD_DEBUG === 'true',
  logLevel: 'info',
  logFile: '.tdd-guard.log'
};