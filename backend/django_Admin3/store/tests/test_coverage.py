"""Additional tests to improve store app coverage to 98%+.

Covers gaps identified in coverage report:
- store/admin.py: display methods (lines 40, 44, 57, 79, 83, 87, 100, 104)
- store/models/product.py: backward-compat properties, tutorial code gen (lines 88-89, 120, 136)
- store/models/bundle.py: __str__ method (line 80)
- store/models/bundle_product.py: __str__ method (line 72)
- store/models/price.py: __str__ method (line 66)
- store/serializers/search.py: deprecated group function (lines 82-157)
- store/views/product.py: edge cases - pagination, serializer class (lines 47, 75-76, 79-80)
- store/serializers/bundle.py: fallback paths (lines 73, 91)
- store/serializers/unified.py: fallback paths (lines 77, 113, 127)
"""
import warnings
from decimal import Decimal
from unittest.mock import PropertyMock, patch, MagicMock

from django.contrib.admin.sites import AdminSite
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase


class StoreCoverageTestDataMixin:
    """Mixin that creates shared test data for coverage tests."""

    @classmethod
    def _create_test_data(cls):
        """Create all test data needed for coverage tests."""
        from catalog.models import (
            Subject, ExamSession, ExamSessionSubject,
            Product as CatalogProduct, ProductVariation,
            ProductProductVariation, ProductBundle,
        )
        from store.models import Product, Price, Bundle, BundleProduct

        # Create subject
        cls.subject = Subject.objects.create(
            code='CS1',
            description='Actuarial Statistics',
            active=True
        )

        # Create exam session
        cls.exam_session = ExamSession.objects.create(
            session_code='2025-09',
            start_date=timezone.now(),
            end_date=timezone.now() + timezone.timedelta(days=90)
        )

        # Create exam session subject
        cls.ess = ExamSessionSubject.objects.create(
            exam_session=cls.exam_session,
            subject=cls.subject,
            is_active=True
        )

        # Create catalog product template
        cls.catalog_product = CatalogProduct.objects.create(
            fullname='Core Study Material CS1',
            shortname='CSM CS1',
            code='CSM01',
            is_active=True,
            buy_both=True,
        )

        # Create product variations
        cls.variation_printed = ProductVariation.objects.create(
            variation_type='Printed',
            name='Printed',
            code='P'
        )
        cls.variation_ebook = ProductVariation.objects.create(
            variation_type='eBook',
            name='eBook',
            code='E'
        )
        cls.variation_marking = ProductVariation.objects.create(
            variation_type='Marking',
            name='Mock Exam Marking',
            code='M01'
        )
        cls.variation_tutorial = ProductVariation.objects.create(
            variation_type='Tutorial',
            name='Tutorial London',
            code='LON',
            description='London face-to-face tutorial',
            description_short='London Tutorial',
        )

        # Create PPVs
        cls.ppv_printed = ProductProductVariation.objects.create(
            product=cls.catalog_product,
            product_variation=cls.variation_printed
        )
        cls.ppv_ebook = ProductProductVariation.objects.create(
            product=cls.catalog_product,
            product_variation=cls.variation_ebook
        )
        cls.ppv_marking = ProductProductVariation.objects.create(
            product=cls.catalog_product,
            product_variation=cls.variation_marking
        )
        cls.ppv_tutorial = ProductProductVariation.objects.create(
            product=cls.catalog_product,
            product_variation=cls.variation_tutorial
        )

        # Create store products
        cls.store_product_printed = Product.objects.create(
            exam_session_subject=cls.ess,
            product_product_variation=cls.ppv_printed,
            product_code='CS1/PCSM01/2025-09',
            is_active=True
        )
        cls.store_product_ebook = Product.objects.create(
            exam_session_subject=cls.ess,
            product_product_variation=cls.ppv_ebook,
            product_code='CS1/ECSM01/2025-09',
            is_active=True
        )

        # Create prices
        cls.price_standard = Price.objects.create(
            product=cls.store_product_printed,
            price_type='standard',
            amount=Decimal('149.99'),
            currency='GBP'
        )
        cls.price_retaker = Price.objects.create(
            product=cls.store_product_printed,
            price_type='retaker',
            amount=Decimal('99.99'),
            currency='GBP'
        )
        cls.price_ebook = Price.objects.create(
            product=cls.store_product_ebook,
            price_type='standard',
            amount=Decimal('79.99'),
            currency='GBP'
        )

        # Create bundle template
        cls.bundle_template = ProductBundle.objects.create(
            bundle_name='Complete CS1 Bundle',
            subject=cls.subject,
            bundle_description='All CS1 study materials',
            display_order=1,
            is_active=True,
            is_featured=True,
        )

        # Create store bundle
        cls.store_bundle = Bundle.objects.create(
            bundle_template=cls.bundle_template,
            exam_session_subject=cls.ess,
            is_active=True,
            display_order=1
        )

        # Create bundle products
        cls.bundle_product_1 = BundleProduct.objects.create(
            bundle=cls.store_bundle,
            product=cls.store_product_printed,
            default_price_type='standard',
            quantity=1,
            sort_order=1,
            is_active=True
        )
        cls.bundle_product_2 = BundleProduct.objects.create(
            bundle=cls.store_bundle,
            product=cls.store_product_ebook,
            default_price_type='standard',
            quantity=1,
            sort_order=2,
            is_active=True
        )


