"""Tests for search serializers.

Covers StoreProductListSerializer (class-based, not DRF),
ProductSearchRequestSerializer validation logic,
FilterCountSerializer, ProductSearchPaginationSerializer,
and ProductSearchResponseSerializer.
"""
from decimal import Decimal
from unittest.mock import MagicMock, patch, PropertyMock

from django.test import TestCase
from rest_framework import serializers as drf_serializers

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


# ---------------------------------------------------------------------------
# StoreProductListSerializer tests
# ---------------------------------------------------------------------------

class TestStoreProductListSerializerGroupedProducts(TestCase):
    """Test StoreProductListSerializer.serialize_grouped_products."""

    def setUp(self):
        """Set up catalog dependencies and store products."""
        self.subject = create_subject('CM2')
        self.session = create_exam_session('2025-04')
        self.ess = create_exam_session_subject(self.session, self.subject)

        self.catalog_product = create_catalog_product(
            fullname='CM2 Combined Materials',
            shortname='CM2 Materials',
            code='PCM2',
        )
        self.printed = create_product_variation('Printed', 'Standard Printed', code='P')
        self.ebook = create_product_variation('eBook', 'Standard eBook', code='E')

        self.sp_printed = create_store_product(
            self.ess, self.catalog_product, self.printed,
            product_code='CM2/PPCM2/2025-04',
        )
        self.sp_ebook = create_store_product(
            self.ess, self.catalog_product, self.ebook,
            product_code='CM2/EPCM2/2025-04',
        )

        # Create prices for the printed product
        Price.objects.create(
            product=self.sp_printed,
            price_type='standard',
            amount=Decimal('49.99'),
            currency='GBP',
        )

    def test_groups_same_catalog_product_variations(self):
        """Variations of the same catalog product should be grouped together."""
        products = [self.sp_printed, self.sp_ebook]
        result = StoreProductListSerializer.serialize_grouped_products(products)

        self.assertEqual(len(result), 1, "Two variations of same product should group into 1")
        group = result[0]
        self.assertEqual(len(group['variations']), 2)

    def test_serialized_fields_present(self):
        """All required fields should be present in serialized output."""
        result = StoreProductListSerializer.serialize_grouped_products([self.sp_printed])
        self.assertEqual(len(result), 1)

        group = result[0]
        expected_keys = {
            'id', 'essp_id', 'store_product_id', 'type',
            'product_id', 'product_code', 'product_name',
            'product_short_name', 'product_description', 'buy_both',
            'subject_id', 'subject_code', 'subject_description',
            'exam_session_code', 'exam_session_id', 'variations',
        }
        self.assertTrue(expected_keys.issubset(set(group.keys())))

    def test_variation_includes_prices(self):
        """Variations should serialize associated prices."""
        result = StoreProductListSerializer.serialize_grouped_products([self.sp_printed])
        variation = result[0]['variations'][0]

        self.assertEqual(len(variation['prices']), 1)
        price = variation['prices'][0]
        self.assertEqual(price['price_type'], 'standard')
        self.assertEqual(price['amount'], '49.99')
        self.assertEqual(price['currency'], 'GBP')

    def test_variation_fields_present(self):
        """Variation data should have all expected fields."""
        result = StoreProductListSerializer.serialize_grouped_products([self.sp_printed])
        variation = result[0]['variations'][0]

        expected_keys = {
            'id', 'store_product_id', 'variation_type',
            'name', 'description', 'description_short', 'prices',
        }
        self.assertTrue(expected_keys.issubset(set(variation.keys())))

    def test_empty_list_returns_empty(self):
        """Empty input produces empty output."""
        result = StoreProductListSerializer.serialize_grouped_products([])
        self.assertEqual(result, [])

    def test_multiple_catalog_products_separate_groups(self):
        """Different catalog products produce separate groups."""
        other_catalog = create_catalog_product(
            fullname='CM2 Revision Kit',
            shortname='CM2 Rev',
            code='RCM2',
        )
        other_sp = create_store_product(
            self.ess, other_catalog, self.printed,
            product_code='CM2/PRCM2/2025-04',
        )

        result = StoreProductListSerializer.serialize_grouped_products(
            [self.sp_printed, other_sp]
        )
        self.assertEqual(len(result), 2)


