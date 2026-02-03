# TDD Guard Enforcement Configuration

## Overview
This project has been configured with **strict TDD (Test-Driven Development) enforcement** using `tdd-guard`. All code changes must follow the Red-Green-Refactor cycle.

## Configuration Files

### Root Configuration
- **`tdd-guard.config.js`**: Main orchestrator for both backend and frontend
- **`.claude/settings.json`**: Claude Code hooks for TDD enforcement
- **`.claude/settings.local.json`**: Additional local TDD hooks

### Backend (Django)
- **`backend/django_Admin3/tdd-guard.config.js`**: Django-specific TDD configuration
- **`backend/django_Admin3/pyproject.toml`**: Python/pytest TDD settings
- **Test Framework**: Django TestCase / APITestCase
- **Coverage Requirement**: 80% minimum

### Frontend (React)
- **`frontend/react-Admin3/tdd-guard.config.js`**: Jest-specific TDD configuration
- **`frontend/react-Admin3/package.json`**: Contains `tdd-guard-jest` dependency
- **Test Framework**: Jest with React Testing Library
- **Coverage Requirement**: 80% minimum

## TDD Workflow Enforcement

### 1. RED Phase (Write Failing Test)
- **Requirement**: Must write a failing test before any implementation
- **Enforcement**: Hooks block Write/Edit/MultiEdit operations without a failing test
- **Test Location**:
  - Backend: `apps/{app}/tests/test_{module}.py`
  - Frontend: `src/components/__tests__/{Component}.test.js`

### 2. GREEN Phase (Minimal Implementation)
- **Requirement**: Write only enough code to make the test pass
- **Enforcement**: Coverage checks ensure minimal implementation
- **No Test Modifications**: Cannot modify tests during this phase

### 3. REFACTOR Phase (Improve Code)
- **Requirement**: Refactor while keeping all tests green
- **Enforcement**: Continuous test execution ensures no regressions
- **Coverage Must Increase**: Refactoring should maintain or improve coverage

## Claude Code Hook Integration

### PreToolUse Hooks
Triggered before Write/Edit/MultiEdit operations:
```javascript
{
  "matcher": "Write|Edit|MultiEdit",
  "command": "tdd-guard validate --strict"
}
```

### PostToolUse Hooks
Triggered after code modifications:
```javascript
{
  "matcher": "Write|Edit|MultiEdit",
  "command": "tdd-guard check-coverage"
}
```

## Security & Bypass Prevention

### Protected Patterns
The following operations are blocked to prevent TDD bypass:
- Direct shell file modifications (`echo`, `printf`, `sed`, `awk`, `perl`)
- Modification of TDD configuration files
- Access to `.claude/tdd-guard/` directory

### Enforcement Rules
```javascript
rules: {
  enforceTestFirst: true,
  blockWithoutFailingTests: true,
  requireFailingTestBeforeImplementation: true,
  enforceMinimalImplementation: true,
  requireCoverageIncrease: true,
  preventTestSkipping: true,
  blockDirectFileModification: true
}
```

## Running Tests

### Backend (Django)
```bash
# Navigate to backend
cd backend/django_Admin3

# Activate virtual environment
.\.venv\Scripts\activate

# Run all tests
python manage.py test

# Run with coverage
coverage run --source="." manage.py test
coverage report
```

### Frontend (React)
```bash
# Navigate to frontend
cd frontend/react-Admin3

# Run tests in watch mode
npm test

# Run with coverage
npm test -- --coverage --watchAll=false
```

## Verification Script
Run the verification script to check TDD configuration:
```bash
node test-tdd-guard.js
```

## Common TDD Violations & Solutions

### Violation: Writing implementation without test
**Error**: "❌ TDD Violation: No test found. Write a failing test first."
**Solution**: Create a test file with a failing test before implementing

### Violation: Test already passing
**Error**: "❌ TDD Violation: Test is already passing. Test must fail first."
**Solution**: Ensure your test actually tests new functionality and fails initially

### Violation: Coverage below threshold
**Error**: "⚠️ Warning: Test coverage below 80%. Add more tests."
**Solution**: Add more test cases to cover edge cases and error conditions

## Ignored Patterns
The following files are excluded from TDD enforcement:
- Migration files (`**/migrations/**`)
- Configuration files (`**/*.config.js`)
- Setup scripts (`**/setup_*.py`)
- Django management files (`manage.py`)
- Settings files (`**/settings/**`)
- Build/distribution directories

## TodoWrite Integration
When using TodoWrite for task tracking, include TDD stage:
```javascript
{
  content: "Implement user authentication",
  status: "in_progress",
  tddStage: "RED" // or "GREEN" or "REFACTOR"
}
```

## Troubleshooting

### Hook Not Triggering
1. Check `.claude/settings.json` and `.claude/settings.local.json` exist
2. Verify hooks are not disabled in settings
3. Restart Claude Code session

### Tests Not Found
1. Ensure test files follow naming conventions
2. Check test discovery patterns in config files
3. Verify test framework is properly installed

### Coverage Reports Missing
1. Install coverage tools:
   - Backend: `pip install coverage`
   - Frontend: Included with Jest
2. Run coverage commands as shown above

## Best Practices

1. **Write One Test at a Time**: Focus on a single behavior per test
2. **Keep Tests Simple**: Test one thing per test case
3. **Use Descriptive Names**: Test names should explain what they test
4. **Test Behavior, Not Implementation**: Focus on what, not how
5. **Maintain Test Independence**: Tests should not depend on each other
6. **Regular Refactoring**: Use the refactor phase to improve both tests and code

## References
- [TDD Guard Documentation](https://github.com/nizos/tdd-guard)
- [TDD Guard Enforcement Guide](https://github.com/nizos/tdd-guard/blob/main/docs/enforcement.md)
- [Django Testing Documentation](https://docs.djangoproject.com/en/stable/topics/testing/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)