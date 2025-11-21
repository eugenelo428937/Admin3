# Phase 0: Research & Decisions

**Feature**: Comprehensive Test Suite Coverage for Django Backend Apps
**Date**: 2025-11-21
**Status**: Complete ✅

## Executive Summary

This document captures all research findings and technical decisions for implementing test suites across 11 Django backend apps. Research focused on analyzing existing test patterns from well-tested apps (cart, rules_engine, utils) and establishing standards for apps requiring test coverage.

## Research Tasks Completed

### 1. Existing Test Pattern Analysis

**Apps Analyzed**:
- **cart app** (26 test files) - Comprehensive VAT testing, model validation, API endpoints
- **rules_engine app** (40+ test files) - Complex business logic, entry points, integration tests
- **utils app** (11 test files) - Service layer testing, external API mocking, performance tests

**Key Patterns Identified**:

#### Test File Organization
```
app_name/tests/
├── __init__.py
├── test_models.py       # Django model tests
├── test_views.py        # DRF API endpoint tests
├── test_serializers.py  # DRF serializer tests
└── test_services.py     # Service layer tests
```

#### Test Class Structure (from cart/tests/test_models.py)
```python
from django.test import TestCase
from django.contrib.auth import get_user_model

class CartItemVATFieldsTestCase(TestCase):
    """Test CartItem VAT field validations and constraints"""

    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='test_user',
            email='test@test.com',
            password='testpass123'
        )
        self.cart = Cart.objects.create(user=self.user)

    def test_cartitem_vat_fields_nullable(self):
        """Test that all VAT fields are nullable and can be None"""
        # Test implementation
```

#### API Test Structure (from cart/tests/test_api_endpoints.py)
```python
from rest_framework.test import APITestCase
from rest_framework import status

class CartAPITestCase(APITestCase):
    """Test Cart API endpoints"""

    def setUp(self):
        """Set up test client and authentication"""
        self.user = User.objects.create_user(...)
        self.client.force_authenticate(user=self.user)

    def test_get_cart_authenticated(self):
        """Test authenticated user can retrieve their cart"""
        response = self.client.get('/api/cart/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
```

### 2. App Type Categorization

**Model-Only Apps** (5 apps):
- address_analytics (AddressLookupLog model)
- address_cache (cache models)
- students (Student model)
- exam_sessions_subjects (relationship models)
- marking_vouchers (voucher models)

**Test Requirements**: test_models.py only
**Complexity**: Low (simple model validation tests)

**Model + View Apps** (5 apps):
- exam_sessions (exam session management)
- marking (marking workflow)
- tutorials (tutorial scheduling)
- userprofile (profile management)
- users (user account management)

**Test Requirements**: test_models.py + test_views.py
**Complexity**: Medium (model + API endpoint tests)

**Authentication App** (1 app):
- core_auth (JWT authentication)

**Test Requirements**: test_views.py + test_authentication.py
**Complexity**: High (JWT token testing, auth flow validation)

### 3. External Dependency Mocking Research

**Finding**: Administrate GraphQL API Integration

**Apps Using External API**:
- tutorials (fetches event data from Administrate)
- students (syncs student data with Administrate)

**Mocking Strategy** (from administrate/tests/test_graphql_client.py):
```python
from unittest.mock import patch, MagicMock

class AdministrateGraphQLTestCase(TestCase):
    @patch('administrate.services.graphql_client.GraphQLClient.execute_query')
    def test_fetch_event_data(self, mock_execute_query):
        """Test GraphQL API call is properly mocked"""
        mock_execute_query.return_value = {
            'data': {
                'events': [{'id': '123', 'name': 'Test Event'}]
            }
        }
        # Test implementation
```

**Decision**: Use unittest.mock.patch for external API calls

### 4. Test Data Fixture Strategy

**Options Evaluated**:

1. **Django Fixtures (JSON/YAML)**
   - ✅ Pros: Reusable across tests, easy to share
   - ❌ Cons: Hard to maintain, brittle with schema changes
   - **Verdict**: Not recommended for new tests

2. **Factory Boy**
   - ✅ Pros: Flexible, generates realistic data
   - ❌ Cons: Additional dependency, learning curve
   - **Verdict**: Overkill for simple model tests

3. **In-test Object Creation** ⭐ SELECTED
   - ✅ Pros: Explicit, visible, easy to customize
   - ✅ Pros: Matches existing pattern in cart/utils
   - ✅ Pros: No external dependencies
   - **Verdict**: Best fit for this project

