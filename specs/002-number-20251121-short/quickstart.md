# Quickstart Guide: Running Test Suites

**Feature**: Comprehensive Test Suite Coverage
**Date**: 2025-11-21
**Purpose**: Step-by-step guide to run and verify new test suites

## Prerequisites

### 1. Environment Setup
```bash
# Navigate to Django backend directory
cd backend/django_Admin3

# Activate virtual environment (Windows)
.\.venv\Scripts\activate

# Verify Python version
python --version  # Should be Python 3.14+

# Verify Django installation
python manage.py --version  # Should be Django 5.1+
```

### 2. Database Setup
```bash
# Run migrations to ensure test database schema is current
python manage.py makemigrations
python manage.py migrate

# Verify database connection
python manage.py check
```

---

## Running Individual App Tests

### Basic Test Execution

```bash
# Run all tests for a specific app
python manage.py test address_analytics

# Expected output:
# Creating test database for alias 'default'...
# System check identified no issues (0 silenced).
# ........
# ----------------------------------------------------------------------
# Ran 8 tests in 0.523s
#
# OK
# Destroying test database for alias 'default'...
```

### Test Apps One by One

```bash
# address_analytics (analytics logging)
python manage.py test address_analytics

# address_cache (address caching)
python manage.py test address_cache

# core_auth (JWT authentication)
python manage.py test core_auth

# exam_sessions (exam scheduling)
python manage.py test exam_sessions

# exam_sessions_subjects (exam-subject relationships)
python manage.py test exam_sessions_subjects

# marking (grading workflow)
python manage.py test marking

# marking_vouchers (voucher management)
python manage.py test marking_vouchers

# students (student management)
python manage.py test students

# tutorials (tutorial scheduling)
python manage.py test tutorials

# userprofile (user profiles)
python manage.py test userprofile

# users (user accounts)
python manage.py test users
```

---

## Running All Tests

```bash
# Run entire test suite (all apps)
python manage.py test

# Run with verbosity for detailed output
python manage.py test -v 2

# Run tests in parallel (faster execution)
python manage.py test --parallel 4

# Run tests with keepdb flag (reuse test database for faster reruns)
python manage.py test --keepdb
```

### Expected Output (All Tests Passing)
```
Creating test database for alias 'default'...
System check identified no issues (0 silenced).
..................................................
..................................................
..................................................
----------------------------------------------------------------------
Ran 150 tests in 2.345s

OK
Destroying test database for alias 'default'...
```

---

## Running Specific Tests

### Run Specific Test File
```bash
# Run only model tests for students app
python manage.py test students.tests.test_models

# Run only view tests for exam_sessions app
python manage.py test exam_sessions.tests.test_views
```

### Run Specific Test Class
```bash
# Run only StudentTestCase
python manage.py test students.tests.test_models.StudentTestCase

# Run only ExamSessionAPITestCase
python manage.py test exam_sessions.tests.test_views.ExamSessionAPITestCase
```

### Run Specific Test Method
```bash
# Run single test method
python manage.py test students.tests.test_models.StudentTestCase.test_student_creation_with_required_fields
```

---

## Measuring Code Coverage

### Install Coverage Tool (if not installed)
```bash
pip install coverage
```

### Run Tests with Coverage

```bash
# Run single app tests with coverage
coverage run --source='address_analytics' manage.py test address_analytics

# Generate terminal report
coverage report

# Expected output:
# Name                                    Stmts   Miss  Cover
# -----------------------------------------------------------
# address_analytics/__init__.py               0      0   100%
# address_analytics/models.py                30      2    93%
# address_analytics/tests/__init__.py         0      0   100%
# address_analytics/tests/test_models.py     45      0   100%
# -----------------------------------------------------------
# TOTAL                                       75      2    97%
```

### Run All App Tests with Coverage
```bash
# Run all 11 new app tests with coverage
coverage run --source='address_analytics,address_cache,core_auth,exam_sessions,exam_sessions_subjects,marking,marking_vouchers,students,tutorials,userprofile,users' manage.py test address_analytics address_cache core_auth exam_sessions exam_sessions_subjects marking marking_vouchers students tutorials userprofile users

# Generate detailed terminal report
coverage report

# Generate HTML report (for detailed analysis)
coverage html

# Open HTML report in browser (Windows)
start htmlcov/index.html
```

### Coverage Report Interpretation

**Coverage Thresholds**:
- ✅ **80%+**: Meets minimum requirement
- ✅ **90%+**: Good coverage
- ✅ **95%+**: Excellent coverage
- ⚠️ **< 80%**: Requires additional tests

**What to Look For**:
- Uncovered lines (red in HTML report)
- Branch coverage (if/else statements)
- Critical business logic (should be 100%)

