# Test Patterns & Contracts

**Feature**: Comprehensive Test Suite Coverage
**Purpose**: Define standard test contracts for Django apps
**Date**: 2025-11-21

## Overview

This document defines standard test patterns (contracts) that all Django app test suites must follow. These patterns ensure consistency, maintainability, and comprehensive coverage across the Admin3 backend.

## Test File Organization

### Standard Structure
```
app_name/
├── models.py
├── views.py
├── serializers.py
├── services.py
└── tests/
    ├── __init__.py
    ├── test_models.py       # Model tests (always required if models exist)
    ├── test_views.py        # API endpoint tests (required if views exist)
    ├── test_serializers.py  # Serializer tests (required if serializers exist)
    └── test_services.py     # Service layer tests (required if services exist)
```

### Import Standards
```python
# Django test framework
from django.test import TestCase
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.contrib.auth import get_user_model

# Django REST Framework (for API tests)
from rest_framework.test import APITestCase
from rest_framework import status

# External mocking
from unittest.mock import patch, MagicMock

# App-specific imports
from app_name.models import ModelName
from app_name.serializers import ModelSerializer
```

---

## Contract 1: Model Tests (test_models.py)

### Purpose
Validate Django model behavior: field constraints, relationships, validations, and business logic methods.

### Standard Test Class
```python
from django.test import TestCase
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.contrib.auth import get_user_model

User = get_user_model()


class {ModelName}TestCase(TestCase):
    """
    Test cases for {ModelName} model.
    Following TDD RED-GREEN-REFACTOR methodology.
    """

    def setUp(self):
        """
        Set up test data - runs before each test method.
        Create minimal required objects for testing.
        """
        # Create test user (if model has user relationship)
        self.user = User.objects.create_user(
            username='test_user',
            email='test@example.com',
            password='testpass123'
        )

        # Create related objects required by this model
        # (e.g., foreign key dependencies)

    def test_model_creation_with_required_fields(self):
        """Test model creation with all required fields."""
        instance = {ModelName}.objects.create(
            # All required fields
        )

        # Assertions
        self.assertIsNotNone(instance.pk)
        self.assertEqual(instance.field_name, expected_value)

    def test_model_field_max_length_validation(self):
        """Test CharField/TextField max_length constraints."""
        with self.assertRaises(ValidationError):
            instance = {ModelName}(
                field_name='x' * (MAX_LENGTH + 1)
            )
            instance.full_clean()

    def test_model_choice_field_validation(self):
        """Test choice field only accepts valid choices."""
        valid_choices = ['CHOICE1', 'CHOICE2']

        # Test valid choice
        instance = {ModelName}.objects.create(choice_field='CHOICE1')
        self.assertEqual(instance.choice_field, 'CHOICE1')

        # Test invalid choice
        with self.assertRaises(ValidationError):
            instance = {ModelName}(choice_field='INVALID')
            instance.full_clean()

    def test_model_unique_constraint(self):
        """Test unique field constraint prevents duplicates."""
        {ModelName}.objects.create(unique_field='value1')

        with self.assertRaises(IntegrityError):
            {ModelName}.objects.create(unique_field='value1')

    def test_model_foreign_key_relationship(self):
        """Test foreign key relationships work correctly."""
        related_object = RelatedModel.objects.create(...)
        instance = {ModelName}.objects.create(
            foreign_key_field=related_object
        )

        self.assertEqual(instance.foreign_key_field, related_object)
        self.assertIn(instance, related_object.{model_name}_set.all())

    def test_model_one_to_one_relationship(self):
        """Test OneToOne relationship uniqueness."""
        user1 = User.objects.create_user(username='user1', ...)
        user2 = User.objects.create_user(username='user2', ...)

        # Create first instance
        instance1 = {ModelName}.objects.create(user=user1, ...)

        # Test unique constraint (can't create duplicate)
        with self.assertRaises(IntegrityError):
            {ModelName}.objects.create(user=user1, ...)

        # Can create with different user
        instance2 = {ModelName}.objects.create(user=user2, ...)
        self.assertNotEqual(instance1.pk, instance2.pk)

    def test_model_str_method(self):
        """Test __str__ method returns expected format."""
        instance = {ModelName}.objects.create(
            field1='value1',
            field2='value2'
        )

        expected_str = "Expected format with value1 and value2"
        self.assertEqual(str(instance), expected_str)

    def test_model_default_field_values(self):
        """Test default field values are set correctly."""
        instance = {ModelName}.objects.create(
            # Only required fields, no defaults
        )

        self.assertEqual(instance.boolean_field, True)  # Example default
        self.assertEqual(instance.status, 'ACTIVE')  # Example default

    def test_model_auto_timestamp_fields(self):
        """Test auto_now_add and auto_now timestamp fields."""
        from datetime import datetime
        from django.utils import timezone

        before = timezone.now()
        instance = {ModelName}.objects.create(...)
        after = timezone.now()

        # Test auto_now_add (created_at)
        self.assertGreaterEqual(instance.created_at, before)
        self.assertLessEqual(instance.created_at, after)

        # Test auto_now (updated_at)
        original_updated = instance.updated_at
        instance.field_name = 'new_value'
        instance.save()
        self.assertGreater(instance.updated_at, original_updated)

    def test_model_custom_method(self):
        """Test custom model methods return expected results."""
        instance = {ModelName}.objects.create(...)

        result = instance.custom_method()

        self.assertEqual(result, expected_value)

    def tearDown(self):
        """
        Clean up test data - runs after each test method.
        Django TestCase automatically rolls back database changes,
        but use this for any non-database cleanup.
        """
        pass
```

