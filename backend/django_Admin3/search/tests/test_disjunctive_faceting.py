"""Tests for US2: Disjunctive Faceting.

Each filter dimension's counts reflect the queryset with all OTHER active
filters applied, excluding that dimension's own filter. This is the standard
e-commerce faceted navigation pattern.

Example: If subjects=CM2 is active:
- Subject counts should reflect the UNFILTERED queryset (so CM2 still shows count)
- Category counts should reflect only CM2 products
- Product type counts should reflect only CM2 products
"""
from django.test import TestCase

from filtering.tests.factories import (
    create_filter_config,
    create_filter_group,
    assign_group_to_config,
)
from search.tests.factories import (
    create_subject,
    create_exam_session,
    create_exam_session_subject,
    create_catalog_product,
    create_product_variation,
    create_store_product,
    assign_product_to_group,
)
from search.services.search_service import SearchService
from store.models import Product as StoreProduct


class TestDisjunctiveFaceting(TestCase):
    """Test disjunctive facet counts per filter dimension."""

    def setUp(self):
        """Create test data with multiple subjects, categories, and product types.

        Data setup:
        - Subject CM2: 2 products (printed material, ebook revision)
        - Subject SA1: 1 product (printed material)
        - Categories config: Material group
        - Product Types config: Core Study, Revision groups
        """
        # Filter configs
        self.categories_config = create_filter_config(
            'Categories', 'categories', 'filter_group', display_order=1
        )
        self.product_types_config = create_filter_config(
            'Product Types', 'product_types', 'filter_group', display_order=2
        )

        # Groups
        self.material_group = create_filter_group('Material', code='MATERIAL')
        self.core_group = create_filter_group('Core Study Materials', code='CORE')
        self.revision_group = create_filter_group('Revision Materials', code='REVISION')
        assign_group_to_config(self.categories_config, self.material_group)
        assign_group_to_config(self.product_types_config, self.core_group)
        assign_group_to_config(self.product_types_config, self.revision_group)

        # Exam session
        self.session = create_exam_session('2025-04')

        # Subject CM2 with 2 products
        self.cm2 = create_subject('CM2')
        self.cm2_ess = create_exam_session_subject(self.session, self.cm2)
        self.cm2_catalog = create_catalog_product('CM2 Materials', 'CM2 Mat', 'PCM2')
        self.printed = create_product_variation('Printed', 'Standard Printed', code='P')
        self.ebook = create_product_variation('eBook', 'Standard eBook', code='E')

        self.cm2_printed = create_store_product(
            self.cm2_ess, self.cm2_catalog, self.printed,
            product_code='CM2/PCM2/2025-04'
        )
        assign_product_to_group(self.cm2_catalog, self.material_group)
        assign_product_to_group(self.cm2_catalog, self.core_group)

        # CM2 revision product (different catalog product)
        self.cm2_rev_catalog = create_catalog_product('CM2 Revision', 'CM2 Rev', 'RCM2')
        self.cm2_ebook = create_store_product(
            self.cm2_ess, self.cm2_rev_catalog, self.ebook,
            product_code='CM2/ERCM2/2025-04'
        )
        assign_product_to_group(self.cm2_rev_catalog, self.material_group)
        assign_product_to_group(self.cm2_rev_catalog, self.revision_group)

        # Subject SA1 with 1 product
        self.sa1 = create_subject('SA1')
        self.sa1_ess = create_exam_session_subject(self.session, self.sa1)
        self.sa1_catalog = create_catalog_product('SA1 Materials', 'SA1 Mat', 'PSA1')
        self.sa1_printed = create_store_product(
            self.sa1_ess, self.sa1_catalog, self.printed,
            product_code='SA1/PSA1/2025-04'
        )
        assign_product_to_group(self.sa1_catalog, self.material_group)
        assign_product_to_group(self.sa1_catalog, self.core_group)

        self.service = SearchService()

    def test_no_filters_counts_total_catalog(self):
        """T017: With no filters, counts reflect entire catalog.

        Subject counts: CM2=2, SA1=1
        Category counts: Material=3 (all products in Material group)
        Product type counts: Core Study=2, Revision=1
        """
        base_qs = StoreProduct.objects.filter(is_active=True)
        counts = self.service.filter_service.generate_filter_counts(base_qs)

        # Subject counts should include all subjects
        self.assertIn('CM2', counts['subjects'])
        self.assertIn('SA1', counts['subjects'])
        self.assertEqual(counts['subjects']['CM2']['count'], 2)
        self.assertEqual(counts['subjects']['SA1']['count'], 1)

        # Category: Material has all 3 products
        self.assertIn('Material', counts['categories'])
        self.assertEqual(counts['categories']['Material']['count'], 3)

        # Product types: Core=2, Revision=1
        self.assertIn('Core Study Materials', counts['product_types'])
        self.assertEqual(counts['product_types']['Core Study Materials']['count'], 2)
        self.assertIn('Revision Materials', counts['product_types'])
        self.assertEqual(counts['product_types']['Revision Materials']['count'], 1)

    def test_subject_filter_affects_category_counts(self):
        """T018: With subject=CM2, category counts reflect only CM2 products.

        When subject filter is active, category counts should only count
        CM2 products (2), not SA1 products.
        """
        base_qs = StoreProduct.objects.filter(is_active=True)
        filters = {'subjects': ['CM2']}
        counts = self.service.filter_service.generate_filter_counts(base_qs, filters=filters)

        # Category counts should reflect only CM2 products
        self.assertIn('Material', counts['categories'])
        self.assertEqual(
            counts['categories']['Material']['count'], 2,
            "With subject=CM2, Material should count only CM2 products (2)"
        )

        # Product type counts should also reflect only CM2
        self.assertIn('Core Study Materials', counts['product_types'])
        self.assertEqual(counts['product_types']['Core Study Materials']['count'], 1)
        self.assertIn('Revision Materials', counts['product_types'])
        self.assertEqual(counts['product_types']['Revision Materials']['count'], 1)

    def test_multi_filter_disjunctive_counts(self):
        """T019: With subject=CM2 + category=Material, product_type counts
        reflect both filters applied.

        Product type dimension should show counts from the queryset
        filtered by both subject=CM2 AND category=Material.
        """
        base_qs = StoreProduct.objects.filter(is_active=True)
        filters = {'subjects': ['CM2'], 'categories': ['Material']}
        counts = self.service.filter_service.generate_filter_counts(base_qs, filters=filters)

        # Product type counts should reflect CM2 + Material intersection
        self.assertIn('Core Study Materials', counts['product_types'])
        self.assertEqual(counts['product_types']['Core Study Materials']['count'], 1)
        self.assertIn('Revision Materials', counts['product_types'])
        self.assertEqual(counts['product_types']['Revision Materials']['count'], 1)

    def test_dimension_excludes_own_filter(self):
        """T020: Subject dimension counts exclude subject filter.

        When subject=CM2 is active, subject dimension should still show
        counts for ALL subjects (including SA1), because the subject
        dimension excludes its own filter for counting.
        """
        base_qs = StoreProduct.objects.filter(is_active=True)
        filters = {'subjects': ['CM2']}
        counts = self.service.filter_service.generate_filter_counts(base_qs, filters=filters)

        # Subject counts should still show ALL subjects
        self.assertIn('CM2', counts['subjects'])
        self.assertIn('SA1', counts['subjects'])
        self.assertEqual(
            counts['subjects']['CM2']['count'], 2,
            "Subject dimension should exclude own filter - CM2 should still show 2"
        )
        self.assertEqual(
            counts['subjects']['SA1']['count'], 1,
            "Subject dimension should exclude own filter - SA1 should still show 1"
        )

    def test_zero_count_entries_included(self):
        """T021: Zero-count entries ARE included in API response.

        Backend returns all options including zero-count ones.
        The frontend is responsible for hiding them (FR-013).
        """
        base_qs = StoreProduct.objects.filter(is_active=True)
        # Filter to only CM2 + Core Study Materials
        # Revision should have 0 count for category perspective
        # (since we filter by product_type=Core Study, categories should
        # show Material with only core products)
        filters = {'product_types': ['Core Study Materials']}
        counts = self.service.filter_service.generate_filter_counts(base_qs, filters=filters)

        # With product_type=Core Study, the product_types dimension should
        # still show Revision Materials (self-exclusion applies to own dimension)
        self.assertIn('Revision Materials', counts['product_types'],
                       "Zero-count entries should be included in response")