class TestStoreProductListSerializerGetProductType(TestCase):
    """Test StoreProductListSerializer._get_product_type."""

    def setUp(self):
        from filtering.tests.factories import create_filter_group
        self.tutorial_group = create_filter_group('Tutorial Products', code='TUT')
        self.marking_group = create_filter_group('Marking Services', code='MARK')
        self.material_group = create_filter_group('Material', code='MAT')

    def test_tutorial_group(self):
        """Products in a tutorial group return 'Tutorial'."""
        catalog_product = create_catalog_product(
            fullname='CM2 Online Tutorial', shortname='CM2 Tut', code='TCMA'
        )
        assign_product_to_group(catalog_product, self.tutorial_group)

        result = StoreProductListSerializer._get_product_type(catalog_product)
        self.assertEqual(result, 'Tutorial')

    def test_marking_group(self):
        """Products in a marking group return 'Markings'."""
        catalog_product = create_catalog_product(
            fullname='CM2 Marking Service', shortname='CM2 Mark', code='MCM2'
        )
        assign_product_to_group(catalog_product, self.marking_group)

        result = StoreProductListSerializer._get_product_type(catalog_product)
        self.assertEqual(result, 'Markings')

    def test_default_materials(self):
        """Products in non-tutorial/non-marking groups return 'Materials'."""
        catalog_product = create_catalog_product(
            fullname='CM2 Study Materials', shortname='CM2 Mat', code='PCSM'
        )
        assign_product_to_group(catalog_product, self.material_group)

        result = StoreProductListSerializer._get_product_type(catalog_product)
        self.assertEqual(result, 'Materials')

    def test_fallback_tutorial_by_name(self):
        """Fullname containing 'tutorial' returns 'Tutorial' as fallback."""
        catalog_product = create_catalog_product(
            fullname='CB1 Tutorial Bundle', shortname='CB1 Tut', code='TCB1'
        )
        # No group assigned
        result = StoreProductListSerializer._get_product_type(catalog_product)
        self.assertEqual(result, 'Tutorial')

    def test_fallback_marking_by_name(self):
        """Fullname containing 'marking' returns 'Markings' as fallback."""
        catalog_product = create_catalog_product(
            fullname='CB1 Marking Pack', shortname='CB1 Mark', code='MCB1'
        )
        result = StoreProductListSerializer._get_product_type(catalog_product)
        self.assertEqual(result, 'Markings')

    def test_fallback_materials(self):
        """Fullname without tutorial/marking returns 'Materials' as fallback."""
        catalog_product = create_catalog_product(
            fullname='CB1 Core Study', shortname='CB1 Core', code='PCB1'
        )
        result = StoreProductListSerializer._get_product_type(catalog_product)
        self.assertEqual(result, 'Materials')

    def test_no_fullname_returns_materials(self):
        """Product with None fullname returns 'Materials'."""
        catalog_product = create_catalog_product(
            fullname='', shortname='CB1', code='PCB1X'
        )
        result = StoreProductListSerializer._get_product_type(catalog_product)
        self.assertEqual(result, 'Materials')


