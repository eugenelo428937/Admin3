"""Tests for US4: Bundle Filtering Across All Dimensions.

Bundles must be filtered by ALL active filter dimensions (not just subject),
using single-product matching semantics: a bundle qualifies if at least one
of its component products satisfies ALL active filter conditions simultaneously.

Example: If category=Core Study Materials is active, only bundles containing
at least one Core Study Materials product should appear.
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
    create_bundle_with_products,
    assign_product_to_group,
)
from search.services.search_service import SearchService
from store.models import Bundle as StoreBundle


class TestBundleFiltering(TestCase):
    """Test bundle filtering across all dimensions."""

    def setUp(self):
        """Create test data with bundles containing different product types.

        Data setup:
        - Subject CM2:
          - cm2_core_printed: Core Study Materials, Printed
          - cm2_revision_ebook: Revision Materials, eBook
          - bundle_cm2_full: contains both products (Core + Revision)
          - bundle_cm2_core: contains only cm2_core_printed (Core only)

        - Subject SA1:
          - sa1_core_printed: Core Study Materials, Printed
          - bundle_sa1: contains sa1_core_printed

        Filter configurations:
          - Categories: Material group
          - Product Types: Core Study Materials, Revision Materials
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

        # Variations
        self.printed = create_product_variation('Printed', 'Standard Printed', code='P')
        self.ebook = create_product_variation('eBook', 'Standard eBook', code='E')

        # Exam session
        self.session = create_exam_session('2025-04')

        # --- CM2 products ---
        self.cm2 = create_subject('CM2')
        self.cm2_ess = create_exam_session_subject(self.session, self.cm2)

        # CM2 Core printed product
        self.cm2_core_catalog = create_catalog_product(
            'CM2 Core Materials', 'CM2 Core', 'PCM2C'
        )
        assign_product_to_group(self.cm2_core_catalog, self.material_group)
        assign_product_to_group(self.cm2_core_catalog, self.core_group)
        self.cm2_core_printed = create_store_product(
            self.cm2_ess, self.cm2_core_catalog, self.printed,
            product_code='CM2/PCM2C/P/2025-04'
        )

        # CM2 Revision ebook product
        self.cm2_rev_catalog = create_catalog_product(
            'CM2 Revision Kit', 'CM2 Rev', 'RCM2'
        )
        assign_product_to_group(self.cm2_rev_catalog, self.material_group)
        assign_product_to_group(self.cm2_rev_catalog, self.revision_group)
        self.cm2_revision_ebook = create_store_product(
            self.cm2_ess, self.cm2_rev_catalog, self.ebook,
            product_code='CM2/ERCM2/2025-04'
        )

        # CM2 bundle (full) — contains BOTH core and revision
        self.bundle_cm2_full, _ = create_bundle_with_products(
            self.cm2_ess,
            [self.cm2_core_printed, self.cm2_revision_ebook],
            bundle_name='CM2 Complete Study Pack'
        )

        # CM2 bundle (core only) — contains only core product
        self.bundle_cm2_core, _ = create_bundle_with_products(
            self.cm2_ess,
            [self.cm2_core_printed],
            bundle_name='CM2 Core Pack'
        )

        # --- SA1 products ---
        self.sa1 = create_subject('SA1')
        self.sa1_ess = create_exam_session_subject(self.session, self.sa1)

        self.sa1_core_catalog = create_catalog_product(
            'SA1 Core Materials', 'SA1 Core', 'PSA1C'
        )
        assign_product_to_group(self.sa1_core_catalog, self.material_group)
        assign_product_to_group(self.sa1_core_catalog, self.core_group)
        self.sa1_core_printed = create_store_product(
            self.sa1_ess, self.sa1_core_catalog, self.printed,
            product_code='SA1/PSA1C/P/2025-04'
        )

        # SA1 bundle — contains only SA1 core product
        self.bundle_sa1, _ = create_bundle_with_products(
            self.sa1_ess,
            [self.sa1_core_printed],
            bundle_name='SA1 Study Pack'
        )

        self.service = SearchService()

    def test_no_filters_returns_all_bundles(self):
        """T039: With no filters, all active bundles are returned.

        Expected: 3 bundles (CM2 Complete, CM2 Core, SA1 Study).
        """
        bundles = self.service._get_bundles(
            filters={}, search_query='', bundle_filter_active=False,
            no_fuzzy_results=False
        )
        self.assertEqual(len(bundles), 3)
        bundle_names = {b['bundle_name'] for b in bundles}
        self.assertIn('CM2 Complete Study Pack', bundle_names)
        self.assertIn('CM2 Core Pack', bundle_names)
        self.assertIn('SA1 Study Pack', bundle_names)

    def test_category_filter_applied_to_bundles(self):
        """T036: Bundles filtered by category — not just subject.

        With product_types=['Revision Materials'], only bundles containing
        at least one Revision Materials product should be returned.

        Expected: Only bundle_cm2_full (has a Revision product).
        bundle_cm2_core and bundle_sa1 should be excluded (no Revision products).
        """
        bundles = self.service._get_bundles(
            filters={'product_types': ['Revision Materials']},
            search_query='', bundle_filter_active=False,
            no_fuzzy_results=False
        )
        bundle_names = {b['bundle_name'] for b in bundles}
        self.assertIn('CM2 Complete Study Pack', bundle_names,
                       "Bundle with Revision product should be included")
        self.assertNotIn('CM2 Core Pack', bundle_names,
                          "Bundle without Revision product should be excluded")
        self.assertNotIn('SA1 Study Pack', bundle_names,
                          "Bundle without Revision product should be excluded")
        self.assertEqual(len(bundles), 1)

    def test_mode_of_delivery_filter_applied(self):
        """T037: Bundles filtered by mode of delivery.

        With modes_of_delivery=['eBook'], only bundles containing at least
        one eBook product should be returned.

        Expected: Only bundle_cm2_full (has an eBook product).
        bundle_cm2_core (only Printed) and bundle_sa1 (only Printed) excluded.
        """
        bundles = self.service._get_bundles(
            filters={'modes_of_delivery': ['eBook']},
            search_query='', bundle_filter_active=False,
            no_fuzzy_results=False
        )
        bundle_names = {b['bundle_name'] for b in bundles}
        self.assertIn('CM2 Complete Study Pack', bundle_names,
                       "Bundle with eBook product should be included")
        self.assertNotIn('CM2 Core Pack', bundle_names,
                          "Bundle with only Printed products should be excluded")
        self.assertNotIn('SA1 Study Pack', bundle_names,
                          "Bundle with only Printed products should be excluded")
        self.assertEqual(len(bundles), 1)

    def test_single_product_matches_all_dimensions(self):
        """T038: Single-product matching — one product must match ALL dimensions.

        With subjects=['CM2'] + product_types=['Core Study Materials'] +
        modes_of_delivery=['Printed']:
        - bundle_cm2_full qualifies: cm2_core_printed is CM2 + Core + Printed
        - bundle_cm2_core qualifies: cm2_core_printed is CM2 + Core + Printed
        - bundle_sa1 excluded: SA1 subject doesn't match

        If modes_of_delivery=['eBook'] instead:
        - bundle_cm2_full qualifies: cm2_revision_ebook is CM2 + eBook
          BUT cm2_revision_ebook is Revision, NOT Core Study Materials
          So NO single product is CM2 + Core + eBook → bundle excluded
        """
        # Case 1: CM2 + Core + Printed — both CM2 bundles match
        bundles = self.service._get_bundles(
            filters={
                'subjects': ['CM2'],
                'product_types': ['Core Study Materials'],
                'modes_of_delivery': ['Printed'],
            },
            search_query='', bundle_filter_active=False,
            no_fuzzy_results=False
        )
        bundle_names = {b['bundle_name'] for b in bundles}
        self.assertIn('CM2 Complete Study Pack', bundle_names)
        self.assertIn('CM2 Core Pack', bundle_names)
        self.assertNotIn('SA1 Study Pack', bundle_names)
        self.assertEqual(len(bundles), 2)

        # Case 2: CM2 + Core + eBook — NO single product matches all three
        bundles = self.service._get_bundles(
            filters={
                'subjects': ['CM2'],
                'product_types': ['Core Study Materials'],
                'modes_of_delivery': ['eBook'],
            },
            search_query='', bundle_filter_active=False,
            no_fuzzy_results=False
        )
        self.assertEqual(len(bundles), 0,
                         "No single product in any CM2 bundle is Core + eBook")

    def test_bundle_count_reflects_filters(self):
        """T040: Bundle count in filter_counts reflects filtered bundle count.

        With product_types=['Core Study Materials'], only bundles containing
        Core products should be counted.

        Expected: Bundle count = 3 (all bundles have Core products).

        With product_types=['Revision Materials'], only bundles with
        Revision products counted.

        Expected: Bundle count = 1 (only CM2 Complete has Revision).
        """
        from store.models import Product as StoreProduct
        base_qs = StoreProduct.objects.filter(is_active=True)

        # Case 1: Core filter — all bundles have at least one Core product
        counts = self.service._generate_filter_counts(
            base_qs, filters={'product_types': ['Core Study Materials']}
        )
        self.assertEqual(
            counts['categories']['Bundle']['count'], 3,
            "All 3 bundles contain Core Study Materials products"
        )

        # Case 2: Revision filter — only CM2 Complete has Revision
        counts = self.service._generate_filter_counts(
            base_qs, filters={'product_types': ['Revision Materials']}
        )
        self.assertEqual(
            counts['categories']['Bundle']['count'], 1,
            "Only CM2 Complete Study Pack has Revision Materials"
        )
