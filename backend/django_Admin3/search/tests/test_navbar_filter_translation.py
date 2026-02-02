"""Tests for SearchService._translate_navbar_filters() (US3).

Validates that navbar GET parameters are translated to the standard filter dict
format and processed through ProductFilterService, eliminating the separate
navbar filter code path.
"""
from django.test import TestCase

from search.services.search_service import SearchService
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


class TranslateNavbarFiltersTest(TestCase):
    """Test _translate_navbar_filters translation mapping."""

    def setUp(self):
        self.service = SearchService()

    def test_group_translates_to_categories(self):
        """R5: 'group' param translates to categories list."""
        result = self.service._translate_navbar_filters({'group': 'PRINTED'})
        self.assertIn('categories', result)
        self.assertIn('PRINTED', result['categories'])

    def test_tutorial_format_appends_to_categories(self):
        """R5: 'tutorial_format' param appends to categories list."""
        result = self.service._translate_navbar_filters({'tutorial_format': 'face_to_face'})
        self.assertIn('categories', result)
        self.assertIn('face_to_face', result['categories'])

    def test_product_translates_to_product_ids(self):
        """R5: 'product' param translates to product_ids list."""
        result = self.service._translate_navbar_filters({'product': '42'})
        self.assertIn('product_ids', result)
        self.assertIn('42', result['product_ids'])

    def test_distance_learning_maps_to_material(self):
        """R5: 'distance_learning' param maps to 'Material' in categories."""
        result = self.service._translate_navbar_filters({'distance_learning': 'true'})
        self.assertIn('categories', result)
        self.assertIn('Material', result['categories'])

    def test_multiple_params_combine(self):
        """Multiple navbar params combine correctly."""
        result = self.service._translate_navbar_filters({
            'group': 'PRINTED',
            'tutorial_format': 'face_to_face',
            'product': '42',
        })
        self.assertIn('PRINTED', result.get('categories', []))
        self.assertIn('face_to_face', result.get('categories', []))
        self.assertIn('42', result.get('product_ids', []))

    def test_empty_navbar_filters_returns_empty_dict(self):
        """Empty navbar_filters returns empty filter dict."""
        result = self.service._translate_navbar_filters({})
        # Should be empty or have only empty lists
        has_values = any(bool(v) for v in result.values()) if result else False
        self.assertFalse(has_values, f"Expected empty result, got {result}")

    def test_none_navbar_filters_returns_empty_dict(self):
        """None navbar_filters returns empty filter dict."""
        result = self.service._translate_navbar_filters(None)
        has_values = any(bool(v) for v in result.values()) if result else False
        self.assertFalse(has_values)


class NavbarFilterConsistencyTest(TestCase):
    """Test SC-005: Navbar filters match equivalent filter panel selection."""

    def setUp(self):
        # Create filter config and group
        self.cat_config = create_filter_config('Categories', 'categories')
        self.printed_group = create_filter_group('PRINTED', code='PRINTED')
        assign_group_to_config(self.cat_config, self.printed_group)

        # Create products assigned to PRINTED group
        self.subject = create_subject('CS2')
        self.exam_session = create_exam_session('2025-04')
        self.ess = create_exam_session_subject(self.exam_session, self.subject)
        self.printed_var = create_product_variation('Printed', 'Standard Printed', code='P')

        self.cat_prod = create_catalog_product('CS2 Course Notes', 'CS2 Course Notes', 'CN01')
        assign_product_to_group(self.cat_prod, self.printed_group)
        self.sp = create_store_product(
            self.ess, self.cat_prod, self.printed_var, product_code='CS2/PCN01/2025-04',
        )

    def test_navbar_matches_panel_selection(self):
        """SC-005: Navbar group=PRINTED matches panel categories=['PRINTED']."""
        search_service = SearchService()
        filter_service = ProductFilterService()
        base_qs = StoreProduct.objects.filter(is_active=True)

        # Navbar path: translate then apply
        translated = search_service._translate_navbar_filters({'group': 'PRINTED'})
        navbar_result = filter_service.apply_store_product_filters(base_qs, translated)
        navbar_ids = set(navbar_result.values_list('id', flat=True))

        # Panel path: direct filter
        panel_result = filter_service.apply_store_product_filters(
            base_qs, {'categories': ['PRINTED']}
        )
        panel_ids = set(panel_result.values_list('id', flat=True))

        self.assertEqual(navbar_ids, panel_ids,
                         "Navbar and panel filters should produce identical results")