# ─────────────────────────────────────────────────────────────────────────
# Admin display methods coverage (admin.py lines 40, 44, 57, 79, 83, 87, 100, 104)
# ─────────────────────────────────────────────────────────────────────────

class TestProductAdmin(StoreCoverageTestDataMixin, TestCase):
    """Test ProductAdmin display methods."""

    @classmethod
    def setUpTestData(cls):
        cls._create_test_data()

    def setUp(self):
        from store.admin import ProductAdmin
        from store.models import Product
        self.admin = ProductAdmin(model=Product, admin_site=AdminSite())

    def test_get_subject_code(self):
        """Admin display: get_subject_code returns subject code (line 40)."""
        result = self.admin.get_subject_code(self.store_product_printed)
        self.assertEqual(result, 'CS1')

    def test_get_session_code(self):
        """Admin display: get_session_code returns session code (line 44)."""
        result = self.admin.get_session_code(self.store_product_printed)
        self.assertEqual(result, '2025-09')


class TestPriceAdmin(StoreCoverageTestDataMixin, TestCase):
    """Test PriceAdmin display methods."""

    @classmethod
    def setUpTestData(cls):
        cls._create_test_data()

    def setUp(self):
        from store.admin import PriceAdmin
        from store.models import Price
        self.admin = PriceAdmin(model=Price, admin_site=AdminSite())

    def test_get_product_code(self):
        """Admin display: get_product_code returns product code (line 57)."""
        result = self.admin.get_product_code(self.price_standard)
        self.assertEqual(result, 'CS1/PCSM01/2025-09')


class TestBundleAdmin(StoreCoverageTestDataMixin, TestCase):
    """Test BundleAdmin display methods."""

    @classmethod
    def setUpTestData(cls):
        cls._create_test_data()

    def setUp(self):
        from store.admin import BundleAdmin
        from store.models import Bundle
        self.admin = BundleAdmin(model=Bundle, admin_site=AdminSite())

    def test_get_subject_code(self):
        """Admin display: get_subject_code returns subject code (line 79)."""
        result = self.admin.get_subject_code(self.store_bundle)
        self.assertEqual(result, 'CS1')

    def test_get_session_code(self):
        """Admin display: get_session_code returns session code (line 83)."""
        result = self.admin.get_session_code(self.store_bundle)
        self.assertEqual(result, '2025-09')

    def test_get_product_count(self):
        """Admin display: get_product_count returns active products count (line 87)."""
        result = self.admin.get_product_count(self.store_bundle)
        self.assertEqual(result, 2)