### Required Test Coverage
- ✅ Model creation with required fields
- ✅ Field validation (max_length, choices, unique, null/blank)
- ✅ Relationship constraints (ForeignKey, OneToOne, ManyToMany)
- ✅ Default field values
- ✅ Auto timestamp fields (auto_now, auto_now_add)
- ✅ __str__ method
- ✅ Custom model methods (if any)

### Minimum Tests Per Model
- Simple models (< 5 fields): 5-7 tests
- Medium models (5-10 fields): 8-12 tests
- Complex models (> 10 fields): 12+ tests

---

## Contract 2: View/API Tests (test_views.py)

### Purpose
Validate Django REST Framework API endpoints: authentication, authorization, request/response handling, and data serialization.

### Standard Test Class
```python
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from unittest.mock import patch

User = get_user_model()


class {ViewName}APITestCase(APITestCase):
    """
    Test cases for {ViewName} API endpoints.
    Following TDD RED-GREEN-REFACTOR methodology.
    """

    def setUp(self):
        """Set up test client, users, and authentication."""
        # Create test users
        self.user = User.objects.create_user(
            username='test_user',
            email='test@example.com',
            password='testpass123'
        )

        self.admin_user = User.objects.create_user(
            username='admin_user',
            email='admin@example.com',
            password='adminpass123',
            is_staff=True
        )

        # Create test data
        self.test_instance = {ModelName}.objects.create(
            user=self.user,
            # Other fields
        )

        # Base API URL
        self.url = '/api/{app_name}/{endpoint}/'
        self.detail_url = f'{self.url}{self.test_instance.pk}/'

    def test_list_endpoint_authenticated(self):
        """Test GET list endpoint returns data for authenticated user."""
        self.client.force_authenticate(user=self.user)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertGreater(len(response.data), 0)

    def test_list_endpoint_unauthenticated(self):
        """Test GET list endpoint returns 401 for unauthenticated requests."""
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_retrieve_endpoint_success(self):
        """Test GET detail endpoint returns specific instance."""
        self.client.force_authenticate(user=self.user)

        response = self.client.get(self.detail_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], self.test_instance.pk)

    def test_retrieve_endpoint_not_found(self):
        """Test GET detail endpoint returns 404 for non-existent ID."""
        self.client.force_authenticate(user=self.user)

        response = self.client.get(f'{self.url}99999/')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_create_endpoint_success(self):
        """Test POST endpoint creates new instance."""
        self.client.force_authenticate(user=self.user)

        data = {
            'field1': 'value1',
            'field2': 'value2',
            # All required fields
        }

        response = self.client.post(self.url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['field1'], 'value1')
        self.assertTrue({ModelName}.objects.filter(field1='value1').exists())

    def test_create_endpoint_validation_error(self):
        """Test POST endpoint returns 400 for invalid data."""
        self.client.force_authenticate(user=self.user)

        data = {
            'field1': '',  # Invalid: required field empty
        }

        response = self.client.post(self.url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('field1', response.data)

    def test_update_endpoint_success(self):
        """Test PUT endpoint updates existing instance."""
        self.client.force_authenticate(user=self.user)

        data = {
            'field1': 'updated_value',
            # All required fields
        }

        response = self.client.put(self.detail_url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['field1'], 'updated_value')

        # Verify database update
        self.test_instance.refresh_from_db()
        self.assertEqual(self.test_instance.field1, 'updated_value')

    def test_partial_update_endpoint_success(self):
        """Test PATCH endpoint updates specific fields."""
        self.client.force_authenticate(user=self.user)

        data = {'field1': 'patched_value'}

        response = self.client.patch(self.detail_url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['field1'], 'patched_value')

    def test_delete_endpoint_success(self):
        """Test DELETE endpoint removes instance."""
        self.client.force_authenticate(user=self.user)

        response = self.client.delete(self.detail_url)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse({ModelName}.objects.filter(pk=self.test_instance.pk).exists())

    def test_authorization_user_can_only_access_own_data(self):
        """Test users can only access their own data."""
        other_user = User.objects.create_user(username='other', ...)
        other_instance = {ModelName}.objects.create(user=other_user, ...)

        self.client.force_authenticate(user=self.user)

        # Should NOT see other user's data
        response = self.client.get(f'{self.url}{other_instance.pk}/')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_admin_can_access_all_data(self):
        """Test admin users can access all data."""
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Admin should see all instances

    @patch('app_name.services.external_service.ExternalAPI.call_method')
    def test_endpoint_with_external_api_call(self, mock_api_call):
        """Test endpoint properly mocks external API calls."""
        mock_api_call.return_value = {'status': 'success', 'data': {...}}

        self.client.force_authenticate(user=self.user)

        response = self.client.post(self.url, {...}, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        mock_api_call.assert_called_once()
```

