"""
Base test classes for catalog API tests.

Provides CatalogAPITestCase with authentication helpers and standard setup
for testing catalog ViewSets and serializers.

Usage:
    from catalog.tests.base import CatalogAPITestCase

    class TestSubjectViewSet(CatalogAPITestCase):
        def test_list_subjects(self):
            response = self.client.get('/api/catalog/subjects/')
            self.assertEqual(response.status_code, 200)

        def test_create_requires_superuser(self):
            self.authenticate_superuser()
            response = self.client.post('/api/catalog/subjects/', {...})
            self.assertEqual(response.status_code, 201)
"""
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from catalog.tests.fixtures import (
    CatalogTestDataMixin,
    create_superuser,
    create_regular_user,
)


class CatalogAPITestCase(CatalogTestDataMixin, APITestCase):
    """
    Base test case for catalog API tests.

    Inherits from:
    - CatalogTestDataMixin: Provides setup_catalog_test_data() and setup_auth_users()
    - APITestCase: DRF's test case with API client and assertions

    Authentication Helpers:
    - authenticate_superuser(): Authenticate as superuser for write operations
    - authenticate_regular_user(): Authenticate as non-superuser for permission tests
    - unauthenticate(): Remove authentication for anonymous access tests

    Standard Setup:
    - Automatically sets up test data when setUp() is called with super().setUp()
    - Override setUp() to add custom test data
    """

    def setUp(self):
        """Set up test data and authentication users."""
        super().setUp()
        self.setup_catalog_test_data()
        self.setup_auth_users()

    def authenticate_superuser(self):
        """
        Authenticate the test client as a superuser.

        Use for testing write operations (create, update, delete) that
        require IsSuperUser permission (FR-013).

        Example:
            def test_create_subject(self):
                self.authenticate_superuser()
                response = self.client.post('/api/catalog/subjects/', data)
                self.assertEqual(response.status_code, 201)
        """
        refresh = RefreshToken.for_user(self.superuser)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')

    def authenticate_regular_user(self):
        """
        Authenticate the test client as a regular (non-superuser) user.

        Use for testing that write operations are properly restricted
        to superusers only.

        Example:
            def test_create_denied_for_regular_user(self):
                self.authenticate_regular_user()
                response = self.client.post('/api/catalog/subjects/', data)
                self.assertEqual(response.status_code, 403)
        """
        refresh = RefreshToken.for_user(self.regular_user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')

    def unauthenticate(self):
        """
        Remove authentication from the test client.

        Use for testing anonymous access to read operations.

        Example:
            def test_list_allows_anonymous(self):
                self.unauthenticate()
                response = self.client.get('/api/catalog/subjects/')
                self.assertEqual(response.status_code, 200)
        """
        self.client.credentials()

    def get_api_url(self, endpoint, pk=None):
        """
        Build API URL for catalog endpoints.

        Args:
            endpoint: The endpoint name (e.g., 'subjects', 'products')
            pk: Optional primary key for detail endpoints

        Returns:
            Full URL path (e.g., '/api/catalog/subjects/' or '/api/catalog/subjects/1/')
        """
        base_url = f'/api/catalog/{endpoint}/'
        if pk is not None:
            return f'{base_url}{pk}/'
        return base_url

    def assertResponseContainsFields(self, response, expected_fields):
        """
        Assert that API response contains expected fields.

        Args:
            response: DRF Response object
            expected_fields: List of field names to check

        Example:
            self.assertResponseContainsFields(response, ['id', 'code', 'description'])
        """
        data = response.json()
        if isinstance(data, list):
            data = data[0] if data else {}

        for field in expected_fields:
            self.assertIn(field, data, f"Response missing expected field: {field}")

    def assertListResponseLength(self, response, expected_length):
        """
        Assert that list response contains expected number of items.

        Args:
            response: DRF Response object
            expected_length: Expected number of items
        """
        data = response.json()
        # Handle both paginated and non-paginated responses
        if isinstance(data, dict) and 'results' in data:
            actual_length = len(data['results'])
        elif isinstance(data, list):
            actual_length = len(data)
        else:
            actual_length = 0

        self.assertEqual(
            actual_length,
            expected_length,
            f"Expected {expected_length} items, got {actual_length}"
        )