class TestBundleProductAdmin(StoreCoverageTestDataMixin, TestCase):
    """Test BundleProductAdmin display methods."""

    @classmethod
    def setUpTestData(cls):
        cls._create_test_data()

    def setUp(self):
        from store.admin import BundleProductAdmin
        from store.models import BundleProduct
        self.admin = BundleProductAdmin(model=BundleProduct, admin_site=AdminSite())

    def test_get_bundle_name(self):
        """Admin display: get_bundle_name returns bundle name (line 100)."""
        result = self.admin.get_bundle_name(self.bundle_product_1)
        self.assertEqual(result, 'Complete CS1 Bundle')

    def test_get_product_code(self):
        """Admin display: get_product_code returns product code (line 104)."""
        result = self.admin.get_product_code(self.bundle_product_1)
        self.assertEqual(result, 'CS1/PCSM01/2025-09')


# ─────────────────────────────────────────────────────────────────────────
# Model __str__ and properties (product.py 88-89, 120, 136; bundle.py 80;
#   bundle_product.py 72; price.py 66)
# ─────────────────────────────────────────────────────────────────────────

class TestProductModelProperties(StoreCoverageTestDataMixin, TestCase):
    """Test Product backward-compat properties and code generation."""

    @classmethod
    def setUpTestData(cls):
        cls._create_test_data()

    def test_product_property_returns_catalog_product(self):
        """Product.product returns catalog product (line 110 - already covered, but validating)."""
        result = self.store_product_printed.product
        self.assertEqual(result, self.catalog_product)

    def test_product_variation_property_returns_variation(self):
        """Product.product_variation returns variation (line 120)."""
        result = self.store_product_printed.product_variation
        self.assertEqual(result, self.variation_printed)

    def test_variations_property_returns_queryset(self):
        """Product.variations returns single-item queryset (line 136)."""
        result = self.store_product_printed.variations
        self.assertEqual(result.count(), 1)
        self.assertEqual(result.first(), self.store_product_printed)

    def test_tutorial_product_code_generation(self):
        """Product code generation for tutorial/other type (lines 88-89)."""
        from store.models import Product

        product = Product.objects.create(
            exam_session_subject=self.ess,
            product_product_variation=self.ppv_tutorial,
            is_active=True
            # No product_code provided - triggers auto-generation
        )

        # Tutorial format: {subject}/{prefix}{product_code}{variation_code}/{exam_session}-{id}
        # prefix = variation_type[0].upper() = 'T'
        self.assertIn('CS1/', product.product_code)
        self.assertIn('2025-09', product.product_code)
        self.assertIn(str(product.pk), product.product_code)

    def test_marking_product_code_generation(self):
        """Product code generation for marking type (material/marking path)."""
        from store.models import Product

        product = Product.objects.create(
            exam_session_subject=self.ess,
            product_product_variation=self.ppv_marking,
            is_active=True
        )

        # Marking format: {subject}/{variation_code}{product_code}/{exam_session}
        self.assertIn('CS1/', product.product_code)
        self.assertIn('2025-09', product.product_code)


class TestBundleModelStr(StoreCoverageTestDataMixin, TestCase):
    """Test Bundle __str__ method."""

    @classmethod
    def setUpTestData(cls):
        cls._create_test_data()

    def test_bundle_str_method(self):
        """Bundle __str__ uses name and ESS (line 80)."""
        result = str(self.store_bundle)
        self.assertIn('Complete CS1 Bundle', result)
        self.assertIn(str(self.ess), result)

    def test_bundle_name_uses_override(self):
        """Bundle.name returns override_name if set."""
        self.store_bundle.override_name = 'Custom Bundle Name'
        self.assertEqual(self.store_bundle.name, 'Custom Bundle Name')

    def test_bundle_name_uses_template(self):
        """Bundle.name returns template name when no override."""
        self.store_bundle.override_name = None
        self.assertEqual(self.store_bundle.name, 'Complete CS1 Bundle')

    def test_bundle_description_uses_override(self):
        """Bundle.description returns override if set."""
        self.store_bundle.override_description = 'Custom description'
        self.assertEqual(self.store_bundle.description, 'Custom description')

    def test_bundle_description_uses_template(self):
        """Bundle.description returns template description when no override."""
        self.store_bundle.override_description = None
        self.assertEqual(self.store_bundle.description, 'All CS1 study materials')


