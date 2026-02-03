"""Additional serializer tests to cover remaining 3% gap.

Covers edge cases in search/serializers.py not covered by test_serializers.py:
- StoreProductListSerializer.serialize_grouped_products with recommendations
- StoreProductListSerializer._serialize_recommendation additional paths
- ProductSearchRequestSerializer edge validation cases
- __all__ module export
"""
from decimal import Decimal
from unittest.mock import MagicMock, patch, PropertyMock

from django.test import TestCase

from search.serializers import (
    StoreProductListSerializer,
    ProductSearchRequestSerializer,
    FilterCountSerializer,
    ProductSearchPaginationSerializer,
    ProductSearchResponseSerializer,
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
from store.models import Price


class TestSerializeGroupedProductsRecommendationIntegration(TestCase):
    """Test serialize_grouped_products with recommendation attached."""

    def setUp(self):
        self.subject = create_subject('SRCH_SRI')
        self.session = create_exam_session('2025-04')
        self.ess = create_exam_session_subject(self.session, self.subject)

        self.catalog = create_catalog_product(
            'SRCH SRI Materials', 'SRCH SRI Mat', 'SRIPROD'
        )
        self.printed = create_product_variation('Printed', 'Printed', code='SRIP')
        self.ebook = create_product_variation('eBook', 'eBook', code='SRIE')

        self.sp_printed = create_store_product(
            self.ess, self.catalog, self.printed,
            product_code='SRCH_SRI/SRIPSRIPROD/2025-04'
        )

        # Create recommended product
        self.rec_catalog = create_catalog_product(
            'SRCH SRI Marking', 'SRCH SRI Mark', 'SRIMARK'
        )
        self.marking_var = create_product_variation('Marking', 'Marking', code='SRIM')
        self.sp_rec = create_store_product(
            self.ess, self.rec_catalog, self.marking_var,
            product_code='SRCH_SRI/SRIMSRIMARK/2025-04'
        )
        Price.objects.create(
            product=self.sp_rec, price_type='standard',
            amount=Decimal('19.99'), currency='GBP'
        )

    def test_recommendation_included_in_variation(self):
        """When PPV has recommendation, it appears in variation data."""
        from catalog.products.recommendation.models import ProductVariationRecommendation

        source_ppv = self.sp_printed.product_product_variation
        rec_ppv = self.sp_rec.product_product_variation

        ProductVariationRecommendation.objects.create(
            product_product_variation=source_ppv,
            recommended_product_product_variation=rec_ppv,
        )

        # Re-fetch to get recommendation prefetch
        from store.models import Product as StoreProduct
        from django.db.models import Prefetch
        sp = StoreProduct.objects.select_related(
            'exam_session_subject__subject',
            'exam_session_subject__exam_session',
            'product_product_variation__product',
            'product_product_variation__product_variation',
        ).prefetch_related(
            'prices',
            'product_product_variation__product__groups',
            Prefetch(
                'product_product_variation__recommendation',
                queryset=ProductVariationRecommendation.objects.select_related(
                    'recommended_product_product_variation__product',
                    'recommended_product_product_variation__product_variation'
                )
            )
        ).get(id=self.sp_printed.id)

        result = StoreProductListSerializer.serialize_grouped_products([sp])
        variation = result[0]['variations'][0]
        self.assertIn('recommended_product', variation)
        self.assertIsNotNone(variation['recommended_product'])
        self.assertEqual(variation['recommended_product']['product_name'], 'SRCH SRI Marking')

    def test_no_recommendation_no_key(self):
        """When PPV has no recommendation, key is not in variation data."""
        result = StoreProductListSerializer.serialize_grouped_products([self.sp_printed])
        variation = result[0]['variations'][0]
        # recommendation key should not be present since no recommendation exists
        self.assertNotIn('recommended_product', variation)


class TestGetProductTypeEdgeCases(TestCase):
    """Test _get_product_type additional edge cases."""

    def test_product_without_groups_attribute(self):
        """Product without groups attribute falls back to name check."""
        mock_product = MagicMock()
        mock_product.fullname = 'Some Marking Product'
        # hasattr check for 'groups' should work via mock
        del mock_product.groups
        result = StoreProductListSerializer._get_product_type(mock_product)
        self.assertEqual(result, 'Markings')

    def test_product_with_empty_groups(self):
        """Product with no group assignments falls back to name."""
        catalog = create_catalog_product(
            'SRCH_GPT Tutorial Sessions', 'SRCH_GPT Tut', 'SGPTTUT'
        )
        # No groups assigned
        result = StoreProductListSerializer._get_product_type(catalog)
        self.assertEqual(result, 'Tutorial')

    def test_product_with_none_fullname(self):
        """Product with None fullname returns Materials."""
        catalog = create_catalog_product(
            fullname='', shortname='Short', code='SGPTNONE'
        )
        result = StoreProductListSerializer._get_product_type(catalog)
        self.assertEqual(result, 'Materials')


class TestProductSearchRequestSerializerEdgeCases(TestCase):
    """Test ProductSearchRequestSerializer edge validation cases."""

    def test_pagination_page_size_exactly_1(self):
        """page_size=1 is valid."""
        data = {'pagination': {'page': 1, 'page_size': 1}}
        serializer = ProductSearchRequestSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_pagination_page_size_exactly_100(self):
        """page_size=100 is valid (boundary)."""
        data = {'pagination': {'page': 1, 'page_size': 100}}
        serializer = ProductSearchRequestSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_filters_with_all_valid_types(self):
        """All valid filter types accepted simultaneously."""
        data = {
            'filters': {
                'subjects': ['CM2'],
                'categories': ['Material'],
                'product_types': ['Core'],
                'products': ['1'],
                'essp_ids': ['2'],
                'product_ids': ['3'],
                'modes_of_delivery': ['eBook'],
            }
        }
        serializer = ProductSearchRequestSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_filters_multiple_invalid_types(self):
        """Multiple invalid filter types fail."""
        data = {
            'filters': {
                'bad_filter': ['value'],
                'another_bad': ['value'],
            }
        }
        serializer = ProductSearchRequestSerializer(data=data)
        self.assertFalse(serializer.is_valid())

    def test_options_with_any_dict(self):
        """Options field accepts any dict."""
        data = {
            'options': {
                'include_bundles': True,
                'include_analytics': False,
                'custom_option': 'value',
            }
        }
        serializer = ProductSearchRequestSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)


class TestModuleExports(TestCase):
    """Test serializers module __all__ exports."""

    def test_all_exports(self):
        """__all__ contains expected serializer classes."""
        from search import serializers
        expected = [
            'StoreProductListSerializer',
            'ProductSearchRequestSerializer',
            'FilterCountSerializer',
            'ProductSearchPaginationSerializer',
            'ProductSearchResponseSerializer',
        ]
        for name in expected:
            self.assertIn(name, serializers.__all__)
            self.assertTrue(hasattr(serializers, name))
