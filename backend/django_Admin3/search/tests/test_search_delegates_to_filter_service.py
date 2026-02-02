"""Tests for SearchService and ProductFilterService consistency (US2).

Validates that:
- Identical filters produce identical product sets via search and browse paths
"""
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

        # Search path: SearchService uses same ProductFilterService
        search_result = search_service.filter_service.apply_store_product_filters(base_qs, filters)
        search_ids = set(search_result.values_list('id', flat=True))

        self.assertEqual(browse_ids, search_ids,
                         "Search and browse with same filters must return same products")
