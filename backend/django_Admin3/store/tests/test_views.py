"""Tests for store API views.

TDD tests for store ViewSets per US4 (Admin Product Management).

Test classes:
- T050: TestProductViewSet - Product API list, retrieve, prices action
- T051: TestPriceViewSet - Price API list, retrieve
- T052: TestBundleViewSet - Bundle API list, retrieve, products action
- T053: TestBundleProductEndpoint - BundleProduct nested endpoint
"""
from decimal import Decimal
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase


class StoreAPITestCase(APITestCase):
    """Base test case for store API tests with common test data."""

    def get_results(self, response):
        """Extract results from potentially paginated response."""
        data = response.json()
        if isinstance(data, dict) and 'results' in data:
            return data['results']
        return data

    @classmethod
    def setUpTestData(cls):
        """Create test data for store API tests."""
        from catalog.models import (
            Subject, ExamSession, ExamSessionSubject,
            Product as CatalogProduct, ProductVariation, ProductProductVariation,
            ProductBundle,
        )
        from store.models import Product, Price, Bundle, BundleProduct

        # Create subjects
        cls.subject = Subject.objects.create(
            code='CM2',
            description='Actuarial Mathematics',
            active=True
        )
        cls.subject_inactive = Subject.objects.create(
            code='CB1',
            description='Business Economics',
            active=False
        )

        # Create exam session
        cls.exam_session = ExamSession.objects.create(
            session_code='2025-04',
            start_date=timezone.now(),
            end_date=timezone.now() + timezone.timedelta(days=90)
        )

        # Create exam session subject
        cls.ess = ExamSessionSubject.objects.create(
            exam_session=cls.exam_session,
            subject=cls.subject,
            is_active=True
        )

        # Create catalog product templates
        cls.catalog_product = CatalogProduct.objects.create(
            fullname='Core Study Material CM2',
            shortname='CSM CM2',
            code='CSM01',
            is_active=True
        )
        cls.catalog_product_2 = CatalogProduct.objects.create(
            fullname='Practice Bundle CM2',
            shortname='PB CM2',
            code='PB01',
            is_active=True
        )
        # FR-012: Inactive catalog product template
        cls.catalog_product_inactive = CatalogProduct.objects.create(
            fullname='Discontinued Material',
            shortname='DM CM2',
            code='DM01',
            is_active=False  # Inactive catalog template
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

        # Create PPV (junction between Product and ProductVariation)
        cls.ppv_printed = ProductProductVariation.objects.create(
            product=cls.catalog_product,
            product_variation=cls.variation_printed
        )
        cls.ppv_ebook = ProductProductVariation.objects.create(
            product=cls.catalog_product,
            product_variation=cls.variation_ebook
        )

        # Create store products
        cls.store_product_1 = Product.objects.create(
            exam_session_subject=cls.ess,
            product_product_variation=cls.ppv_printed,
            product_code='CM2/PCSM01P/2025-04',
            is_active=True
        )
        cls.store_product_2 = Product.objects.create(
            exam_session_subject=cls.ess,
            product_product_variation=cls.ppv_ebook,
            product_code='CM2/ECSM01E/2025-04',
            is_active=True
        )
        cls.store_product_inactive = Product.objects.create(
            exam_session_subject=cls.ess,
            product_product_variation=ProductProductVariation.objects.create(
                product=cls.catalog_product_2,
                product_variation=cls.variation_printed
            ),
            product_code='CM2/PPB01P/2025-04',
            is_active=False  # Inactive product
        )

        # FR-012: Store product with inactive catalog template
        cls.ppv_inactive_template = ProductProductVariation.objects.create(
            product=cls.catalog_product_inactive,
            product_variation=cls.variation_printed
        )
        cls.store_product_inactive_template = Product.objects.create(
            exam_session_subject=cls.ess,
            product_product_variation=cls.ppv_inactive_template,
            product_code='CM2/PDM01P/2025-04',
            is_active=True  # Active store product, but catalog template is inactive
        )

        # Create prices
        cls.price_retail = Price.objects.create(
            product=cls.store_product_1,
            price_type='retail',
            amount=Decimal('199.99'),
            currency='GBP'
        )
        cls.price_student = Price.objects.create(
            product=cls.store_product_1,
            price_type='student',
            amount=Decimal('149.99'),
            currency='GBP'
        )
        cls.price_ebook = Price.objects.create(
            product=cls.store_product_2,
            price_type='retail',
            amount=Decimal('99.99'),
            currency='GBP'
        )

        # Create bundle templates (catalog.ProductBundle)
        cls.bundle_template = ProductBundle.objects.create(
            bundle_name='Complete CM2 Bundle',
            subject=cls.subject,
            bundle_description='All CM2 study materials',
            display_order=1,
            is_active=True
        )
        cls.bundle_template_2 = ProductBundle.objects.create(
            bundle_name='Basic CM2 Bundle',
            subject=cls.subject,
            bundle_description='Basic CM2 materials',
            display_order=2,
            is_active=True
        )

        # Create store bundles
        cls.store_bundle = Bundle.objects.create(
            bundle_template=cls.bundle_template,
            exam_session_subject=cls.ess,
            is_active=True,
            display_order=1
        )
        cls.store_bundle_inactive = Bundle.objects.create(
            bundle_template=cls.bundle_template_2,  # Use different template to avoid unique constraint
            exam_session_subject=cls.ess,
            is_active=False,  # Inactive bundle
            display_order=2
        )

        # Create bundle products
        cls.bundle_product_1 = BundleProduct.objects.create(
            bundle=cls.store_bundle,
            product=cls.store_product_1,
            default_price_type='retail',
            quantity=1,
            sort_order=1,
            is_active=True
        )
        cls.bundle_product_2 = BundleProduct.objects.create(
            bundle=cls.store_bundle,
            product=cls.store_product_2,
            default_price_type='retail',
            quantity=1,
            sort_order=2,
            is_active=True
        )


class TestProductViewSet(StoreAPITestCase):
    """T050: Test Product API endpoints.

    Note: The list endpoint returns BOTH products and bundles in unified format.
    Products have is_bundle=False and product_code, bundles have is_bundle=True.
    """

    def test_list_returns_unified_products_and_bundles(self):
        """List endpoint should return both products and bundles."""
        response = self.client.get('/api/store/products/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        # Should have pagination metadata
        self.assertIn('count', data)
        self.assertIn('products_count', data)
        self.assertIn('bundles_count', data)
        self.assertIn('results', data)

        # Should have both products and bundles
        self.assertGreater(data['products_count'], 0)
        self.assertGreater(data['bundles_count'], 0)

    def test_list_products_returns_active_only(self):
        """List endpoint should return only active products."""
        response = self.client.get('/api/store/products/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = self.get_results(response)

        # Filter to products only (is_bundle=False)
        products = [p for p in results if not p.get('is_bundle', False)]

        # Should return only active products
        product_codes = [p['product_code'] for p in products]
        self.assertIn('CM2/PCSM01P/2025-04', product_codes)
        self.assertIn('CM2/ECSM01E/2025-04', product_codes)
        # Inactive product should not be included
        self.assertNotIn('CM2/PPB01P/2025-04', product_codes)

    def test_list_products_contains_required_fields(self):
        """List response should contain required fields for products and bundles."""
        response = self.client.get('/api/store/products/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = self.get_results(response)
        self.assertGreater(len(results), 0)

        # Check fields for products (is_bundle=False)
        products = [p for p in results if not p.get('is_bundle', False)]
        if products:
            product = products[0]
            self.assertIn('id', product)
            self.assertIn('product_code', product)
            self.assertIn('subject_code', product)
            self.assertIn('is_active', product)
            self.assertIn('is_bundle', product)
            self.assertEqual(product['is_bundle'], False)

        # Check fields for bundles (is_bundle=True)
        bundles = [p for p in results if p.get('is_bundle', False)]
        if bundles:
            bundle = bundles[0]
            self.assertIn('id', bundle)
            self.assertIn('name', bundle)
            self.assertIn('subject_code', bundle)
            self.assertIn('is_active', bundle)
            self.assertIn('is_bundle', bundle)
            self.assertEqual(bundle['is_bundle'], True)

    def test_retrieve_product_detail(self):
        """Retrieve endpoint should return detailed product information."""
        response = self.client.get(f'/api/store/products/{self.store_product_1.id}/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        self.assertEqual(data['id'], self.store_product_1.id)
        self.assertEqual(data['product_code'], 'CM2/PCSM01P/2025-04')
        self.assertEqual(data['subject_code'], 'CM2')
        self.assertEqual(data['session_code'], '2025-04')
        self.assertEqual(data['variation_type'], 'Printed')
        self.assertEqual(data['product_name'], 'Core Study Material CM2')
        self.assertTrue(data['is_active'])

    def test_retrieve_inactive_product_returns_404(self):
        """Retrieve endpoint should return 404 for inactive products."""
        response = self.client.get(f'/api/store/products/{self.store_product_inactive.id}/')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_fr012_hides_products_with_inactive_catalog_template(self):
        """FR-012: Products with inactive catalog template should be hidden from list."""
        response = self.client.get('/api/store/products/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = self.get_results(response)

        # Filter to products only
        products = [p for p in results if not p.get('is_bundle', False)]

        # Product linked to inactive catalog template should not appear
        product_codes = [p['product_code'] for p in products]
        self.assertNotIn(
            'CM2/PDM01P/2025-04',
            product_codes,
            "Product with inactive catalog template should be hidden"
        )

    def test_fr012_retrieve_inactive_template_product_returns_404(self):
        """FR-012: Retrieve should return 404 for products with inactive catalog template."""
        response = self.client.get(f'/api/store/products/{self.store_product_inactive_template.id}/')

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND,
            "Product with inactive catalog template should not be retrievable"
        )

    def test_product_prices_action(self):
        """Products/{id}/prices/ action should return product prices."""
        response = self.client.get(f'/api/store/products/{self.store_product_1.id}/prices/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        self.assertEqual(len(data), 2)  # retail and student prices
        price_types = [p['price_type'] for p in data]
        self.assertIn('retail', price_types)
        self.assertIn('student', price_types)

    def test_product_prices_contains_required_fields(self):
        """Prices action should return required price fields."""
        response = self.client.get(f'/api/store/products/{self.store_product_1.id}/prices/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertGreater(len(data), 0)

        price = data[0]
        self.assertIn('id', price)
        self.assertIn('price_type', price)
        self.assertIn('amount', price)
        self.assertIn('currency', price)

    def test_list_bundles_displayed_first(self):
        """List endpoint should return bundles before products."""
        response = self.client.get('/api/store/products/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = self.get_results(response)

        # First items should be bundles (is_bundle=True)
        if results:
            first_item = results[0]
            self.assertTrue(first_item.get('is_bundle', False))

    def test_list_pagination_params(self):
        """List endpoint should support pagination parameters."""
        response = self.client.get('/api/store/products/?page=1&page_size=2')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        self.assertIn('page', data)
        self.assertIn('has_next', data)
        self.assertIn('has_previous', data)
        self.assertEqual(len(data['results']), 2)  # Only 2 items per page


class TestPriceViewSet(StoreAPITestCase):
    """T051: Test Price API endpoints."""

    def test_list_prices(self):
        """List endpoint should return all prices."""
        response = self.client.get('/api/store/prices/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = self.get_results(response)

        # Should return all 3 prices
        self.assertEqual(len(results), 3)

    def test_list_prices_contains_required_fields(self):
        """List response should contain required fields."""
        response = self.client.get('/api/store/prices/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = self.get_results(response)
        self.assertGreater(len(results), 0)

        price = results[0]
        self.assertIn('id', price)
        self.assertIn('price_type', price)
        self.assertIn('amount', price)
        self.assertIn('currency', price)

    def test_retrieve_price_detail(self):
        """Retrieve endpoint should return detailed price information."""
        response = self.client.get(f'/api/store/prices/{self.price_retail.id}/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        self.assertEqual(data['id'], self.price_retail.id)
        self.assertEqual(data['price_type'], 'retail')
        self.assertEqual(data['amount'], '199.99')
        self.assertEqual(data['currency'], 'GBP')
        self.assertEqual(data['product_code'], 'CM2/PCSM01P/2025-04')

    def test_retrieve_nonexistent_price(self):
        """Retrieve endpoint should return 404 for non-existent prices."""
        response = self.client.get('/api/store/prices/99999/')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class TestBundleViewSet(StoreAPITestCase):
    """T052: Test Bundle API endpoints."""

    def test_list_bundles_returns_active_only(self):
        """List endpoint should return only active bundles."""
        response = self.client.get('/api/store/bundles/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = self.get_results(response)

        # Should return only active bundles
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['id'], self.store_bundle.id)

    def test_list_bundles_contains_required_fields(self):
        """List response should contain required fields."""
        response = self.client.get('/api/store/bundles/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = self.get_results(response)
        self.assertGreater(len(results), 0)

        bundle = results[0]
        self.assertIn('id', bundle)
        self.assertIn('name', bundle)
        self.assertIn('is_active', bundle)
        self.assertIn('display_order', bundle)
        self.assertIn('product_count', bundle)

    def test_list_bundles_product_count(self):
        """List response should include correct product count."""
        response = self.client.get('/api/store/bundles/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = self.get_results(response)

        bundle = results[0]
        self.assertEqual(bundle['product_count'], 2)  # 2 active bundle products

    def test_retrieve_bundle_detail(self):
        """Retrieve endpoint should return detailed bundle information."""
        response = self.client.get(f'/api/store/bundles/{self.store_bundle.id}/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        self.assertEqual(data['id'], self.store_bundle.id)
        self.assertEqual(data['name'], 'Complete CM2 Bundle')
        self.assertEqual(data['description'], 'All CM2 study materials')
        self.assertEqual(data['subject_code'], 'CM2')
        self.assertEqual(data['session_code'], '2025-04')
        self.assertTrue(data['is_active'])

    def test_retrieve_bundle_includes_products(self):
        """Retrieve endpoint should include nested bundle products."""
        response = self.client.get(f'/api/store/bundles/{self.store_bundle.id}/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        self.assertIn('bundle_products', data)
        self.assertEqual(len(data['bundle_products']), 2)

        product_codes = [bp['product_code'] for bp in data['bundle_products']]
        self.assertIn('CM2/PCSM01P/2025-04', product_codes)
        self.assertIn('CM2/ECSM01E/2025-04', product_codes)

    def test_retrieve_inactive_bundle_returns_404(self):
        """Retrieve endpoint should return 404 for inactive bundles."""
        response = self.client.get(f'/api/store/bundles/{self.store_bundle_inactive.id}/')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class TestBundleProductEndpoint(StoreAPITestCase):
    """T053: Test BundleProduct nested endpoint."""

    def test_bundle_products_action(self):
        """Bundles/{id}/products/ action should return bundle products."""
        response = self.client.get(f'/api/store/bundles/{self.store_bundle.id}/products/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        self.assertEqual(len(data), 2)

    def test_bundle_products_contains_required_fields(self):
        """Products action should return required fields."""
        response = self.client.get(f'/api/store/bundles/{self.store_bundle.id}/products/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertGreater(len(data), 0)

        bundle_product = data[0]
        self.assertIn('id', bundle_product)
        self.assertIn('product', bundle_product)
        self.assertIn('product_code', bundle_product)
        self.assertIn('default_price_type', bundle_product)
        self.assertIn('quantity', bundle_product)
        self.assertIn('sort_order', bundle_product)
        self.assertIn('is_active', bundle_product)

    def test_bundle_products_returns_active_only(self):
        """Products action should return only active bundle products."""
        from store.models import BundleProduct

        # Deactivate one bundle product
        self.bundle_product_2.is_active = False
        self.bundle_product_2.save()

        response = self.client.get(f'/api/store/bundles/{self.store_bundle.id}/products/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        # Should only return the active bundle product
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['product_code'], 'CM2/PCSM01P/2025-04')

        # Restore for other tests
        self.bundle_product_2.is_active = True
        self.bundle_product_2.save()

    def test_bundle_products_invalid_bundle_id(self):
        """Products action should return 404 for invalid bundle ID."""
        response = self.client.get('/api/store/bundles/99999/products/')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class TestStoreAPIReadOnly(StoreAPITestCase):
    """Test that store API is read-only (no POST/PUT/DELETE)."""

    def test_products_no_post(self):
        """Products endpoint should not allow POST."""
        response = self.client.post('/api/store/products/', {})
        self.assertIn(response.status_code, [
            status.HTTP_405_METHOD_NOT_ALLOWED,
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN
        ])

    def test_products_no_put(self):
        """Products endpoint should not allow PUT."""
        response = self.client.put(f'/api/store/products/{self.store_product_1.id}/', {})
        self.assertIn(response.status_code, [
            status.HTTP_405_METHOD_NOT_ALLOWED,
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN
        ])

    def test_products_no_delete(self):
        """Products endpoint should not allow DELETE."""
        response = self.client.delete(f'/api/store/products/{self.store_product_1.id}/')
        self.assertIn(response.status_code, [
            status.HTTP_405_METHOD_NOT_ALLOWED,
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN
        ])

    def test_bundles_no_post(self):
        """Bundles endpoint should not allow POST."""
        response = self.client.post('/api/store/bundles/', {})
        self.assertIn(response.status_code, [
            status.HTTP_405_METHOD_NOT_ALLOWED,
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN
        ])

    def test_prices_no_post(self):
        """Prices endpoint should not allow POST."""
        response = self.client.post('/api/store/prices/', {})
        self.assertIn(response.status_code, [
            status.HTTP_405_METHOD_NOT_ALLOWED,
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN
        ])