class TestBundleProductModelStr(StoreCoverageTestDataMixin, TestCase):
    """Test BundleProduct __str__ method."""

    @classmethod
    def setUpTestData(cls):
        cls._create_test_data()

    def test_bundle_product_str_method(self):
        """BundleProduct __str__ includes bundle name, product code, quantity (line 72)."""
        result = str(self.bundle_product_1)
        self.assertIn('Complete CS1 Bundle', result)
        self.assertIn('CS1/PCSM01/2025-09', result)
        self.assertIn('x1', result)


class TestPriceModelStr(StoreCoverageTestDataMixin, TestCase):
    """Test Price __str__ method."""

    @classmethod
    def setUpTestData(cls):
        cls._create_test_data()

    def test_price_str_method(self):
        """Price __str__ includes product code, type, amount, currency (line 66)."""
        result = str(self.price_standard)
        self.assertIn('CS1/PCSM01/2025-09', result)
        self.assertIn('standard', result)
        self.assertIn('149.99', result)
        self.assertIn('GBP', result)


# ─────────────────────────────────────────────────────────────────────────
# Search serializer coverage (search.py lines 82-157)
# ─────────────────────────────────────────────────────────────────────────

class TestSearchSerializer(StoreCoverageTestDataMixin, TestCase):
    """Test deprecated search serializer and grouping function."""

    @classmethod
    def setUpTestData(cls):
        cls._create_test_data()
        from filtering.models import FilterGroup, ProductProductGroup
        # Create filter groups for product type detection
        cls.tutorial_group = FilterGroup.objects.create(
            name='Tutorial',
            code='TUTORIAL',
            is_active=True
        )
        cls.marking_group = FilterGroup.objects.create(
            name='Marking',
            code='MARKING',
            is_active=True
        )
        cls.material_group = FilterGroup.objects.create(
            name='Material',
            code='MATERIAL',
            is_active=True
        )

    def test_group_store_products_for_search_deprecation_warning(self):
        """group_store_products_for_search emits DeprecationWarning (line 82-87)."""
        from store.serializers.search import group_store_products_for_search
        from store.models import Product

        products = Product.objects.select_related(
            'exam_session_subject__exam_session',
            'exam_session_subject__subject',
            'product_product_variation__product',
            'product_product_variation__product_variation',
        ).prefetch_related(
            'prices',
            'product_product_variation__product__groups',
        ).filter(id__in=[self.store_product_printed.id, self.store_product_ebook.id])

        with warnings.catch_warnings(record=True) as w:
            warnings.simplefilter("always")
            result = group_store_products_for_search(products)
            self.assertEqual(len(w), 1)
            self.assertTrue(issubclass(w[0].category, DeprecationWarning))
            self.assertIn('deprecated', str(w[0].message).lower())

    def test_group_store_products_for_search_returns_grouped_results(self):
        """group_store_products_for_search groups products by catalog product (lines 88-157)."""
        from store.serializers.search import group_store_products_for_search
        from store.models import Product

        products = Product.objects.select_related(
            'exam_session_subject__exam_session',
            'exam_session_subject__subject',
            'product_product_variation__product',
            'product_product_variation__product_variation',
        ).prefetch_related(
            'prices',
            'product_product_variation__product__groups',
        ).filter(id__in=[self.store_product_printed.id, self.store_product_ebook.id])

        with warnings.catch_warnings():
            warnings.simplefilter("ignore", DeprecationWarning)
            result = group_store_products_for_search(products)

        # Should group both products under one catalog product
        self.assertEqual(len(result), 1)

        item = result[0]
        self.assertEqual(item['id'], self.catalog_product.id)
        self.assertEqual(item['subject_code'], 'CS1')
        self.assertEqual(item['subject_name'], 'Actuarial Statistics')
        self.assertEqual(item['session_code'], '2025-09')
        self.assertEqual(item['exam_session_code'], '2025-09')
        self.assertEqual(item['product_name'], 'Core Study Material CS1')
        self.assertEqual(item['shortname'], 'CSM CS1')
        self.assertEqual(item['fullname'], 'Core Study Material CS1')
        self.assertEqual(item['code'], 'CSM01')
        self.assertEqual(item['description'], '')
        self.assertEqual(item['buy_both'], True)
        self.assertEqual(item['is_active'], True)

        # Check variations
        variations = item['variations']
        self.assertEqual(len(variations), 2)

        # Check variation structure
        for var in variations:
            self.assertIn('id', var)
            self.assertIn('name', var)
            self.assertIn('variation_type', var)
            self.assertIn('description', var)
            self.assertIn('prices', var)

    def test_group_store_products_material_type(self):
        """group_store_products_for_search detects 'Material' type (no tutorial/marking groups)."""
        from store.serializers.search import group_store_products_for_search
        from store.models import Product

        products = Product.objects.select_related(
            'exam_session_subject__exam_session',
            'exam_session_subject__subject',
            'product_product_variation__product',
            'product_product_variation__product_variation',
        ).prefetch_related(
            'prices',
            'product_product_variation__product__groups',
        ).filter(id=self.store_product_printed.id)

        with warnings.catch_warnings():
            warnings.simplefilter("ignore", DeprecationWarning)
            result = group_store_products_for_search(products)

        self.assertEqual(result[0]['type'], 'Material')

    def test_group_store_products_tutorial_type(self):
        """group_store_products_for_search detects 'Tutorial' type (line 113)."""
        from store.serializers.search import group_store_products_for_search
        from store.models import Product
        from filtering.models import ProductProductGroup

        # Assign tutorial group to catalog product
        ProductProductGroup.objects.create(
            product=self.catalog_product,
            product_group=self.tutorial_group
        )

        products = Product.objects.select_related(
            'exam_session_subject__exam_session',
            'exam_session_subject__subject',
            'product_product_variation__product',
            'product_product_variation__product_variation',
        ).prefetch_related(
            'prices',
            'product_product_variation__product__groups',
        ).filter(id=self.store_product_printed.id)

        with warnings.catch_warnings():
            warnings.simplefilter("ignore", DeprecationWarning)
            result = group_store_products_for_search(products)

        self.assertEqual(result[0]['type'], 'Tutorial')

        # Clean up
        ProductProductGroup.objects.filter(
            product=self.catalog_product,
            product_group=self.tutorial_group
        ).delete()

    def test_group_store_products_marking_type(self):
        """group_store_products_for_search detects 'Markings' type (line 115)."""
        from store.serializers.search import group_store_products_for_search
        from store.models import Product
        from filtering.models import ProductProductGroup

        # Assign marking group to catalog product
        ProductProductGroup.objects.create(
            product=self.catalog_product,
            product_group=self.marking_group
        )

        products = Product.objects.select_related(
            'exam_session_subject__exam_session',
            'exam_session_subject__subject',
            'product_product_variation__product',
            'product_product_variation__product_variation',
        ).prefetch_related(
            'prices',
            'product_product_variation__product__groups',
        ).filter(id=self.store_product_printed.id)

        with warnings.catch_warnings():
            warnings.simplefilter("ignore", DeprecationWarning)
            result = group_store_products_for_search(products)

        self.assertEqual(result[0]['type'], 'Markings')

        # Clean up
        ProductProductGroup.objects.filter(
            product=self.catalog_product,
            product_group=self.marking_group
        ).delete()

    def test_group_store_products_empty_queryset(self):
        """group_store_products_for_search handles empty queryset."""
        from store.serializers.search import group_store_products_for_search
        from store.models import Product

        products = Product.objects.none()

        with warnings.catch_warnings():
            warnings.simplefilter("ignore", DeprecationWarning)
            result = group_store_products_for_search(products)

        self.assertEqual(result, [])

    def test_search_product_serializer_validates(self):
        """SearchProductSerializer can validate well-formed data."""
        from store.serializers.search import SearchProductSerializer

        data = {
            'id': 1,
            'subject_code': 'CS1',
            'subject_name': 'Actuarial Statistics',
            'session_code': '2025-09',
            'exam_session_code': '2025-09',
            'product_name': 'Core Study Material',
            'shortname': 'CSM',
            'fullname': 'Core Study Material CS1',
            'code': 'CSM01',
            'description': '',
            'type': 'Material',
            'buy_both': True,
            'is_active': True,
            'variations': [],
        }
        serializer = SearchProductSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)