### Required Test Coverage
- ✅ List endpoint (GET /api/resource/)
- ✅ Retrieve endpoint (GET /api/resource/{id}/)
- ✅ Create endpoint (POST /api/resource/)
- ✅ Update endpoint (PUT /api/resource/{id}/)
- ✅ Partial update endpoint (PATCH /api/resource/{id}/)
- ✅ Delete endpoint (DELETE /api/resource/{id}/)
- ✅ Authentication (401 for unauthenticated)
- ✅ Authorization (403/404 for unauthorized)
- ✅ Validation errors (400 for invalid data)
- ✅ External API mocking (if applicable)

### Minimum Tests Per ViewSet
- Simple ViewSet (basic CRUD): 10-12 tests
- Complex ViewSet (custom actions): 15+ tests

---

## Contract 3: Authentication Tests (test_authentication.py)

### Purpose
Validate JWT authentication workflows: token generation, validation, refresh, and expiration.

### Standard Test Class (for core_auth app)
```python
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model

User = get_user_model()


class JWTAuthenticationTestCase(APITestCase):
    """Test JWT authentication workflows."""

    def setUp(self):
        """Set up test user."""
        self.user = User.objects.create_user(
            username='test_user',
            email='test@example.com',
            password='testpass123'
        )

        self.login_url = '/api/auth/login/'
        self.refresh_url = '/api/auth/refresh/'

    def test_login_success_returns_tokens(self):
        """Test successful login returns access and refresh tokens."""
        data = {
            'username': 'test_user',
            'password': 'testpass123'
        }

        response = self.client.post(self.login_url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    def test_login_invalid_credentials_returns_401(self):
        """Test login with invalid credentials returns 401."""
        data = {
            'username': 'test_user',
            'password': 'wrongpassword'
        }

        response = self.client.post(self.login_url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_protected_endpoint_requires_authentication(self):
        """Test protected endpoint returns 401 without token."""
        response = self.client.get('/api/protected-endpoint/')

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_protected_endpoint_success_with_valid_token(self):
        """Test protected endpoint returns 200 with valid token."""
        # Get access token
        login_response = self.client.post(self.login_url, {
            'username': 'test_user',
            'password': 'testpass123'
        }, format='json')

        access_token = login_response.data['access']

        # Access protected endpoint
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        response = self.client.get('/api/protected-endpoint/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_token_refresh_success(self):
        """Test refresh token generates new access token."""
        # Get initial tokens
        login_response = self.client.post(self.login_url, {
            'username': 'test_user',
            'password': 'testpass123'
        }, format='json')

        refresh_token = login_response.data['refresh']

        # Refresh access token
        response = self.client.post(self.refresh_url, {
            'refresh': refresh_token
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)

    def test_token_refresh_invalid_token(self):
        """Test refresh with invalid token returns 401."""
        response = self.client.post(self.refresh_url, {
            'refresh': 'invalid_token'
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
```