class TestStoreProductListSerializerTutorialEvents(TestCase):
    """Test StoreProductListSerializer._serialize_tutorial_events."""

    def test_serialize_tutorial_events_with_events(self):
        """Tutorial events are serialized with expected fields."""
        mock_event = MagicMock()
        mock_event.id = 1
        mock_event.code = 'TUT-LON-001'
        mock_event.venue = 'London'
        mock_event.is_soldout = False
        mock_event.finalisation_date = None
        mock_event.remain_space = 10
        mock_event.start_date = None
        mock_event.end_date = None

        mock_product = MagicMock()
        mock_product.tutorial_events.all.return_value = [mock_event]

        events = StoreProductListSerializer._serialize_tutorial_events(mock_product)
        self.assertEqual(len(events), 1)
        self.assertEqual(events[0]['code'], 'TUT-LON-001')
        self.assertEqual(events[0]['venue'], 'London')
        self.assertFalse(events[0]['is_soldout'])
        self.assertEqual(events[0]['remain_space'], 10)

    def test_serialize_tutorial_events_with_dates(self):
        """Tutorial events with dates serialize dates as ISO format."""
        from datetime import date
        mock_event = MagicMock()
        mock_event.id = 2
        mock_event.code = 'TUT-BRM-001'
        mock_event.venue = 'Birmingham'
        mock_event.is_soldout = True
        mock_event.finalisation_date = date(2025, 3, 15)
        mock_event.remain_space = 0
        mock_event.start_date = date(2025, 4, 1)
        mock_event.end_date = date(2025, 4, 5)

        mock_product = MagicMock()
        mock_product.tutorial_events.all.return_value = [mock_event]

        events = StoreProductListSerializer._serialize_tutorial_events(mock_product)
        self.assertEqual(events[0]['finalisation_date'], '2025-03-15')
        self.assertEqual(events[0]['start_date'], '2025-04-01')
        self.assertEqual(events[0]['end_date'], '2025-04-05')

    def test_serialize_tutorial_events_empty(self):
        """Empty tutorial events list returns empty list."""
        mock_product = MagicMock()
        mock_product.tutorial_events.all.return_value = []

        events = StoreProductListSerializer._serialize_tutorial_events(mock_product)
        self.assertEqual(events, [])

    def test_serialize_tutorial_events_exception_returns_empty(self):
        """If tutorial_events access raises exception, returns empty list."""
        mock_product = MagicMock()
        mock_product.tutorial_events.all.side_effect = AttributeError("no events")

        events = StoreProductListSerializer._serialize_tutorial_events(mock_product)
        self.assertEqual(events, [])


class TestStoreProductListSerializerRecommendation(TestCase):
    """Test StoreProductListSerializer._serialize_recommendation."""

    def setUp(self):
        self.subject = create_subject('SA1')
        self.session = create_exam_session('2025-09')
        self.ess = create_exam_session_subject(self.session, self.subject)

        # Source product
        self.source_catalog = create_catalog_product(
            fullname='SA1 Mock Exam eBook', shortname='SA1 Mock', code='MSA1E'
        )
        self.ebook_var = create_product_variation('eBook', 'eBook', code='E')
        self.sp_source = create_store_product(
            self.ess, self.source_catalog, self.ebook_var,
            product_code='SA1/EMSA1E/2025-09',
        )

        # Recommended product
        self.rec_catalog = create_catalog_product(
            fullname='SA1 Marking Service', shortname='SA1 Marking', code='MSA1M'
        )
        self.marking_var = create_product_variation('Marking', 'Marking Service', code='M')
        self.sp_rec = create_store_product(
            self.ess, self.rec_catalog, self.marking_var,
            product_code='SA1/MMSA1M/2025-09',
        )
        Price.objects.create(
            product=self.sp_rec,
            price_type='standard',
            amount=Decimal('29.99'),
            currency='GBP',
        )

    def test_serialize_recommendation(self):
        """Recommendations serialize with expected fields and price data."""
        from catalog.products.recommendation.models import ProductVariationRecommendation

        source_ppv = self.sp_source.product_product_variation
        rec_ppv = self.sp_rec.product_product_variation

        recommendation = ProductVariationRecommendation.objects.create(
            product_product_variation=source_ppv,
            recommended_product_product_variation=rec_ppv,
        )

        result = StoreProductListSerializer._serialize_recommendation(
            recommendation, self.ess
        )

        self.assertIsNotNone(result)
        self.assertEqual(result['store_product_id'], self.sp_rec.id)
        self.assertEqual(result['product_code'], 'MSA1M')
        self.assertEqual(result['product_name'], 'SA1 Marking Service')
        self.assertEqual(result['variation_type'], 'Marking')
        self.assertEqual(len(result['prices']), 1)
        self.assertEqual(result['prices'][0]['amount'], '29.99')

    def test_serialize_recommendation_no_store_product(self):
        """Recommendation returns None when no store product found for the ESS."""
        # Create recommendation pointing to a PPV that has no store product
        # for a different ESS
        other_subject = create_subject('CB3')
        other_ess = create_exam_session_subject(self.session, other_subject)

        other_catalog = create_catalog_product(
            fullname='CB3 Marking', shortname='CB3 Mark', code='MCB3'
        )
        other_var = create_product_variation('Marking2', 'Marking 2', code='M2')
        from catalog.products.models import ProductProductVariation
        rec_ppv = ProductProductVariation.objects.create(
            product=other_catalog,
            product_variation=other_var,
        )

        from catalog.products.recommendation.models import ProductVariationRecommendation
        source_ppv = self.sp_source.product_product_variation
        recommendation = ProductVariationRecommendation.objects.create(
            product_product_variation=source_ppv,
            recommended_product_product_variation=rec_ppv,
        )

        # Use the original ESS - no store product for rec_ppv in this ESS
        result = StoreProductListSerializer._serialize_recommendation(
            recommendation, self.ess
        )
        self.assertIsNone(result)

    def test_serialize_recommendation_exception_returns_none(self):
        """Exception during recommendation serialization returns None."""
        mock_recommendation = MagicMock()
        mock_recommendation.recommended_product_product_variation = None
        # Accessing None.product will raise AttributeError

        result = StoreProductListSerializer._serialize_recommendation(
            mock_recommendation, self.ess
        )
        self.assertIsNone(result)