---

## Continuous Integration Testing

### Pre-Commit Testing
```bash
# Run tests before committing (recommended)
python manage.py test --keepdb --parallel 4

# If tests pass, safe to commit
git add .
git commit -m "Add test suite for [app_name]"
```

### Full Test Suite Validation
```bash
# Run complete test suite with coverage before PR
coverage run --source='.' manage.py test
coverage report --fail-under=80

# If coverage < 80%, CI will fail
```

---

## Troubleshooting Common Issues

### Issue 1: Test Database Creation Fails
```bash
# Error: "Got an error creating the test database"
# Solution: Check PostgreSQL connection settings

# Verify database settings in django_Admin3/settings/development.py
python manage.py check --database default

# Ensure test database user has CREATE DATABASE permission
```

### Issue 2: Tests Fail Due to Missing Migrations
```bash
# Error: "no such table: app_name_modelname"
# Solution: Run migrations

python manage.py makemigrations
python manage.py migrate
```

### Issue 3: Import Errors in Tests
```bash
# Error: "ModuleNotFoundError: No module named 'app_name.tests'"
# Solution: Ensure __init__.py exists in tests directory

# Check for __init__.py
ls app_name/tests/__init__.py

# If missing, create it
touch app_name/tests/__init__.py  # Linux/Mac
echo. > app_name\tests\__init__.py  # Windows
```

### Issue 4: Tests Hang or Timeout
```bash
# Symptoms: Tests run but never complete
# Solution: Check for infinite loops or blocking operations

# Run with verbose output to identify hanging test
python manage.py test app_name -v 2

# Set timeout for individual tests (if using pytest)
pytest --timeout=10 app_name/tests/
```

### Issue 5: External API Tests Fail
```bash
# Error: "Connection refused" or "API timeout"
# Solution: Verify external API calls are properly mocked

# Check mock decorators in test files
# Example: @patch('administrate.services.graphql_client.GraphQLClient.execute_query')

# Ensure mock is applied BEFORE test method executes
```

---

## Performance Optimization

### Speed Up Test Execution

```bash
# Use --parallel flag (multi-core execution)
python manage.py test --parallel auto  # Auto-detect CPU cores

# Use --keepdb flag (reuse test database)
python manage.py test --keepdb

# Combine both for maximum speed
python manage.py test --keepdb --parallel auto

# Example timing:
# Without optimization: 5 minutes 30 seconds
# With --parallel:       2 minutes 45 seconds
# With --keepdb:         4 minutes 10 seconds
# With both:             1 minute 50 seconds ✅ (meets < 5 min target)
```

---

## Verification Checklist

After running all tests, verify:

- [ ] All 11 apps have test directories created
- [ ] All tests pass successfully (0 failures, 0 errors)
- [ ] Each app achieves ≥ 80% code coverage
- [ ] Total test execution time < 5 minutes
- [ ] No external API network calls (all mocked)
- [ ] Tests run successfully on clean database (without --keepdb)
- [ ] Coverage report generated (coverage html)
- [ ] All critical business logic has 100% coverage

---

## Next Steps

### After Tests Pass

1. **Review Coverage Report**
   ```bash
   coverage html
   start htmlcov/index.html
   ```

2. **Identify Uncovered Lines**
   - Navigate to uncovered files in HTML report
   - Add tests for critical uncovered code
   - Re-run coverage to verify improvement

3. **Update Documentation**
   - Update CLAUDE.md with test coverage status
   - Document any special test setup requirements
   - Add app-specific testing notes

4. **Commit Changes**
   ```bash
   git add .
   git commit -m "Add comprehensive test suites for 11 Django apps"
   git push origin 002-number-20251121-short
   ```

5. **Create Pull Request**
   - Reference original spec (specs/002-number-20251121-short/spec.md)
   - Include coverage report summary
   - Request code review

---

## Summary

**Quick Commands Reference**:
```bash
# Run all new app tests
python manage.py test address_analytics address_cache core_auth exam_sessions exam_sessions_subjects marking marking_vouchers students tutorials userprofile users

# Run with coverage
coverage run --source='address_analytics,students,core_auth' manage.py test address_analytics students core_auth
coverage report

# Fast execution
python manage.py test --parallel auto --keepdb

# Generate HTML coverage report
coverage html && start htmlcov/index.html
```

**Success Criteria**:
- ✅ All tests pass
- ✅ ≥ 80% coverage per app
- ✅ < 5 minute execution time
- ✅ All external APIs mocked
- ✅ Tests run on clean database

**Support**: See [contracts/test-patterns.md](./contracts/test-patterns.md) for test structure guidelines