**Example Pattern** (from utils/tests/test_models.py):
```python
def setUp(self):
    """Set up test data"""
    self.region = UtilsRegion.objects.create(
        code='TEST1',
        name='Test Region 1',
        description='Test VAT region'
    )
    self.country = UtilsCountrys.objects.create(
        code='GB',
        name='United Kingdom'
    )
```

## Technical Decisions

### Decision 1: Test Framework

**Chosen**: Django unittest (django.test.TestCase, APITestCase)

**Rationale**:
- ✅ Already in use across cart, rules_engine, utils apps
- ✅ Built-in database transaction management (automatic rollback)
- ✅ No additional dependencies required
- ✅ Excellent integration with Django ORM
- ✅ Team familiarity

**Alternatives Considered**:
- **pytest-django**: More features (fixtures, parametrize), but:
  - ❌ Requires additional dependency (pytest, pytest-django)
  - ❌ Configuration migration needed (pytest.ini)
  - ❌ Inconsistent with existing test suite
  - ❌ Learning curve for team

**Evidence**: All 96 existing tests use Django unittest framework successfully

---

### Decision 2: Test Organization

**Chosen**: Component-based test files (test_models.py, test_views.py, test_serializers.py)

**Rationale**:
- ✅ Clear separation of concerns (models vs views vs serializers)
- ✅ Matches existing pattern in cart (26 files) and rules_engine (40+ files)
- ✅ Easy to locate tests for specific components
- ✅ Supports parallel test execution (Django test runner can parallelize by file)
- ✅ Prevents test files from becoming too large

**File Naming Convention**:
- `test_models.py` - Model field validation, constraints, relationships
- `test_views.py` - API endpoint tests (GET, POST, PUT, DELETE)
- `test_serializers.py` - Serializer validation, field mapping
- `test_services.py` - Business logic service layer tests
- `test_authentication.py` - Authentication/authorization tests

**Alternatives Considered**:
- **Single tests.py file**: Too large for apps with multiple components
- **Feature-based files** (test_user_registration.py): Harder to locate specific component tests

---

### Decision 3: External API Mocking

**Chosen**: unittest.mock for external API calls, Django force_authenticate for auth

**Rationale**:
- ✅ Standard Python library (no external dependencies)
- ✅ Existing tests use this pattern (administrate/tests/test_graphql_client.py)
- ✅ Simple patch decorator syntax
- ✅ Works seamlessly with Django test framework

**Mocking Patterns**:

1. **GraphQL API Mocking** (for tutorials, students apps):
```python
from unittest.mock import patch

@patch('administrate.services.graphql_client.GraphQLClient.execute_query')
def test_fetch_event_data(self, mock_execute_query):
    mock_execute_query.return_value = {'data': {'events': [...]}}
```

2. **Authentication Mocking** (for all view tests):
```python
from rest_framework.test import APITestCase

class ViewTestCase(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(...)
        self.client.force_authenticate(user=self.user)
```

**Alternatives Considered**:
- **responses library**: HTTP mocking library
  - ❌ Additional dependency
  - ❌ Overkill for simple GraphQL client mocking
- **VCR.py**: Records HTTP interactions
  - ❌ Additional dependency
  - ❌ Adds complexity with cassette management

---

### Decision 4: Test Data Strategy

**Chosen**: In-test object creation via Django ORM (setUp method)

**Rationale**:
- ✅ Explicit test data visible in test code
- ✅ Easy to customize per test method
- ✅ Matches existing pattern in cart and utils apps
- ✅ No maintenance overhead (data defined with code)
- ✅ Test isolation (each test creates its own data)

**Standard setUp Pattern**:
```python
def setUp(self):
    """Set up test data - runs before each test"""
    # Create test user (required by most apps)
    self.user = User.objects.create_user(
        username='test_user',
        email='test@test.com',
        password='testpass123'
    )

    # Create app-specific test data
    self.student = Student.objects.create(
        user=self.user,
        student_type='S',
        apprentice_type='none'
    )
```