class TestSerializeGroupedProductsWithTutorialAndRecommendation(TestCase):
    """Test serialize_grouped_products with tutorial events and recommendations."""

    def test_tutorial_product_includes_events_key(self):
        """When product_type is Tutorial and product has tutorial_events, events are included."""
        from filtering.tests.factories import create_filter_group

        subject = create_subject('CB1')
        session = create_exam_session('2025-04')
        ess = create_exam_session_subject(session, subject)

        tutorial_group = create_filter_group('Tutorial Class', code='TUTCLS')
        catalog_product = create_catalog_product(
            fullname='CB1 Tutorial London', shortname='CB1 Tut', code='TCB1L'
        )
        assign_product_to_group(catalog_product, tutorial_group)

        tutorial_var = create_product_variation('Tutorial', 'Face to Face', code='F')
        sp = create_store_product(
            ess, catalog_product, tutorial_var,
            product_code='CB1/FTCB1L/2025-04',
        )

        # Mock tutorial_events on the store product
        mock_event = MagicMock()
        mock_event.id = 1
        mock_event.code = 'TUT-LON'
        mock_event.venue = 'London'
        mock_event.is_soldout = False
        mock_event.finalisation_date = None
        mock_event.remain_space = 5
        mock_event.start_date = None
        mock_event.end_date = None

        # We need to patch the attribute on the actual store product instance
        with patch.object(type(sp), 'tutorial_events', new_callable=PropertyMock) as mock_te:
            mock_manager = MagicMock()
            mock_manager.all.return_value = [mock_event]
            mock_te.return_value = mock_manager

            result = StoreProductListSerializer.serialize_grouped_products([sp])

        self.assertEqual(result[0]['type'], 'Tutorial')
        # The events key should exist in the variation
        variation = result[0]['variations'][0]
        self.assertIn('events', variation)
        self.assertEqual(len(variation['events']), 1)


# ---------------------------------------------------------------------------
# ProductSearchRequestSerializer validation tests
# ---------------------------------------------------------------------------

