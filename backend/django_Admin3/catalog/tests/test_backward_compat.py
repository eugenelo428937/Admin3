"""Tests for backward compatibility re-exports.

These tests verify that models can still be imported from their original
app locations after being moved to the catalog app. This maintains backward
compatibility with existing code that imports from subjects, exam_sessions,
and products apps.

TDD RED Phase: These tests should FAIL until re-exports are implemented in T020-T022.
"""
from django.test import TestCase


class TestSubjectsBackwardCompat(TestCase):
    """Test that Subject can be imported from subjects app."""

    def test_import_subject_from_subjects_models(self):
        """Verify Subject can be imported from subjects.models."""
        from subjects.models import Subject
        self.assertIsNotNone(Subject)
        self.assertEqual(Subject._meta.db_table, '"acted"."catalog_subjects"')

    def test_subject_is_same_class(self):
        """Verify imported Subject is the same class as catalog.Subject."""
        from subjects.models import Subject as SubjectsSubject
        from catalog.models import Subject as CatalogSubject
        self.assertIs(SubjectsSubject, CatalogSubject)




# =============================================================================
# API Endpoint Backward Compatibility Tests (002-catalog-api-consolidation)
# =============================================================================

from rest_framework import status
from catalog.tests.base import CatalogAPITestCase


class TestSubjectAPIBackwardCompat(CatalogAPITestCase):
    """Test legacy /api/subjects/subjects/ returns same data as /api/catalog/subjects/ (T050)."""

    def test_legacy_subjects_list_returns_200(self):
        """Legacy subjects endpoint should return 200."""
        response = self.client.get('/api/subjects/subjects/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_legacy_subjects_matches_catalog_subjects(self):
        """Legacy subjects should return same data as catalog subjects."""
        legacy_response = self.client.get('/api/subjects/subjects/')
        catalog_response = self.client.get('/api/catalog/subjects/')

        self.assertEqual(legacy_response.status_code, status.HTTP_200_OK)
        self.assertEqual(catalog_response.status_code, status.HTTP_200_OK)

        # Compare the data
        legacy_data = legacy_response.json()
        catalog_data = catalog_response.json()

        self.assertEqual(len(legacy_data), len(catalog_data))

        # Sort by code for comparison
        legacy_sorted = sorted(legacy_data, key=lambda x: x['code'])
        catalog_sorted = sorted(catalog_data, key=lambda x: x['code'])

        for legacy, catalog in zip(legacy_sorted, catalog_sorted):
            self.assertEqual(legacy['code'], catalog['code'])
            self.assertEqual(legacy['description'], catalog['description'])
            self.assertEqual(legacy['name'], catalog['name'])


class TestProductAPIBackwardCompat(CatalogAPITestCase):
    """Test legacy /api/products/products/ returns same data as /api/catalog/products/ (T052)."""

    def test_legacy_products_list_returns_200(self):
        """Legacy products endpoint should return 200."""
        response = self.client.get('/api/products/products/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_legacy_products_matches_catalog(self):
        """Legacy products should return same data as catalog."""
        legacy_response = self.client.get('/api/products/products/')
        catalog_response = self.client.get('/api/catalog/products/')

        self.assertEqual(legacy_response.status_code, status.HTTP_200_OK)
        self.assertEqual(catalog_response.status_code, status.HTTP_200_OK)

        # Handle paginated responses
        legacy_data = legacy_response.json()
        catalog_data = catalog_response.json()

        if isinstance(legacy_data, dict) and 'results' in legacy_data:
            legacy_data = legacy_data['results']
        if isinstance(catalog_data, dict) and 'results' in catalog_data:
            catalog_data = catalog_data['results']

        # Verify same number of products
        self.assertEqual(len(legacy_data), len(catalog_data))


class TestNavigationAPIBackwardCompat(CatalogAPITestCase):
    """Test legacy /api/products/navigation-data/ returns same data as /api/catalog/navigation-data/ (T053)."""

    def test_legacy_navigation_data_returns_200(self):
        """Legacy navigation-data endpoint should return 200."""
        response = self.client.get('/api/products/navigation-data/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_legacy_navigation_matches_catalog(self):
        """Legacy navigation-data should return same structure as catalog."""
        legacy_response = self.client.get('/api/products/navigation-data/')
        catalog_response = self.client.get('/api/catalog/navigation-data/')

        self.assertEqual(legacy_response.status_code, status.HTTP_200_OK)
        self.assertEqual(catalog_response.status_code, status.HTTP_200_OK)

        legacy_data = legacy_response.json()
        catalog_data = catalog_response.json()

        # Verify same keys exist
        expected_keys = ['subjects', 'navbar_product_groups', 'distance_learning_dropdown', 'tutorial_dropdown']
        for key in expected_keys:
            self.assertIn(key, legacy_data, f"Legacy missing key: {key}")
            self.assertIn(key, catalog_data, f"Catalog missing key: {key}")


class TestBundleAPIBackwardCompat(CatalogAPITestCase):
    """Test legacy /api/products/bundles/ returns same data as /api/catalog/bundles/ (T054)."""

    def test_legacy_bundles_list_returns_200(self):
        """Legacy bundles endpoint should return 200."""
        response = self.client.get('/api/products/bundles/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_legacy_bundles_matches_catalog(self):
        """Legacy bundles should return same data as catalog."""
        legacy_response = self.client.get('/api/products/bundles/')
        catalog_response = self.client.get('/api/catalog/bundles/')

        self.assertEqual(legacy_response.status_code, status.HTTP_200_OK)
        self.assertEqual(catalog_response.status_code, status.HTTP_200_OK)


class TestLegacyViewReExports(TestCase):
    """Test that legacy apps properly re-export views from catalog (T061-T064)."""

    def test_subjects_viewset_reexport(self):
        """subjects.views should re-export SubjectViewSet from catalog."""
        from subjects.views import SubjectViewSet as LegacySubjectViewSet
        from catalog.views import SubjectViewSet as CatalogSubjectViewSet

        # They should be the same class
        self.assertIs(LegacySubjectViewSet, CatalogSubjectViewSet)

    def test_subjects_serializer_reexport(self):
        """subjects.serializers should re-export SubjectSerializer from catalog."""
        from subjects.serializers import SubjectSerializer as LegacySubjectSerializer
        from catalog.serializers import SubjectSerializer as CatalogSubjectSerializer

        # They should be the same class
        self.assertIs(LegacySubjectSerializer, CatalogSubjectSerializer)