---

## Contract 4: External API Mocking Pattern

### Purpose
Mock external API calls (e.g., Administrate GraphQL API) to isolate tests from network dependencies.

### Standard Mocking Pattern
```python
from unittest.mock import patch, MagicMock


class TutorialServiceTestCase(TestCase):
    """Test tutorial service with mocked external API."""

    @patch('administrate.services.graphql_client.GraphQLClient.execute_query')
    def test_fetch_event_data_success(self, mock_execute_query):
        """Test fetching event data from Administrate API."""
        # Mock API response
        mock_execute_query.return_value = {
            'data': {
                'events': [
                    {
                        'id': '123',
                        'name': 'Test Event',
                        'startDate': '2025-12-01',
                        'location': 'Online'
                    }
                ]
            }
        }

        # Call service method
        events = TutorialService.fetch_events()

        # Assertions
        self.assertEqual(len(events), 1)
        self.assertEqual(events[0]['name'], 'Test Event')
        mock_execute_query.assert_called_once()

    @patch('administrate.services.graphql_client.GraphQLClient.execute_query')
    def test_fetch_event_data_api_error(self, mock_execute_query):
        """Test handling API errors gracefully."""
        # Mock API error
        mock_execute_query.side_effect = Exception('API timeout')

        # Call service method
        with self.assertRaises(Exception):
            TutorialService.fetch_events()
```

---

## Test Execution Standards

### Running Tests
```bash
# Run all tests for a specific app
python manage.py test app_name

# Run specific test file
python manage.py test app_name.tests.test_models

# Run specific test class
python manage.py test app_name.tests.test_models.StudentTestCase

# Run specific test method
python manage.py test app_name.tests.test_models.StudentTestCase.test_student_creation

# Run tests with verbosity
python manage.py test app_name -v 2
```

### Coverage Measurement
```bash
# Run tests with coverage
coverage run --source='app_name' manage.py test app_name

# Generate terminal report
coverage report

# Generate HTML report
coverage html

# View HTML report
open htmlcov/index.html  # macOS
start htmlcov/index.html  # Windows
```

---

## Test Quality Standards

### Assertion Best Practices
```python
# ✅ Good: Specific assertions
self.assertEqual(response.status_code, status.HTTP_200_OK)
self.assertIn('field_name', response.data)
self.assertTrue(Model.objects.filter(pk=1).exists())

# ❌ Bad: Vague assertions
self.assertTrue(response.ok)
self.assertIsNotNone(response.data)
```

### Test Isolation
- ✅ Each test must be independent (no reliance on test execution order)
- ✅ Use setUp/tearDown for test data creation/cleanup
- ✅ Django TestCase automatically rolls back database changes
- ❌ Never share mutable state between tests

### Test Documentation
```python
def test_student_creation_with_required_fields(self):
    """
    Test creating a student with all required fields.

    Validates:
    - Student instance is created successfully
    - All required fields are set correctly
    - OneToOne relationship with User is established
    """
```

---

## Summary

These test contracts ensure:
- ✅ Consistent test structure across all apps
- ✅ Comprehensive coverage (models, views, serializers)
- ✅ Proper authentication/authorization testing
- ✅ External API mocking for test isolation
- ✅ Clear, descriptive test naming
- ✅ 80% minimum code coverage per app

**Next**: Use these contracts to generate tasks.md with specific test implementation tasks for each of the 11 apps.
