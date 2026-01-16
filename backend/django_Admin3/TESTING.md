# Testing Guide - Admin3 Backend

## Overview

This guide provides comprehensive instructions for running and maintaining the test suite for the Django Admin3 backend application.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Test Structure](#test-structure)
3. [Running Tests](#running-tests)
4. [Coverage Reports](#coverage-reports)
5. [Writing Tests](#writing-tests)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)

## Quick Start

### Run All Tests
```bash
cd backend/django_Admin3
python manage.py test --keepdb
```

### Run Tests for Specific App
```bash
python manage.py test <app_name>.tests --keepdb -v 2
```

### Run with Coverage
```bash
coverage run --source='.' manage.py test --keepdb
coverage report
coverage html
```

## Test Structure

### Directory Organization

```
backend/django_Admin3/
├── exam_sessions/
│   └── tests/
│       ├── __init__.py
│       ├── test_models.py     # 21 model tests
│       └── test_views.py      # 17 API tests
├── marking/
│   └── tests/
│       ├── __init__.py
│       ├── test_models.py     # 16 model tests
│       └── test_views.py      # 18 API tests
├── tutorials/
│   └── tests/
│       ├── __init__.py
│       ├── test_models.py     # 24 model tests
│       └── test_views.py      # 18 API tests
├── userprofile/
│   └── tests/
│       ├── __init__.py
│       └── test_models.py     # 41 model tests
├── users/
│   └── tests/
│       ├── __init__.py
│       └── test_views.py      # 19 API tests
└── core_auth/
    └── tests/
        ├── __init__.py
        └── test_auth_views.py # 33 auth tests
```

### Test Categories

1. **Model Tests** - Test database models, relationships, validation
2. **API Tests** - Test REST API endpoints, serializers, permissions
3. **Authentication Tests** - Test login, registration, password reset, etc.

## Running Tests

### Basic Commands

```bash
# Run all tests
python manage.py test

# Run with database persistence (faster for repeated runs)
python manage.py test --keepdb

# Run with verbose output
python manage.py test --keepdb -v 2

# Run specific app tests
python manage.py test exam_sessions.tests --keepdb

# Run specific test class
python manage.py test exam_sessions.tests.test_models.ExamSessionModelTestCase --keepdb

# Run specific test method
python manage.py test exam_sessions.tests.test_models.ExamSessionModelTestCase.test_create_exam_session --keepdb
```

### Running Multiple Apps

```bash
# Run tests for multiple apps
python manage.py test exam_sessions.tests marking.tests tutorials.tests --keepdb
```

### Parallel Testing (Faster)

```bash
# Run tests in parallel (use number of CPU cores)
python manage.py test --parallel --keepdb
```

## Coverage Reports

### Generate Coverage Report

```bash
# Run tests with coverage
coverage run --source='exam_sessions,marking,tutorials,userprofile,users,core_auth' manage.py test exam_sessions.tests marking.tests tutorials.tests userprofile.tests users.tests core_auth.tests --keepdb

# View coverage in terminal
coverage report --omit="*/migrations/*,*/tests/*,*/test_*.py"

# Generate HTML report
coverage html --omit="*/migrations/*,*/tests/*,*/test_*.py" -d coverage_html

# Open HTML report (Windows)
start coverage_html/index.html
```

### Coverage Targets

- **Minimum:** 70% coverage
- **Target:** 80% coverage
- **Excellent:** 90%+ coverage

**Current Coverage:** 73%

## Writing Tests

### Test File Template

```python
"""
Test suite for <app_name> <component>.

This module tests <what is being tested>.
"""

from django.test import TestCase
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from unittest.mock import patch, MagicMock

from <app>.models import <Model>


class <Model>ModelTestCase(TestCase):
    """Test cases for <Model> model."""

    def setUp(self):
        """Set up test fixtures."""
        # Create test data
        pass

    def test_<functionality>(self):
        """Test <specific functionality>."""
        # Arrange
        # Act
        # Assert
        pass


class <Model>APITestCase(APITestCase):
    """Test cases for <Model> API endpoints."""

    def setUp(self):
        """Set up test fixtures."""
        self.client = APIClient()
        # Create test data
        pass

    def test_<endpoint>_<scenario>(self):
        """Test <endpoint> with <scenario>."""
        # Arrange
        # Act
        response = self.client.get('/api/<endpoint>/')

        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        pass
```

### Naming Conventions

**Test Files:**
- `test_models.py` - Model tests
- `test_views.py` - View/API tests
- `test_serializers.py` - Serializer tests
- `test_<component>.py` - Component-specific tests

**Test Classes:**
- `<Model>ModelTestCase` - Model tests
- `<Model>APITestCase` - API tests
- `<Feature>TestCase` - Feature-specific tests

**Test Methods:**
- `test_<action>_<scenario>` - Descriptive test names
- Examples:
  - `test_create_exam_session`
  - `test_login_with_invalid_credentials`
  - `test_delete_requires_authentication`

### Test Patterns

#### 1. Model Tests

```python
def test_create_model_instance(self):
    """Test creating a model instance."""
    instance = MyModel.objects.create(
        field1='value1',
        field2='value2'
    )

    self.assertEqual(instance.field1, 'value1')
    self.assertIsNotNone(instance.id)
```

#### 2. API Tests

```python
def test_api_endpoint_get(self):
    """Test GET /api/endpoint/."""
    response = self.client.get('/api/endpoint/')

    self.assertEqual(response.status_code, status.HTTP_200_OK)
    self.assertIn('results', response.data)
```

#### 3. Authentication Tests

```python
def test_endpoint_requires_authentication(self):
    """Test endpoint requires authentication."""
    response = self.client.get('/api/protected/')

    self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
```

#### 4. Mocking External Services

```python
@patch('app.views.external_service.call')
def test_with_mocked_service(self, mock_call):
    """Test with mocked external service."""
    mock_call.return_value = {'success': True}

    response = self.client.post('/api/endpoint/', data={})

    self.assertEqual(response.status_code, status.HTTP_200_OK)
    mock_call.assert_called_once()
```

## Best Practices

### 1. Test Isolation
- Each test should be independent
- Use `setUp()` to create fresh test data
- Don't rely on test execution order

### 2. Use `--keepdb` for Development
- Speeds up test runs by reusing test database
- Automatically drops on schema changes

### 3. Mock External Services
- Always mock email services
- Mock API calls to external services
- Mock file I/O operations

### 4. Test Both Success and Failure Cases
```python
def test_success_case(self):
    """Test successful operation."""
    pass

def test_failure_case(self):
    """Test operation with invalid data."""
    pass
```

### 5. Use Descriptive Test Names
```python
# Good ✅
def test_login_with_invalid_password_returns_401(self):
    pass

# Bad ❌
def test_login(self):
    pass
```

### 6. Keep Tests Focused
- Test one thing per test method
- Use multiple test methods instead of one large test

### 7. Use Test Fixtures Wisely
```python
def setUp(self):
    """Set up common test data."""
    self.user = User.objects.create_user(
        username='testuser',
        password='testpass123'
    )
```

## Test Data Management

### Using Fixtures
```python
# Load fixtures
class MyTestCase(TestCase):
    fixtures = ['users.json', 'products.json']
```

### Creating Test Data in setUp
```python
def setUp(self):
    """Create test data."""
    self.exam_session = ExamSession.objects.create(
        session_code='TEST2025',
        start_date=timezone.now()
    )
```

### Using Factories (Future Enhancement)
```python
# Consider using factory_boy for complex test data
from factory import Factory, Faker

class UserFactory(Factory):
    class Meta:
        model = User

    username = Faker('user_name')
    email = Faker('email')
```

## Troubleshooting

### Common Issues

#### 1. Database Already Exists
```bash
# Error: database "test_ACTEDDBDEV01" already exists

# Solution: Use --keepdb or manually delete
python manage.py test --keepdb
```

#### 2. Permission Errors
```bash
# Error: permission denied

# Solution: Ensure test user has proper permissions
self.client.force_authenticate(user=self.user)
```

#### 3. Signal-Related Issues
```python
# Issue: UserProfile auto-created by signal causes unique constraint

# Solution: Use auto-created profile
profile = self.user.userprofile  # Don't create manually
```

#### 4. Slow Tests
```bash
# Solution: Use --keepdb and --parallel
python manage.py test --keepdb --parallel
```

#### 5. Import Errors
```python
# Issue: Circular imports

# Solution: Import inside methods, not at module level
def test_something(self):
    from app.models import Model
    # Use Model here
```

## Continuous Integration

### GitHub Actions Example
```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-python@v2
        with:
          python-version: '3.14'

      - name: Install dependencies
        run: pip install -r requirements.txt

      - name: Run tests
        run: |
          cd backend/django_Admin3
          python manage.py test --keepdb

      - name: Generate coverage
        run: |
          coverage run manage.py test
          coverage report
          coverage html

      - name: Upload coverage
        uses: codecov/codecov-action@v2
```

## Test Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Total Tests | 207 | 250+ |
| Coverage | 73% | 80% |
| Avg Execution Time | 78.6s | <60s |
| Pass Rate | 100% | 100% |

## Resources

- [Django Testing Documentation](https://docs.djangoproject.com/en/5.1/topics/testing/)
- [DRF Testing Documentation](https://www.django-rest-framework.org/api-guide/testing/)
- [Coverage.py Documentation](https://coverage.readthedocs.io/)
- [Python unittest Documentation](https://docs.python.org/3/library/unittest.html)

## Contributing

When adding new features:
1. Write tests FIRST (TDD approach)
2. Ensure tests pass
3. Maintain or improve coverage
4. Update this documentation if needed

## Contact

For questions about the test suite, contact the development team.

---

**Last Updated:** 2025-11-21
**Test Suite Version:** 1.0
**Coverage:** 73%
