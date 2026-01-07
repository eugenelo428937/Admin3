"""
ViewSet and view tests for catalog API.

Tests all catalog endpoints per FR-013 (permissions) and FR-015 (test coverage).

Test classes:
- TestSubjectViewSet: Subject list with caching, CRUD, bulk_import action
- TestExamSessionViewSet: ExamSession CRUD operations
- TestProductViewSet: Product list with filters, bundle_contents, bundles actions
- TestBundleViewSet: ExamSessionSubjectBundle list and retrieve
- TestNavigationDataView: Combined navigation endpoint with caching
- TestFuzzySearchView: Trigram similarity search
- TestAdvancedProductSearchView: Multi-filter search with pagination
"""
from unittest.mock import patch
from django.core.cache import cache
from django.urls import reverse
from rest_framework import status

from catalog.tests.base import CatalogAPITestCase
from catalog.tests.fixtures import (
    create_subject,
    create_product,
    create_exam_session,
)


class TestSubjectViewSet(CatalogAPITestCase):
    """Test SubjectViewSet list, CRUD, and bulk_import action."""

    def setUp(self):
        super().setUp()
        # Clear cache before each test
        cache.clear()

    def test_list_subjects_returns_active_only(self):
        """List endpoint should return only active subjects (T025)."""
        response = self.client.get('/api/catalog/subjects/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        # Should return active subjects only (CM2, SA1)
        # CB1 is inactive and should not be included
        codes = [s['code'] for s in data]
        self.assertIn('CM2', codes)
        self.assertIn('SA1', codes)
        self.assertNotIn('CB1', codes)  # Inactive subject

    def test_list_subjects_contains_required_fields(self):
        """List response should contain id, code, description, name fields."""
        response = self.client.get('/api/catalog/subjects/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertGreater(len(data), 0)

        subject = data[0]
        self.assertIn('id', subject)
        self.assertIn('code', subject)
        self.assertIn('description', subject)
        self.assertIn('name', subject)  # Frontend compatibility alias

    def test_list_subjects_name_equals_description(self):
        """The 'name' field should be an alias for 'description'."""
        response = self.client.get('/api/catalog/subjects/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        for subject in data:
            self.assertEqual(
                subject['name'],
                subject['description'],
                f"Subject {subject['code']}: name should equal description"
            )

    def test_list_subjects_cached(self):
        """List endpoint should use caching with key 'subjects_list_v1' (T025)."""
        # First request - should populate cache
        response1 = self.client.get('/api/catalog/subjects/')
        self.assertEqual(response1.status_code, status.HTTP_200_OK)

        # Cache should be populated
        cached_data = cache.get('subjects_list_v1')
        self.assertIsNotNone(cached_data, "subjects_list_v1 cache key should be set")

        # Create a new subject - should not affect cached response
        create_subject(code='TEST', description='Test Subject')

        # Second request - should return cached data (without new subject)
        response2 = self.client.get('/api/catalog/subjects/')
        self.assertEqual(response2.status_code, status.HTTP_200_OK)

        codes = [s['code'] for s in response2.json()]
        self.assertNotIn('TEST', codes, "Cached response should not include new subject")

    def test_list_subjects_allows_anonymous(self):
        """List endpoint should allow anonymous access (AllowAny)."""
        self.unauthenticate()

        response = self.client.get('/api/catalog/subjects/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_retrieve_subject(self):
        """Retrieve endpoint should return a single subject."""
        response = self.client.get(f'/api/catalog/subjects/{self.subject_cm2.id}/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data['code'], 'CM2')
        self.assertEqual(data['description'], 'Financial Mathematics')

    def test_create_subject_requires_superuser(self):
        """Create endpoint should require superuser permission (T026)."""
        self.authenticate_regular_user()

        response = self.client.post('/api/catalog/subjects/', {
            'code': 'NEW',
            'description': 'New Subject'
        })

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_subject_with_superuser(self):
        """Superuser should be able to create subjects (T026)."""
        self.authenticate_superuser()

        response = self.client.post('/api/catalog/subjects/', {
            'code': 'NEW',
            'description': 'New Subject'
        })

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.json()
        self.assertEqual(data['code'], 'NEW')

    def test_update_subject_requires_superuser(self):
        """Update endpoint should require superuser permission."""
        self.authenticate_regular_user()

        response = self.client.put(
            f'/api/catalog/subjects/{self.subject_cm2.id}/',
            {'code': 'CM2', 'description': 'Updated Description'}
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_delete_subject_requires_superuser(self):
        """Delete endpoint should require superuser permission."""
        self.authenticate_regular_user()

        response = self.client.delete(f'/api/catalog/subjects/{self.subject_cm2.id}/')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_bulk_import_subjects_action(self):
        """bulk-import action should create multiple subjects (T026)."""
        self.authenticate_superuser()

        response = self.client.post('/api/catalog/subjects/bulk-import/', {
            'subjects': [
                {'code': 'BULK1', 'description': 'Bulk Subject 1'},
                {'code': 'BULK2', 'description': 'Bulk Subject 2'}
            ]
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.json()
        self.assertIn('created', data)
        self.assertEqual(len(data['created']), 2)

    def test_bulk_import_returns_errors_for_invalid_data(self):
        """bulk-import should return errors for invalid subjects."""
        self.authenticate_superuser()

        response = self.client.post('/api/catalog/subjects/bulk-import/', {
            'subjects': [
                {'code': '', 'description': 'Invalid - no code'},  # Missing code
                {'code': 'VALID', 'description': 'Valid Subject'}
            ]
        }, format='json')

        data = response.json()
        self.assertIn('errors', data)
        self.assertGreater(len(data['errors']), 0)


class TestExamSessionViewSet(CatalogAPITestCase):
    """Test ExamSessionViewSet CRUD operations (T027)."""

    def test_list_exam_sessions(self):
        """List endpoint should return all exam sessions."""
        response = self.client.get('/api/catalog/exam-sessions/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        # Handle both paginated and non-paginated responses
        if isinstance(data, dict) and 'results' in data:
            sessions = data['results']
        else:
            sessions = data

        session_codes = [s['session_code'] for s in sessions]
        self.assertIn('2026-04', session_codes)
        self.assertIn('2026-09', session_codes)

    def test_list_exam_sessions_contains_required_fields(self):
        """List response should contain expected fields."""
        response = self.client.get('/api/catalog/exam-sessions/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        if isinstance(data, dict) and 'results' in data:
            sessions = data['results']
        else:
            sessions = data

        session = sessions[0]
        expected_fields = ['id', 'session_code', 'start_date', 'end_date']
        for field in expected_fields:
            self.assertIn(field, session, f"Missing field: {field}")

    def test_list_exam_sessions_allows_anonymous(self):
        """List endpoint should allow anonymous access."""
        self.unauthenticate()

        response = self.client.get('/api/catalog/exam-sessions/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_retrieve_exam_session(self):
        """Retrieve endpoint should return a single exam session."""
        response = self.client.get(f'/api/catalog/exam-sessions/{self.session_april.id}/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data['session_code'], '2026-04')

    def test_create_exam_session_requires_superuser(self):
        """Create endpoint should require superuser permission."""
        self.authenticate_regular_user()

        response = self.client.post('/api/catalog/exam-sessions/', {
            'session_code': '2026-12',
            'start_date': '2026-12-01',
            'end_date': '2026-12-15'
        })

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_exam_session_with_superuser(self):
        """Superuser should be able to create exam sessions."""
        self.authenticate_superuser()

        response = self.client.post('/api/catalog/exam-sessions/', {
            'session_code': '2026-12',
            'start_date': '2026-12-01',
            'end_date': '2026-12-15'
        })

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)


class TestProductViewSet(CatalogAPITestCase):
    """Test ProductViewSet with filtering and custom actions (T028, T029)."""

    def test_list_products(self):
        """List endpoint should return active products."""
        response = self.client.get('/api/catalog/products/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        if isinstance(data, dict) and 'results' in data:
            products = data['results']
        else:
            products = data

        # Should not include inactive products
        codes = [p['code'] for p in products]
        self.assertNotIn('INACT-001', codes, "Inactive product should be excluded")

    def test_list_products_contains_required_fields(self):
        """List response should contain expected fields."""
        response = self.client.get('/api/catalog/products/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        if isinstance(data, dict) and 'results' in data:
            products = data['results']
        else:
            products = data

        self.assertGreater(len(products), 0)
        product = products[0]

        expected_fields = ['id', 'fullname', 'shortname', 'code', 'description']
        for field in expected_fields:
            self.assertIn(field, product, f"Missing field: {field}")

    def test_list_products_includes_type_field(self):
        """Products should have computed 'type' field."""
        response = self.client.get('/api/catalog/products/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        if isinstance(data, dict) and 'results' in data:
            products = data['results']
        else:
            products = data

        if products:
            self.assertIn('type', products[0])

    def test_list_products_includes_variations(self):
        """Products should include nested variations."""
        response = self.client.get('/api/catalog/products/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        if isinstance(data, dict) and 'results' in data:
            products = data['results']
        else:
            products = data

        # Find the core product which has variations
        core_product = next((p for p in products if p['code'] == 'CM2-CSM'), None)
        if core_product:
            self.assertIn('variations', core_product)
            self.assertGreater(len(core_product['variations']), 0)

    def test_list_products_allows_anonymous(self):
        """List endpoint should allow anonymous access."""
        self.unauthenticate()

        response = self.client.get('/api/catalog/products/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_retrieve_product(self):
        """Retrieve endpoint should return a single product."""
        response = self.client.get(f'/api/catalog/products/{self.product_core.id}/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data['code'], 'CM2-CSM')

    def test_create_product_requires_superuser(self):
        """Create endpoint should require superuser permission."""
        self.authenticate_regular_user()

        response = self.client.post('/api/catalog/products/', {
            'fullname': 'New Product',
            'shortname': 'New',
            'code': 'NEW-001',
            'description': 'A new product'
        })

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_get_bundle_contents_action(self):
        """bundle-contents action should return bundle components (T029)."""
        response = self.client.get(
            f'/api/catalog/products/bundle-contents/',
            {'bundle_id': self.bundle_cm2.id}
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        self.assertIn('bundle_product', data)
        self.assertIn('components', data)
        self.assertEqual(data['total_components'], 2)  # Two products in bundle

    def test_get_bundles_action(self):
        """bundles action should return available bundles (T029)."""
        response = self.client.get('/api/catalog/products/bundles/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        self.assertIn('results', data)
        self.assertIn('count', data)

    def test_get_bundles_filter_by_subject(self):
        """bundles action should filter by subject code."""
        response = self.client.get('/api/catalog/products/bundles/', {'subject': 'CM2'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        # All returned bundles should be for CM2
        for bundle in data['results']:
            if bundle.get('bundle_type') == 'master':
                self.assertEqual(bundle.get('subject_code'), 'CM2')


class TestBundleViewSet(CatalogAPITestCase):
    """Test BundleViewSet for ExamSessionSubjectBundle (T030)."""

    def test_list_bundles(self):
        """List endpoint should return exam session bundles."""
        response = self.client.get('/api/catalog/bundles/')

        # Should return 200 even if empty
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_list_bundles_allows_anonymous(self):
        """List endpoint should allow anonymous access."""
        self.unauthenticate()

        response = self.client.get('/api/catalog/bundles/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_bundle_viewset_is_readonly(self):
        """BundleViewSet should not allow create/update/delete."""
        self.authenticate_superuser()

        # POST should not be allowed
        response = self.client.post('/api/catalog/bundles/', {})
        self.assertIn(response.status_code, [status.HTTP_405_METHOD_NOT_ALLOWED, status.HTTP_403_FORBIDDEN])


class TestNavigationDataView(CatalogAPITestCase):
    """Test navigation_data combined endpoint with caching (T031)."""

    def setUp(self):
        super().setUp()
        cache.clear()

    def test_navigation_data_returns_combined_data(self):
        """navigation-data should return subjects, navbar, distance_learning, tutorial data."""
        response = self.client.get('/api/catalog/navigation-data/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        expected_keys = ['subjects', 'navbar_product_groups', 'distance_learning_dropdown', 'tutorial_dropdown']
        for key in expected_keys:
            self.assertIn(key, data, f"Missing key: {key}")

    def test_navigation_data_subjects_active_only(self):
        """navigation-data should return only active subjects."""
        response = self.client.get('/api/catalog/navigation-data/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        subject_codes = [s['code'] for s in data['subjects']]
        self.assertIn('CM2', subject_codes)
        self.assertNotIn('CB1', subject_codes)  # Inactive

    def test_navigation_data_cached(self):
        """navigation-data should use caching with key 'navigation_data_v2'."""
        # First request - should populate cache
        response1 = self.client.get('/api/catalog/navigation-data/')
        self.assertEqual(response1.status_code, status.HTTP_200_OK)

        # Cache should be populated
        cached_data = cache.get('navigation_data_v2')
        self.assertIsNotNone(cached_data, "navigation_data_v2 cache key should be set")

    def test_navigation_data_allows_anonymous(self):
        """navigation-data should allow anonymous access."""
        self.unauthenticate()

        response = self.client.get('/api/catalog/navigation-data/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class TestFuzzySearchView(CatalogAPITestCase):
    """Test fuzzy_search endpoint with trigram similarity (T032)."""

    def test_fuzzy_search_empty_query(self):
        """Empty query should return empty suggestions."""
        response = self.client.get('/api/catalog/search/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        self.assertIn('suggested_filters', data)
        self.assertEqual(len(data['suggested_filters']['subjects']), 0)

    def test_fuzzy_search_returns_structure(self):
        """Search should return expected response structure."""
        response = self.client.get('/api/catalog/search/', {'q': 'CM2'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        self.assertIn('suggested_filters', data)
        self.assertIn('suggested_products', data)
        self.assertIn('query', data)

        filter_keys = ['subjects', 'product_groups', 'variations', 'products']
        for key in filter_keys:
            self.assertIn(key, data['suggested_filters'])

    def test_fuzzy_search_finds_subjects(self):
        """Search should find matching subjects."""
        response = self.client.get('/api/catalog/search/', {'q': 'Financial'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        # Should find CM2 (Financial Mathematics)
        subject_codes = [s['code'] for s in data['suggested_filters']['subjects']]
        self.assertIn('CM2', subject_codes)

    def test_fuzzy_search_finds_products(self):
        """Search should find matching products."""
        response = self.client.get('/api/catalog/search/', {'q': 'Core Study'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        # Should find CM2 Core Study Materials
        product_codes = [p['code'] for p in data['suggested_filters']['products']]
        self.assertIn('CM2-CSM', product_codes)

    def test_fuzzy_search_allows_anonymous(self):
        """search should allow anonymous access."""
        self.unauthenticate()

        response = self.client.get('/api/catalog/search/', {'q': 'test'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class TestAdvancedProductSearchView(CatalogAPITestCase):
    """Test advanced_product_search with pagination (T033)."""

    def test_advanced_search_returns_paginated_results(self):
        """Advanced search should return paginated results."""
        response = self.client.get('/api/catalog/advanced-search/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        expected_keys = ['results', 'count', 'page', 'page_size', 'has_next', 'has_previous']
        for key in expected_keys:
            self.assertIn(key, data, f"Missing pagination key: {key}")

    def test_advanced_search_text_query(self):
        """Advanced search should filter by text query."""
        response = self.client.get('/api/catalog/advanced-search/', {'q': 'CM2 Core'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        self.assertIn('results', data)
        self.assertIn('query', data)
        self.assertEqual(data['query'], 'CM2 Core')

    def test_advanced_search_pagination(self):
        """Advanced search should support pagination parameters."""
        response = self.client.get('/api/catalog/advanced-search/', {
            'page': 1,
            'page_size': 5
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        self.assertEqual(data['page'], 1)
        self.assertEqual(data['page_size'], 5)

    def test_advanced_search_filter_by_subjects(self):
        """Advanced search should filter by subject codes."""
        response = self.client.get('/api/catalog/advanced-search/', {
            'subjects': ['CM2']
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        self.assertIn('applied_filters', data)
        self.assertEqual(data['applied_filters']['subjects'], ['CM2'])

    def test_advanced_search_allows_anonymous(self):
        """advanced-search should allow anonymous access."""
        self.unauthenticate()

        response = self.client.get('/api/catalog/advanced-search/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
