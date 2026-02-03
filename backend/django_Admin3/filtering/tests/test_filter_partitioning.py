"""Tests for US1: Correct Filter Partitioning.

Categories and product_types must display distinct, non-overlapping filter
groups based on their FilterConfigurationGroup assignments.

These tests verify that _generate_filter_counts() in search_service.py
uses FilterConfigurationGroup to partition groups into the correct
filter dimensions, rather than dumping all groups into both.
"""
from django.test import TestCase

from filtering.tests.factories import (
    create_filter_config,
    create_filter_group,
    assign_group_to_config,
)
from search.tests.factories import (
    create_catalog_dependencies,
    create_store_product,
    assign_product_to_group,
)
from search.services.search_service import SearchService


class TestFilterPartitioning(TestCase):
    """Verify categories and product_types are partitioned by FilterConfigurationGroup."""

    def setUp(self):
        """Set up filter configs and groups with distinct assignments.

        Creates:
        - 'categories' config with groups: Material, Tutorial
        - 'product_types' config with groups: Core Study, Revision
        - 'unassigned_group' not assigned to any config
        - Products assigned to various groups
        """
        # Create filter configurations
        self.categories_config = create_filter_config(
            'Categories', 'categories', 'filter_group', display_order=1
        )
        self.product_types_config = create_filter_config(
            'Product Types', 'product_types', 'filter_group', display_order=2
        )

        # Create groups assigned to categories
        self.material_group = create_filter_group('Material', code='MATERIAL')
        self.tutorial_group = create_filter_group('Tutorial', code='TUTORIAL')
        assign_group_to_config(self.categories_config, self.material_group)
        assign_group_to_config(self.categories_config, self.tutorial_group)

        # Create groups assigned to product_types
        self.core_group = create_filter_group('Core Study Materials', code='CORE')
        self.revision_group = create_filter_group('Revision Materials', code='REVISION')
        assign_group_to_config(self.product_types_config, self.core_group)
        assign_group_to_config(self.product_types_config, self.revision_group)

        # Create an unassigned group (should not appear in any filter)
        self.unassigned_group = create_filter_group('Unassigned Group', code='UNASSIGNED')

        # Create catalog dependencies and products
        deps = create_catalog_dependencies('CM2', '2025-04')
        self.ess = deps['exam_session_subject']

        # Create store products and assign to groups
        self.product_material = create_store_product(
            self.ess, deps['product'], deps['printed_variation'],
            product_code='CM2/PCM2/2025-04',
        )
        assign_product_to_group(deps['product'], self.material_group)
        assign_product_to_group(deps['product'], self.core_group)

        # Create a second catalog product for revision
        from search.tests.factories import create_catalog_product, create_product_variation
        self.revision_catalog = create_catalog_product(
            'CM2 Revision Kit', 'CM2 RevKit', 'RK2'
        )
        revision_var = create_product_variation('eBook', 'Revision eBook', code='RE')
        self.product_revision = create_store_product(
            self.ess, self.revision_catalog, revision_var,
            product_code='CM2/RERK2/2025-04',
        )
        assign_product_to_group(self.revision_catalog, self.revision_group)

        # Product assigned to unassigned group
        assign_product_to_group(self.revision_catalog, self.unassigned_group)

        self.service = SearchService()

    def test_categories_and_product_types_are_distinct(self):
        """Categories and product_types contain non-overlapping group sets.

        T007: The current broken implementation puts ALL groups in both
        categories and product_types. After fix, each should only contain
        groups assigned via FilterConfigurationGroup.
        """
        from store.models import Product as StoreProduct
        base_qs = StoreProduct.objects.filter(is_active=True)
        counts = self.service.filter_service.generate_filter_counts(base_qs)

        category_names = set(counts['categories'].keys()) - {'Bundle'}
        product_type_names = set(counts['product_types'].keys())

        # Categories should only contain Material and Tutorial
        self.assertTrue(
            category_names.issubset({'Material', 'Tutorial'}),
            f"Categories should only contain category-assigned groups, got: {category_names}"
        )

        # Product types should only contain Core Study Materials and Revision Materials
        self.assertTrue(
            product_type_names.issubset({'Core Study Materials', 'Revision Materials'}),
            f"Product types should only contain type-assigned groups, got: {product_type_names}"
        )

        # They should NOT overlap
        overlap = category_names & product_type_names
        self.assertEqual(
            overlap, set(),
            f"Categories and product_types should not overlap, but share: {overlap}"
        )

    def test_unassigned_groups_excluded(self):
        """Groups not assigned to any FilterConfigurationGroup do not appear.

        T008: 'Unassigned Group' has products but isn't assigned to any
        FilterConfiguration, so it should not appear in categories or
        product_types filter counts.
        """
        from store.models import Product as StoreProduct
        base_qs = StoreProduct.objects.filter(is_active=True)
        counts = self.service.filter_service.generate_filter_counts(base_qs)

        all_category_keys = set(counts['categories'].keys())
        all_type_keys = set(counts['product_types'].keys())

        self.assertNotIn(
            'Unassigned Group', all_category_keys,
            "Unassigned groups should not appear in categories"
        )
        self.assertNotIn(
            'Unassigned Group', all_type_keys,
            "Unassigned groups should not appear in product_types"
        )

    def test_dual_assignment_respected(self):
        """A group assigned to both configs appears in both sections.

        T009: If a group is intentionally assigned to BOTH categories and
        product_types configs, it should appear in both.
        """
        # Create a group assigned to both configs
        dual_group = create_filter_group('Dual Purpose Group', code='DUAL')
        assign_group_to_config(self.categories_config, dual_group)
        assign_group_to_config(self.product_types_config, dual_group)

        # Assign a product to the dual group
        assign_product_to_group(self.revision_catalog, dual_group)

        from store.models import Product as StoreProduct
        base_qs = StoreProduct.objects.filter(is_active=True)
        counts = self.service.filter_service.generate_filter_counts(base_qs)

        self.assertIn(
            'Dual Purpose Group', counts['categories'],
            "Dual-assigned group should appear in categories"
        )
        self.assertIn(
            'Dual Purpose Group', counts['product_types'],
            "Dual-assigned group should appear in product_types"
        )