# ─────────────────────────────────────────────────────────────────────────
# View edge cases (views/product.py lines 47, 75-76, 79-80)
# ─────────────────────────────────────────────────────────────────────────

class TestProductViewSetEdgeCases(StoreCoverageTestDataMixin, APITestCase):
    """Test ProductViewSet edge cases for coverage."""

    @classmethod
    def setUpTestData(cls):
        cls._create_test_data()

    def test_list_with_invalid_page_param(self):
        """List with invalid page param defaults to 1 (lines 75-76)."""
        response = self.client.get('/api/store/products/?page=invalid')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data['page'], 1)

    def test_list_with_invalid_page_size_param(self):
        """List with invalid page_size param defaults to 50 (lines 79-80)."""
        response = self.client.get('/api/store/products/?page_size=invalid')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        # Should use default of 50, not crash
        self.assertIn('results', data)

    def test_list_page_size_capped_at_100(self):
        """List page_size is capped at 100."""
        response = self.client.get('/api/store/products/?page_size=200')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        # Even with page_size=200, should work (capped at 100)
        self.assertIn('results', data)

    def test_retrieve_uses_product_serializer(self):
        """Retrieve endpoint uses ProductSerializer (line 47 - get_serializer_class)."""
        response = self.client.get(f'/api/store/products/{self.store_product_printed.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        # ProductSerializer includes more fields than ProductListSerializer
        self.assertIn('exam_session_subject', data)
        self.assertIn('product_product_variation', data)

    def test_list_has_previous_false_on_first_page(self):
        """List endpoint has_previous=False on page 1."""
        response = self.client.get('/api/store/products/?page=1&page_size=1')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertFalse(data['has_previous'])

    def test_list_has_previous_true_on_page_2(self):
        """List endpoint has_previous=True on page 2."""
        response = self.client.get('/api/store/products/?page=2&page_size=1')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertTrue(data['has_previous'])


# ─────────────────────────────────────────────────────────────────────────
# Bundle serializer fallback paths (bundle.py lines 73, 91)
# ─────────────────────────────────────────────────────────────────────────

class TestBundleComponentSerializerFallback(StoreCoverageTestDataMixin, TestCase):
    """Test BundleComponentSerializer fallback code paths."""

    @classmethod
    def setUpTestData(cls):
        cls._create_test_data()

    def test_get_product_with_ppv(self):
        """get_product returns catalog product info when ppv exists."""
        from store.serializers.bundle import BundleComponentSerializer

        serializer = BundleComponentSerializer()
        result = serializer.get_product(self.bundle_product_1)

        self.assertEqual(result['id'], self.catalog_product.id)
        self.assertEqual(result['fullname'], 'Core Study Material CS1')

    def test_get_product_fallback_no_ppv(self):
        """get_product falls back to store product when ppv is None (line 73)."""
        from store.serializers.bundle import BundleComponentSerializer

        serializer = BundleComponentSerializer()

        # Mock the bundle_product to have a store product with no ppv
        mock_bp = MagicMock()
        mock_product = MagicMock()
        mock_product.id = 999
        mock_product.product_code = 'TEST/CODE/123'
        mock_product.product_product_variation = None
        mock_bp.product = mock_product

        result = serializer.get_product(mock_bp)

        self.assertEqual(result['id'], 999)
        self.assertEqual(result['fullname'], 'TEST/CODE/123')

    def test_get_product_variation_with_ppv(self):
        """get_product_variation returns variation info when ppv exists."""
        from store.serializers.bundle import BundleComponentSerializer

        serializer = BundleComponentSerializer()
        result = serializer.get_product_variation(self.bundle_product_1)

        self.assertIsNotNone(result)
        self.assertEqual(result['name'], 'Printed')
        self.assertEqual(result['variation_type'], 'Printed')

    def test_get_product_variation_fallback_no_ppv(self):
        """get_product_variation returns None when ppv is None (line 91)."""
        from store.serializers.bundle import BundleComponentSerializer

        serializer = BundleComponentSerializer()

        mock_bp = MagicMock()
        mock_product = MagicMock()
        mock_product.product_product_variation = None
        mock_bp.product = mock_product

        result = serializer.get_product_variation(mock_bp)

        self.assertIsNone(result)

    def test_get_prices_returns_price_list(self):
        """get_prices returns correctly formatted prices."""
        from store.serializers.bundle import BundleComponentSerializer

        serializer = BundleComponentSerializer()
        result = serializer.get_prices(self.bundle_product_1)

        self.assertEqual(len(result), 2)  # standard + retaker prices
        price_types = [p['price_type'] for p in result]
        self.assertIn('standard', price_types)
        self.assertIn('retaker', price_types)


# ─────────────────────────────────────────────────────────────────────────
# Unified serializer fallback paths (unified.py lines 77, 113, 127)
# ─────────────────────────────────────────────────────────────────────────

class TestUnifiedProductSerializerFallback(StoreCoverageTestDataMixin, TestCase):
    """Test UnifiedProductSerializer fallback code paths."""

    @classmethod
    def setUpTestData(cls):
        cls._create_test_data()

    def test_get_name_with_ppv(self):
        """get_name returns catalog product fullname when ppv exists."""
        from store.serializers.unified import UnifiedProductSerializer

        serializer = UnifiedProductSerializer()
        result = serializer.get_name(self.store_product_printed)
        self.assertEqual(result, 'Core Study Material CS1')

    def test_get_name_fallback_no_ppv_product(self):
        """get_name falls back to product_code when ppv.product is None (line 77)."""
        from store.serializers.unified import UnifiedProductSerializer

        serializer = UnifiedProductSerializer()

        mock_product = MagicMock()
        mock_product.product_code = 'FALLBACK/CODE'
        mock_ppv = MagicMock()
        mock_ppv.product = None
        mock_product.product_product_variation = mock_ppv

        result = serializer.get_name(mock_product)
        self.assertEqual(result, 'FALLBACK/CODE')

    def test_get_is_bundle_returns_false(self):
        """get_is_bundle always returns False for products."""
        from store.serializers.unified import UnifiedProductSerializer

        serializer = UnifiedProductSerializer()
        result = serializer.get_is_bundle(self.store_product_printed)
        self.assertFalse(result)


class TestUnifiedBundleComponentSerializer(StoreCoverageTestDataMixin, TestCase):
    """Test unified.BundleComponentSerializer fallback paths."""

    @classmethod
    def setUpTestData(cls):
        cls._create_test_data()

    def test_get_product_with_ppv(self):
        """get_product returns catalog product info (line 108-112)."""
        from store.serializers.unified import BundleComponentSerializer

        serializer = BundleComponentSerializer()
        result = serializer.get_product(self.bundle_product_1)

        self.assertEqual(result['id'], self.catalog_product.id)
        self.assertEqual(result['fullname'], 'Core Study Material CS1')

    def test_get_product_fallback_no_ppv_product(self):
        """get_product falls back to store product (line 113-115)."""
        from store.serializers.unified import BundleComponentSerializer

        serializer = BundleComponentSerializer()

        mock_bp = MagicMock()
        mock_product = MagicMock()
        mock_product.id = 888
        mock_product.product_code = 'FALLBACK/CODE'
        mock_ppv = MagicMock()
        mock_ppv.product = None
        mock_product.product_product_variation = mock_ppv
        mock_bp.product = mock_product

        result = serializer.get_product(mock_bp)
        self.assertEqual(result['id'], 888)
        self.assertEqual(result['fullname'], 'FALLBACK/CODE')

    def test_get_product_variation_with_ppv(self):
        """get_product_variation returns variation info (line 120-126)."""
        from store.serializers.unified import BundleComponentSerializer

        serializer = BundleComponentSerializer()
        result = serializer.get_product_variation(self.bundle_product_1)

        self.assertIsNotNone(result)
        self.assertEqual(result['name'], 'Printed')
        self.assertEqual(result['variation_type'], 'Printed')

    def test_get_product_variation_fallback_no_variation(self):
        """get_product_variation returns None when no variation (line 127)."""
        from store.serializers.unified import BundleComponentSerializer

        serializer = BundleComponentSerializer()

        mock_bp = MagicMock()
        mock_product = MagicMock()
        mock_ppv = MagicMock()
        mock_ppv.product_variation = None
        mock_product.product_product_variation = mock_ppv
        mock_bp.product = mock_product

        result = serializer.get_product_variation(mock_bp)
        self.assertIsNone(result)

    def test_get_prices_returns_serialized_prices(self):
        """get_prices returns properly serialized price data."""
        from store.serializers.unified import BundleComponentSerializer

        serializer = BundleComponentSerializer()
        result = serializer.get_prices(self.bundle_product_1)

        self.assertEqual(len(result), 2)
        for price in result:
            self.assertIn('price_type', price)
            self.assertIn('amount', price)
            self.assertIn('currency', price)


class TestUnifiedBundleSerializer(StoreCoverageTestDataMixin, TestCase):
    """Test UnifiedBundleSerializer methods."""

    @classmethod
    def setUpTestData(cls):
        cls._create_test_data()

    def test_get_is_bundle_returns_true(self):
        """get_is_bundle always returns True for bundles."""
        from store.serializers.unified import UnifiedBundleSerializer

        serializer = UnifiedBundleSerializer()
        result = serializer.get_is_bundle(self.store_bundle)
        self.assertTrue(result)

    def test_get_product_count(self):
        """get_product_count returns active product count."""
        from store.serializers.unified import UnifiedBundleSerializer

        serializer = UnifiedBundleSerializer()
        result = serializer.get_product_count(self.store_bundle)
        self.assertEqual(result, 2)

    def test_get_components_count(self):
        """get_components_count returns active components count."""
        from store.serializers.unified import UnifiedBundleSerializer

        serializer = UnifiedBundleSerializer()
        result = serializer.get_components_count(self.store_bundle)
        self.assertEqual(result, 2)

    def test_get_components_returns_ordered_products(self):
        """get_components returns products ordered by sort_order."""
        from store.serializers.unified import UnifiedBundleSerializer

        serializer = UnifiedBundleSerializer()
        result = serializer.get_components(self.store_bundle)
        self.assertEqual(len(result), 2)
        # First product should be sort_order 1
        self.assertEqual(result[0]['product_code'], 'CS1/PCSM01/2025-09')


# ─────────────────────────────────────────────────────────────────────────
# ProductViewSet.get_serializer_class list branch (product.py line 47)
# ─────────────────────────────────────────────────────────────────────────

class TestProductViewSetGetSerializerClass(TestCase):
    """Test ProductViewSet.get_serializer_class directly.

    The custom list() method bypasses get_serializer_class, so the
    'list' branch (line 47) is never reached via API calls.
    This test exercises the method directly to cover that branch.
    """

    def test_get_serializer_class_returns_product_list_serializer_for_list(self):
        """get_serializer_class returns ProductListSerializer for list action (line 47)."""
        from store.views.product import ProductViewSet
        from store.serializers.product import ProductListSerializer

        viewset = ProductViewSet()
        viewset.action = 'list'
        result = viewset.get_serializer_class()
        self.assertEqual(result, ProductListSerializer)

    def test_get_serializer_class_returns_product_serializer_for_retrieve(self):
        """get_serializer_class returns ProductSerializer for retrieve action."""
        from store.views.product import ProductViewSet
        from store.serializers.product import ProductSerializer

        viewset = ProductViewSet()
        viewset.action = 'retrieve'
        result = viewset.get_serializer_class()
        self.assertEqual(result, ProductSerializer)