class TestProductSearchRequestSerializer(TestCase):
    """Test ProductSearchRequestSerializer validation logic."""

    def test_valid_minimal_request(self):
        """Minimal valid request with no fields."""
        serializer = ProductSearchRequestSerializer(data={})
        self.assertTrue(serializer.is_valid())

    def test_valid_full_request(self):
        """Full request with all fields."""
        data = {
            'searchQuery': 'CM2 tutorial',
            'filters': {
                'subjects': ['CM2', 'SA1'],
                'categories': ['Bundle'],
            },
            'pagination': {'page': 1, 'page_size': 20},
            'options': {'include_bundles': True},
        }
        serializer = ProductSearchRequestSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_search_query_blank_allowed(self):
        """searchQuery can be blank."""
        serializer = ProductSearchRequestSerializer(data={'searchQuery': ''})
        self.assertTrue(serializer.is_valid())

    def test_validate_pagination_valid(self):
        """Valid pagination passes validation."""
        data = {'pagination': {'page': 1, 'page_size': 20}}
        serializer = ProductSearchRequestSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_validate_pagination_page_zero(self):
        """Page 0 fails validation."""
        data = {'pagination': {'page': 0, 'page_size': 20}}
        serializer = ProductSearchRequestSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('pagination', serializer.errors)

    def test_validate_pagination_negative_page(self):
        """Negative page fails validation."""
        data = {'pagination': {'page': -1, 'page_size': 20}}
        serializer = ProductSearchRequestSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('pagination', serializer.errors)

    def test_validate_pagination_page_size_zero(self):
        """Page size 0 fails validation."""
        data = {'pagination': {'page': 1, 'page_size': 0}}
        serializer = ProductSearchRequestSerializer(data=data)
        self.assertFalse(serializer.is_valid())

    def test_validate_pagination_page_size_too_large(self):
        """Page size > 100 fails validation."""
        data = {'pagination': {'page': 1, 'page_size': 101}}
        serializer = ProductSearchRequestSerializer(data=data)
        self.assertFalse(serializer.is_valid())

    def test_validate_pagination_non_integer_page(self):
        """Non-integer page fails validation."""
        data = {'pagination': {'page': 'abc', 'page_size': 20}}
        serializer = ProductSearchRequestSerializer(data=data)
        self.assertFalse(serializer.is_valid())

    def test_validate_pagination_empty_dict(self):
        """Empty pagination dict is valid (uses defaults)."""
        data = {'pagination': {}}
        serializer = ProductSearchRequestSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_validate_filters_valid(self):
        """Valid filter types pass validation."""
        data = {
            'filters': {
                'subjects': ['CM2'],
                'categories': ['Bundle'],
                'product_types': ['Core Study Material'],
                'products': [],
                'modes_of_delivery': ['eBook'],
            }
        }
        serializer = ProductSearchRequestSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_validate_filters_invalid_type(self):
        """Invalid filter type fails validation."""
        data = {
            'filters': {
                'invalid_filter': ['value'],
            }
        }
        serializer = ProductSearchRequestSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('filters', serializer.errors)

    def test_validate_filters_essp_ids(self):
        """essp_ids is a valid filter type."""
        data = {
            'filters': {
                'essp_ids': ['1', '2'],
            }
        }
        serializer = ProductSearchRequestSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_validate_filters_product_ids(self):
        """product_ids is a valid filter type."""
        data = {
            'filters': {
                'product_ids': ['10'],
            }
        }
        serializer = ProductSearchRequestSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_validate_filters_empty_dict(self):
        """Empty filters dict is valid."""
        data = {'filters': {}}
        serializer = ProductSearchRequestSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)


# ---------------------------------------------------------------------------
# Response serializer tests
# ---------------------------------------------------------------------------

class TestFilterCountSerializer(TestCase):
    """Test FilterCountSerializer accepts expected data shapes."""

    def test_valid_data(self):
        """Valid filter counts pass validation."""
        data = {
            'subjects': {'CM2': 5, 'SA1': 3},
            'categories': {'Material': 8},
            'product_types': {'Core Study': 4},
            'products': {'100': 2},
            'modes_of_delivery': {'eBook': 3, 'Printed': 5},
        }
        serializer = FilterCountSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_empty_data(self):
        """Empty dict is valid since all fields are optional."""
        serializer = FilterCountSerializer(data={})
        self.assertTrue(serializer.is_valid())


class TestProductSearchPaginationSerializer(TestCase):
    """Test ProductSearchPaginationSerializer."""

    def test_valid_pagination(self):
        """Valid pagination data passes validation."""
        data = {
            'page': 1,
            'page_size': 20,
            'total_count': 50,
            'has_next': True,
            'has_previous': False,
        }
        serializer = ProductSearchPaginationSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_missing_fields_fails(self):
        """Missing required fields fail validation."""
        serializer = ProductSearchPaginationSerializer(data={})
        self.assertFalse(serializer.is_valid())


class TestProductSearchResponseSerializer(TestCase):
    """Test ProductSearchResponseSerializer."""

    def test_valid_response(self):
        """Valid response data passes validation."""
        data = {
            'products': [{'id': 1, 'name': 'Test'}],
            'filter_counts': {
                'subjects': {'CM2': 1},
            },
            'pagination': {
                'page': 1,
                'page_size': 20,
                'total_count': 1,
                'has_next': False,
                'has_previous': False,
            },
        }
        serializer = ProductSearchResponseSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_empty_products_valid(self):
        """Empty products list is valid."""
        data = {
            'products': [],
            'filter_counts': {},
            'pagination': {
                'page': 1,
                'page_size': 20,
                'total_count': 0,
                'has_next': False,
                'has_previous': False,
            },
        }
        serializer = ProductSearchResponseSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
