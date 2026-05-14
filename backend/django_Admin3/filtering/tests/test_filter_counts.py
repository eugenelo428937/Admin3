"""Tests for ProductFilterService.generate_filter_counts() (US2).

Validates that filter count generation:
- Returns 5 dimensions: subjects, categories, product_types, products, modes_of_delivery
- Each entry has {count: int, name: str} structure
- Disjunctive faceting: subject filter does not affect subject counts
"""
from django.test import TestCase

from filtering.services.filter_service import ProductFilterService
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
from store.models import Product as StoreProduct


class GenerateFilterCountsContractTest(TestCase):
    """Test generate_filter_counts() return structure."""

    def setUp(self):
        self.service = ProductFilterService()

        # Create filter configurations — dispatcher only generates buckets for
        # active FilterConfiguration rows, so each asserted filter_key must have one.
        self.subj_config = create_filter_config(
            'SUBJECTS', 'subjects', 'subject', display_order=0
        )
        self.cat_config = create_filter_config(
            'Categories', 'categories', display_order=1
        )
        self.type_config = create_filter_config(
            'Product Types', 'product_types', display_order=2
        )
        self.modes_config = create_filter_config(
            'Modes of Delivery', 'modes_of_delivery', display_order=3
        )

        # Create groups and assign to configs
        self.material = create_filter_group('Material', code='MATERIAL')
        assign_group_to_config(self.cat_config, self.material)

        self.core = create_filter_group('Core Study Material', code='CORE')
        assign_group_to_config(self.type_config, self.core)

        # Create products
        self.subject = create_subject('CS2')
        self.exam_session = create_exam_session('2025-04')
        self.ess = create_exam_session_subject(self.exam_session, self.subject)
        self.printed = create_product_variation('Printed', 'Standard Printed', code='P')

        self.cat_prod = create_catalog_product('CS2 Course Notes', 'CS2 Course Notes', 'CN01')
        self.sp = create_store_product(
            self.ess, self.cat_prod, self.printed, product_code='CS2/PCN01/2025-04',
        )
        assign_product_to_group(self.cat_prod, self.material)
        assign_product_to_group(self.cat_prod, self.core)

    def test_returns_dict_with_active_filter_keys(self):
        """generate_filter_counts() returns dict keyed by active FilterConfiguration.filter_key."""
        base_qs = StoreProduct.objects.filter(is_active=True)
        counts = self.service.generate_filter_counts(base_qs)

        # Every active FilterConfiguration created in setUp must appear as a key.
        self.assertIn('subjects', counts)
        self.assertIn('categories', counts)
        self.assertIn('product_types', counts)
        self.assertIn('modes_of_delivery', counts)

    def test_dimension_entry_has_count_and_name(self):
        """Each dimension entry has {count: int, name: str} structure."""
        base_qs = StoreProduct.objects.filter(is_active=True)
        counts = self.service.generate_filter_counts(base_qs)

        # Check subjects dimension
        for key, entry in counts['subjects'].items():
            self.assertIn('count', entry)
            self.assertIn('name', entry)
            self.assertIsInstance(entry['count'], int)
            self.assertIsInstance(entry['name'], str)

    def test_empty_filters_returns_all_active_counts(self):
        """Empty filters returns counts for all active products."""
        base_qs = StoreProduct.objects.filter(is_active=True)
        counts = self.service.generate_filter_counts(base_qs, filters={})

        # Should have at least CS2 subject
        self.assertIn('CS2', counts['subjects'])
        self.assertGreater(counts['subjects']['CS2']['count'], 0)

    def test_disjunctive_faceting_subject_filter(self):
        """FR-006: Subject filter does not affect subject counts."""
        # Create a second subject with products
        subject_cm2 = create_subject('CM2')
        ess_cm2 = create_exam_session_subject(self.exam_session, subject_cm2)
        cat_prod2 = create_catalog_product('CM2 Study Text', 'CM2 Study Text', 'ST01')
        create_store_product(ess_cm2, cat_prod2, self.printed, product_code='CM2/PST01/2025-04')
        assign_product_to_group(cat_prod2, self.material)

        base_qs = StoreProduct.objects.filter(is_active=True)

        # Filter by CS2 only
        counts = self.service.generate_filter_counts(
            base_qs, filters={'subjects': ['CS2']}
        )

        # Disjunctive: subject counts should still show BOTH subjects
        self.assertIn('CS2', counts['subjects'])
        self.assertIn('CM2', counts['subjects'])

    def test_empty_result_set_returns_zero_counts(self):
        """Edge case: Empty result set returns empty buckets for configured dimensions."""
        base_qs = StoreProduct.objects.none()
        counts = self.service.generate_filter_counts(base_qs)

        # Dimensions backed by a FilterConfiguration must exist; all counts are 0.
        self.assertEqual(counts['subjects'], {})
        self.assertEqual(counts['modes_of_delivery'], {})
