"""Tests for US3: Hierarchical Filter Resolution.

Selecting a parent group includes products from all descendant groups.
The filter system uses FilterGroup.get_descendants() to expand selections
to include children at every depth level.

Example: If "Material" has children "Core Study Materials" and "Revision Materials",
selecting "Material" should include products from both children.
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


class TestHierarchyResolution(TestCase):
    """Test hierarchical filter resolution across filter dimensions."""

    def setUp(self):
        """Create hierarchical group structure with products at different levels.

        Hierarchy:
            Material (parent)
            ├── Core Study Materials (child)
            └── Revision Materials (child)

        Products:
        - CM2 Course Notes: assigned to Core Study Materials (child)
        - CM2 Revision Kit: assigned to Revision Materials (child)
        - CM2 Combined Pack: assigned to Material (parent) directly
        """
        # Filter configs
        self.categories_config = create_filter_config(
            'Categories', 'categories', 'filter_group', display_order=1
        )
        self.product_types_config = create_filter_config(
            'Product Types', 'product_types', 'filter_group', display_order=2
        )

        # Hierarchical groups - Material is parent of Core and Revision
        self.material = create_filter_group('Material', code='MATERIAL')
        self.core = create_filter_group(
            'Core Study Materials', code='CORE', parent=self.material
        )
        self.revision = create_filter_group(
            'Revision Materials', code='REVISION', parent=self.material
        )

        # Assign groups to configs
        assign_group_to_config(self.categories_config, self.material)
        assign_group_to_config(self.categories_config, self.core)
        assign_group_to_config(self.categories_config, self.revision)
        assign_group_to_config(self.product_types_config, self.core)
        assign_group_to_config(self.product_types_config, self.revision)

        # Exam session and subject
        self.session = create_exam_session('2025-04')
        self.cm2 = create_subject('CM2')
        self.cm2_ess = create_exam_session_subject(self.session, self.cm2)
        self.printed = create_product_variation('Printed', 'Standard Printed', code='P')

        # Product 1: Course Notes → assigned to Core Study Materials (child)
        self.notes_catalog = create_catalog_product(
            'CM2 Course Notes', 'Course Notes', 'PCSN'
        )
        self.notes_product = create_store_product(
            self.cm2_ess, self.notes_catalog, self.printed,
            product_code='CM2/PCSN/2025-04'
        )
        assign_product_to_group(self.notes_catalog, self.core)

        # Product 2: Revision Kit → assigned to Revision Materials (child)
        self.revision_catalog = create_catalog_product(
            'CM2 Revision Kit', 'Revision Kit', 'PRK'
        )
        self.revision_product = create_store_product(
            self.cm2_ess, self.revision_catalog, self.printed,
            product_code='CM2/PRK/2025-04'
        )
        assign_product_to_group(self.revision_catalog, self.revision)

        # Product 3: Combined Pack → assigned to Material (parent) directly
        self.combined_catalog = create_catalog_product(
            'CM2 Combined Pack', 'Combined Pack', 'PCP'
        )
        self.combined_product = create_store_product(
            self.cm2_ess, self.combined_catalog, self.printed,
            product_code='CM2/PCP/2025-04'
        )
        assign_product_to_group(self.combined_catalog, self.material)

        self.service = SearchService()

    def test_parent_includes_children(self):
        """T028: Selecting parent group includes child group products.

        Filtering by "Material" should return products from both
        "Core Study Materials" and "Revision Materials" children,
        plus any products directly assigned to "Material".
        """
        base_qs = StoreProduct.objects.filter(is_active=True)
        filters = {'categories': ['Material']}
        filtered_qs = self.service._apply_filters(base_qs, filters)

        product_codes = set(filtered_qs.values_list('product_code', flat=True))

        # Should include all 3: child products + direct parent product
        self.assertIn('CM2/PCSN/2025-04', product_codes,
                       "Parent filter should include Core child product")
        self.assertIn('CM2/PRK/2025-04', product_codes,
                       "Parent filter should include Revision child product")
        self.assertIn('CM2/PCP/2025-04', product_codes,
                       "Parent filter should include directly assigned product")
        self.assertEqual(len(product_codes), 3)

    def test_grandparent_includes_all_descendants(self):
        """T029: Multi-level hierarchy resolves all descendants.

        Add a grandchild level and verify 3-level deep resolution.
        """
        # Add grandchild: Core Study Materials > Study Text
        study_text = create_filter_group(
            'Study Text', code='STUDY_TEXT', parent=self.core
        )
        assign_group_to_config(self.categories_config, study_text)

        # Create product assigned to grandchild
        text_catalog = create_catalog_product(
            'CM2 Study Text', 'Study Text', 'PST'
        )
        text_product = create_store_product(
            self.cm2_ess, text_catalog, self.printed,
            product_code='CM2/PST/2025-04'
        )
        assign_product_to_group(text_catalog, study_text)

        base_qs = StoreProduct.objects.filter(is_active=True)
        filters = {'categories': ['Material']}
        filtered_qs = self.service._apply_filters(base_qs, filters)

        product_codes = set(filtered_qs.values_list('product_code', flat=True))

        # Should include grandchild product too
        self.assertIn('CM2/PST/2025-04', product_codes,
                       "Grandparent filter should include grandchild product")
        self.assertEqual(len(product_codes), 4)

    def test_leaf_returns_direct_only(self):
        """T030: Leaf group returns only directly assigned products.

        Selecting "Core Study Materials" (a leaf in original setup) should
        only return products directly assigned to that group.
        """
        base_qs = StoreProduct.objects.filter(is_active=True)
        filters = {'categories': ['Core Study Materials']}
        filtered_qs = self.service._apply_filters(base_qs, filters)

        product_codes = set(filtered_qs.values_list('product_code', flat=True))

        # Only the Course Notes product is assigned to Core
        self.assertIn('CM2/PCSN/2025-04', product_codes)
        self.assertEqual(len(product_codes), 1,
                         "Leaf filter should only return directly assigned products")

    def test_parent_with_direct_products(self):
        """T031: Group with direct products AND children returns both.

        Material has a directly assigned product (Combined Pack) AND
        child groups with their own products. All should be included.
        """
        base_qs = StoreProduct.objects.filter(is_active=True)
        filters = {'categories': ['Material']}
        filtered_qs = self.service._apply_filters(base_qs, filters)

        product_codes = set(filtered_qs.values_list('product_code', flat=True))

        # Direct product
        self.assertIn('CM2/PCP/2025-04', product_codes,
                       "Should include product directly assigned to parent")
        # Child products
        self.assertIn('CM2/PCSN/2025-04', product_codes,
                       "Should include child group product")
        self.assertIn('CM2/PRK/2025-04', product_codes,
                       "Should include child group product")

    def test_hierarchy_aware_counts(self):
        """T032: Filter counts reflect descendant products.

        When computing counts for the "Material" group, the count should
        include products from all descendant groups.
        """
        base_qs = StoreProduct.objects.filter(is_active=True)
        counts = self.service._generate_filter_counts(base_qs)

        # Material should count all 3 products (1 direct + 2 from children)
        self.assertIn('Material', counts['categories'])
        self.assertEqual(
            counts['categories']['Material']['count'], 3,
            "Material count should include direct + descendant products"
        )

        # Core should count 1 (direct only — it's a leaf)
        self.assertIn('Core Study Materials', counts['categories'])
        self.assertEqual(
            counts['categories']['Core Study Materials']['count'], 1,
            "Core count should include only direct products"
        )

        # Revision should count 1 (direct only — it's a leaf)
        self.assertIn('Revision Materials', counts['categories'])
        self.assertEqual(
            counts['categories']['Revision Materials']['count'], 1,
            "Revision count should include only direct products"
        )
