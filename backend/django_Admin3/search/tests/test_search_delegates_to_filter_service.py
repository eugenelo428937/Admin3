"""Tests for SearchService delegation to ProductFilterService (US2).

Validates that:
- SearchService._apply_filters delegates to ProductFilterService.apply_store_product_filters()
- SearchService._generate_filter_counts delegates to ProductFilterService.generate_filter_counts()
- Deprecated wrappers emit deprecation warnings
- Identical filters produce identical product sets via search and browse
"""
from unittest.mock import patch, MagicMock
from django.test import TestCase

from search.services.search_service import SearchService
from filtering.services.filter_service import ProductFilterService
from search.tests.factories import (
    create_subject,
    create_exam_session,
    create_exam_session_subject,
    create_catalog_product,
    create_product_variation,
    create_store_product,
    assign_product_to_group,
)
from filtering.tests.factories import (
    create_filter_config,
    create_filter_group,
    assign_group_to_config,
)
from store.models import Product as StoreProduct


class SearchDelegatesToFilterServiceTest(TestCase):
    """Test that SearchService delegates filter operations to ProductFilterService."""

    def setUp(self):
        self.search_service = SearchService()

    def test_apply_filters_delegates_to_product_filter_service(self):
        """R6: _apply_filters delegates to ProductFilterService.apply_store_product_filters()."""
        base_qs = StoreProduct.objects.filter(is_active=True)
        filters = {'subjects': ['CS2']}

        with patch.object(
            self.search_service, 'filter_service', create=True
        ) as mock_fs:
            mock_fs.apply_store_product_filters.return_value = base_qs.none()
            self.search_service._apply_filters(base_qs, filters)
            mock_fs.apply_store_product_filters.assert_called_once_with(base_qs, filters)

    def test_generate_filter_counts_delegates_to_product_filter_service(self):
        """R4: _generate_filter_counts delegates to ProductFilterService.generate_filter_counts()."""
        base_qs = StoreProduct.objects.filter(is_active=True)
        filters = {'subjects': ['CS2']}
        expected = {
            'subjects': {}, 'categories': {}, 'product_types': {},
            'products': {}, 'modes_of_delivery': {},
        }

        with patch.object(
            self.search_service, 'filter_service', create=True
        ) as mock_fs:
            mock_fs.generate_filter_counts.return_value = expected
            result = self.search_service._generate_filter_counts(base_qs, filters=filters)
            mock_fs.generate_filter_counts.assert_called_once_with(base_qs, filters)

    def test_deprecated_apply_filters_emits_warning(self):
        """R6: Deprecated _apply_filters wrapper emits deprecation warning."""
        import warnings
        base_qs = StoreProduct.objects.filter(is_active=True)

        with warnings.catch_warnings(record=True) as w:
            warnings.simplefilter("always")
            self.search_service._apply_filters(base_qs, {})
            deprecation_warnings = [x for x in w if issubclass(x.category, DeprecationWarning)]
            self.assertGreater(len(deprecation_warnings), 0,
                               "Should emit DeprecationWarning")


class SearchBrowseConsistencyTest(TestCase):
    """Test SC-003: Identical filters produce identical results via search and browse."""

    def setUp(self):
        # Create filter configurations
        self.cat_config = create_filter_config('Categories', 'categories')
        self.material = create_filter_group('Material', code='MATERIAL')
        assign_group_to_config(self.cat_config, self.material)

        # Create products
        self.subject = create_subject('CS2')
        self.exam_session = create_exam_session('2025-04')
        self.ess = create_exam_session_subject(self.exam_session, self.subject)
        self.printed = create_product_variation('Printed', 'Standard Printed', code='P')

        self.cat_prod = create_catalog_product('CS2 Course Notes', 'CS2 Course Notes', 'CN01')
        assign_product_to_group(self.cat_prod, self.material)
        self.sp = create_store_product(
            self.ess, self.cat_prod, self.printed, product_code='CS2/PCN01/2025-04',
        )

    def test_same_filters_same_results(self):
        """SC-003: Identical filters through search and browse produce identical product sets."""
        filter_service = ProductFilterService()
        search_service = SearchService()

        base_qs = StoreProduct.objects.filter(is_active=True)
        filters = {'subjects': ['CS2']}

        # Browse path: ProductFilterService directly
        browse_result = filter_service.apply_store_product_filters(base_qs, filters)
        browse_ids = set(browse_result.values_list('id', flat=True))

        # Search path: SearchService delegates to same ProductFilterService
        search_result = search_service._apply_filters(base_qs, filters)
        search_ids = set(search_result.values_list('id', flat=True))

        self.assertEqual(browse_ids, search_ids,
                         "Search and browse with same filters must return same products")