**Alternatives Considered**:
- **Django Fixtures** (JSON/YAML files):
  - ❌ Hard to maintain when models change
  - ❌ Less flexible (can't easily vary data per test)
  - ❌ Hidden data (not visible in test code)
- **Factory Boy**:
  - ❌ Additional dependency
  - ❌ Learning curve
  - ❌ Existing tests don't use it (consistency)

---

### Decision 5: Coverage Measurement

**Chosen**: coverage.py with Django test runner integration

**Rationale**:
- ✅ Industry standard Python coverage tool
- ✅ Excellent Django integration
- ✅ HTML report generation for detailed analysis
- ✅ CI/CD integration support

**Usage Commands**:
```bash
# Run tests with coverage
coverage run --source='.' manage.py test app_name

# Generate terminal report
coverage report

# Generate HTML report
coverage html  # Output to htmlcov/
```

**Coverage Thresholds**:
- Minimum 80% per app (enforced)
- 100% for critical business logic (auth, payments, exam sessions)

**Alternatives Considered**:
- **pytest-cov**: Requires pytest migration (rejected in Decision 1)

---

### Decision 6: Test Naming Conventions

**Chosen**: Descriptive method names following pattern: `test_<behavior>_<expected_outcome>`

**Rationale**:
- ✅ Self-documenting (test name explains what's being tested)
- ✅ Matches existing pattern in cart and rules_engine tests
- ✅ Easy to identify failing tests from test runner output

**Examples**:
```python
# Good: Descriptive, clear intent
def test_student_creation_with_required_fields(self):
def test_student_type_choices_validation(self):
def test_student_user_relationship_uniqueness(self):

# Bad: Vague, unclear intent
def test_student(self):
def test_creation(self):
def test_1(self):
```

**Pattern Breakdown**:
- `test_` - Required prefix for Django test discovery
- `<model/view/component>_` - What's being tested
- `<behavior>` - What action or condition
- `<expected_outcome>` - What should happen

---

## App-Specific Research

### address_analytics App

**Models**: AddressLookupLog
**Key Tests Required**:
- Field validations (postcode max_length, api_provider choices)
- Boolean field defaults (cache_hit, success)
- Index creation (composite index on lookup_timestamp + api_provider)
- __str__ method formatting

**Estimated Tests**: 8-10 test methods

---

### students App

**Models**: Student
**Key Tests Required**:
- OneToOne relationship with User (uniqueness constraint)
- Choice field validation (student_type: S/Q/I, apprentice_type: none/L4/L7)
- Auto timestamp fields (create_date, modified_date)
- __str__ method with user full name

**Estimated Tests**: 10-12 test methods

---

### core_auth App

**Views**: JWT authentication endpoints
**Key Tests Required**:
- Token generation (login endpoint)
- Token validation (protected endpoints)
- Token refresh workflow
- Invalid credentials handling
- Token expiration

**Estimated Tests**: 12-15 test methods
**Complexity**: High (requires JWT token manipulation)

---

### tutorials App

**Models**: TutorialEvent, TutorialSession (needs exploration)
**Views**: Tutorial scheduling APIs
**External Dependencies**: Administrate GraphQL API
**Key Tests Required**:
- Model relationships and validations
- API endpoint authentication/authorization
- GraphQL API mocking for event data sync

**Estimated Tests**: 15-20 test methods

---

## Performance Considerations

**Current Baseline** (from existing tests):
- cart app (26 test files): ~45 seconds execution time
- rules_engine app (40+ test files): ~60 seconds execution time
- utils app (11 test files): ~20 seconds execution time

**Target for New Tests**:
- All 11 apps combined: < 3 minutes execution time
- Per-app average: < 15 seconds

**Optimization Strategies**:
- Use Django TestCase (transaction rollback) instead of TransactionTestCase
- Minimize database queries in setUp methods
- Mock external API calls (no network I/O)
- Use Django's --parallel flag for multi-core test execution

---

## Risk Assessment

### Low Risk Areas
- ✅ Model-only apps (address_analytics, students): Simple validation tests
- ✅ Existing test patterns well-established
- ✅ No new dependencies required

### Medium Risk Areas
- ⚠️ Apps with external API dependencies (tutorials, students): Mocking complexity
- ⚠️ Coverage threshold achievement: May require code refactoring

### High Risk Areas
- 🔴 core_auth app: JWT authentication testing requires deep understanding
- 🔴 Test execution time: May exceed 5-minute target without optimization

**Mitigation Strategies**:
- Start with low-risk apps to establish patterns
- Research JWT testing best practices for core_auth
- Profile test execution time early and optimize

---

## Conclusion

All research tasks complete. Key decisions made:
- ✅ Use Django unittest framework (existing standard)
- ✅ Organize tests by component (test_models.py, test_views.py)
- ✅ Mock external APIs with unittest.mock
- ✅ Create test data in setUp methods (no fixtures)
- ✅ Use coverage.py for coverage measurement
- ✅ Follow descriptive naming conventions

**Next Phase**: Phase 1 - Design & Contracts (create test contracts, data models, quickstart guide)
