"""
Permission tests for catalog API.

Tests FR-013: AllowAny for reads, IsSuperUser for writes.

Test classes:
- TestIsSuperUserPermission: Direct tests of IsSuperUser permission class
- TestCatalogPermissionIntegration: Integration tests across all catalog endpoints
"""
from django.test import TestCase, RequestFactory
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response

from catalog.permissions import IsSuperUser
from catalog.tests.base import CatalogAPITestCase
from catalog.tests.fixtures import create_superuser, create_regular_user


class TestIsSuperUserPermission(TestCase):
    """Direct unit tests for IsSuperUser permission class (T034)."""

    def setUp(self):
        self.permission = IsSuperUser()
        self.factory = RequestFactory()
        self.superuser = create_superuser()
        self.regular_user = create_regular_user()

    def test_superuser_has_permission(self):
        """Superuser should be granted permission."""
        request = self.factory.get('/')
        request.user = self.superuser

        result = self.permission.has_permission(request, None)

        self.assertTrue(result)

    def test_regular_user_denied_permission(self):
        """Regular user should be denied permission."""
        request = self.factory.get('/')
        request.user = self.regular_user

        result = self.permission.has_permission(request, None)

        self.assertFalse(result)

    def test_anonymous_user_denied_permission(self):
        """Anonymous user should be denied permission."""
        from django.contrib.auth.models import AnonymousUser

        request = self.factory.get('/')
        request.user = AnonymousUser()

        result = self.permission.has_permission(request, None)

        self.assertFalse(result)

    def test_no_user_denied_permission(self):
        """Request with no user should be denied permission."""
        request = self.factory.get('/')
        request.user = None

        result = self.permission.has_permission(request, None)

        self.assertFalse(result)

    def test_staff_but_not_superuser_denied(self):
        """Staff user who is not superuser should be denied."""
        from django.contrib.auth import get_user_model
        User = get_user_model()

        staff_user = User.objects.create_user(
            username='staff',
            email='staff@test.com',
            password='testpass123'
        )
        staff_user.is_staff = True
        staff_user.save()

        request = self.factory.get('/')
        request.user = staff_user

        result = self.permission.has_permission(request, None)

        self.assertFalse(result, "Staff-only user should not have IsSuperUser permission")


class TestCatalogPermissionIntegration(CatalogAPITestCase):
    """Integration tests for permissions across all catalog endpoints (T034)."""

    # =========================================================================
    # Subject Endpoints
    # =========================================================================

    def test_subject_list_allows_anonymous(self):
        """GET /api/catalog/subjects/ should allow anonymous access."""
        self.unauthenticate()
        response = self.client.get('/api/catalog/subjects/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_subject_retrieve_allows_anonymous(self):
        """GET /api/catalog/subjects/{id}/ should allow anonymous access."""
        self.unauthenticate()
        response = self.client.get(f'/api/catalog/subjects/{self.subject_cm2.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_subject_create_denies_anonymous(self):
        """POST /api/catalog/subjects/ should deny anonymous."""
        self.unauthenticate()
        response = self.client.post('/api/catalog/subjects/', {
            'code': 'TEST', 'description': 'Test'
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_subject_create_denies_regular_user(self):
        """POST /api/catalog/subjects/ should deny regular user."""
        self.authenticate_regular_user()
        response = self.client.post('/api/catalog/subjects/', {
            'code': 'TEST', 'description': 'Test'
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_subject_create_allows_superuser(self):
        """POST /api/catalog/subjects/ should allow superuser."""
        self.authenticate_superuser()
        response = self.client.post('/api/catalog/subjects/', {
            'code': 'TEST', 'description': 'Test'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_subject_update_denies_regular_user(self):
        """PUT /api/catalog/subjects/{id}/ should deny regular user."""
        self.authenticate_regular_user()
        response = self.client.put(
            f'/api/catalog/subjects/{self.subject_cm2.id}/',
            {'code': 'CM2', 'description': 'Updated'}
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_subject_delete_denies_regular_user(self):
        """DELETE /api/catalog/subjects/{id}/ should deny regular user."""
        self.authenticate_regular_user()
        response = self.client.delete(f'/api/catalog/subjects/{self.subject_cm2.id}/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # =========================================================================
    # Exam Session Endpoints
    # =========================================================================

    def test_exam_session_list_allows_anonymous(self):
        """GET /api/catalog/exam-sessions/ should allow anonymous access."""
        self.unauthenticate()
        response = self.client.get('/api/catalog/exam-sessions/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_exam_session_create_denies_regular_user(self):
        """POST /api/catalog/exam-sessions/ should deny regular user."""
        self.authenticate_regular_user()
        response = self.client.post('/api/catalog/exam-sessions/', {
            'session_code': 'TEST-01',
            'start_date': '2026-06-01',
            'end_date': '2026-06-15'
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_exam_session_create_allows_superuser(self):
        """POST /api/catalog/exam-sessions/ should allow superuser."""
        self.authenticate_superuser()
        response = self.client.post('/api/catalog/exam-sessions/', {
            'session_code': 'TEST-01',
            'start_date': '2026-06-01',
            'end_date': '2026-06-15'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    # =========================================================================
    # Product Endpoints
    # =========================================================================

    def test_product_list_allows_anonymous(self):
        """GET /api/catalog/products/ should allow anonymous access."""
        self.unauthenticate()
        response = self.client.get('/api/catalog/products/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_product_create_denies_regular_user(self):
        """POST /api/catalog/products/ should deny regular user."""
        self.authenticate_regular_user()
        response = self.client.post('/api/catalog/products/', {
            'fullname': 'Test Product',
            'shortname': 'Test',
            'code': 'TEST-001',
            'description': 'Test'
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_product_create_allows_superuser(self):
        """POST /api/catalog/products/ should allow superuser."""
        self.authenticate_superuser()
        response = self.client.post('/api/catalog/products/', {
            'fullname': 'Test Product',
            'shortname': 'Test',
            'code': 'TEST-001',
            'description': 'Test'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    # =========================================================================
    # Bundle Endpoints (Read-Only)
    # =========================================================================

    def test_bundle_list_allows_anonymous(self):
        """GET /api/catalog/bundles/ should allow anonymous access."""
        self.unauthenticate()
        response = self.client.get('/api/catalog/bundles/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    # =========================================================================
    # Navigation Data (Read-Only)
    # =========================================================================

    def test_navigation_data_allows_anonymous(self):
        """GET /api/catalog/navigation-data/ should allow anonymous access."""
        self.unauthenticate()
        response = self.client.get('/api/catalog/navigation-data/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    # =========================================================================
    # Search Endpoints (Read-Only)
    # =========================================================================

    def test_search_allows_anonymous(self):
        """GET /api/catalog/search/ should allow anonymous access."""
        self.unauthenticate()
        response = self.client.get('/api/catalog/search/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_advanced_search_allows_anonymous(self):
        """GET /api/catalog/advanced-search/ should allow anonymous access."""
        self.unauthenticate()
        response = self.client.get('/api/catalog/advanced-search/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
