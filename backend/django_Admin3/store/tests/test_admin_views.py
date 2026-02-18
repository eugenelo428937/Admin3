"""Tests for store admin API endpoints.

TDD tests for admin write operations on store entities.

Test classes:
- TestStoreProductAdminWrite (T021)
- TestStorePriceAdminWrite (T022)
- TestStoreBundleAdminWrite (T023)
- TestStoreBundleProductViewSet (T024)
"""
from decimal import Decimal
from django.utils import timezone
from datetime import timedelta
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from catalog.models import (
    Subject,
    ExamSession,
    ExamSessionSubject,
    Product as CatalogProduct,
    ProductVariation,
    ProductProductVariation,
    ProductBundle,
)
from store.models import Product, Price, Bundle, BundleProduct

User = get_user_model()


class StoreAdminTestCase(APITestCase):
    """Base test case for store admin endpoint tests.

    Provides JWT auth helpers matching CatalogAPITestCase pattern
    and creates all prerequisite catalog + store entities.
    """

    @classmethod
    def setUpTestData(cls):
        """Create test data for store admin tests."""
        # Auth users
        cls.superuser = User.objects.create_superuser(
            username='store_admin',
            email='store_admin@test.com',
            password='testpass123',
        )
        cls.regular_user = User.objects.create_user(
            username='store_user',
            email='store_user@test.com',
            password='testpass123',
        )

        # Catalog prerequisites
        cls.subject = Subject.objects.create(
            code='CM2-STORE',
            description='Actuarial Mathematics',
            active=True,
        )
        cls.exam_session = ExamSession.objects.create(
            session_code='2026-04-ST',
            start_date=timezone.now() + timedelta(days=30),
            end_date=timezone.now() + timedelta(days=44),
        )
        cls.ess = ExamSessionSubject.objects.create(
            exam_session=cls.exam_session,
            subject=cls.subject,
            is_active=True,
        )

        # Second ESS for unique constraint tests
        cls.subject_2 = Subject.objects.create(
            code='SA1-STORE',
            description='Health and Care',
            active=True,
        )
        cls.ess_2 = ExamSessionSubject.objects.create(
            exam_session=cls.exam_session,
            subject=cls.subject_2,
            is_active=True,
        )

        # Catalog products and variations
        cls.catalog_product = CatalogProduct.objects.create(
            fullname='Core Study Material',
            shortname='CSM',
            code='CSM-ST01',
            is_active=True,
        )
        cls.variation_printed = ProductVariation.objects.create(
            variation_type='Printed',
            name='Printed Book',
            code='P-ST',
        )
        cls.variation_ebook = ProductVariation.objects.create(
            variation_type='eBook',
            name='eBook',
            code='E-ST',
        )
        cls.ppv_printed = ProductProductVariation.objects.create(
            product=cls.catalog_product,
            product_variation=cls.variation_printed,
        )
        cls.ppv_ebook = ProductProductVariation.objects.create(
            product=cls.catalog_product,
            product_variation=cls.variation_ebook,
        )

        # Store products
        cls.store_product_1 = Product.objects.create(
            exam_session_subject=cls.ess,
            product_product_variation=cls.ppv_printed,
            product_code='CM2-ST/PCSM-ST01P-ST/2026-04-ST',
            is_active=True,
        )
        cls.store_product_2 = Product.objects.create(
            exam_session_subject=cls.ess,
            product_product_variation=cls.ppv_ebook,
            product_code='CM2-ST/ECSM-ST01E-ST/2026-04-ST',
            is_active=True,
        )

        # Prices
        cls.price_standard = Price.objects.create(
            product=cls.store_product_1,
            price_type='standard',
            amount=Decimal('199.99'),
            currency='GBP',
        )
        cls.price_retaker = Price.objects.create(
            product=cls.store_product_1,
            price_type='retaker',
            amount=Decimal('149.99'),
            currency='GBP',
        )

        # Bundle template and store bundle
        cls.bundle_template = ProductBundle.objects.create(
            bundle_name='Complete Bundle',
            subject=cls.subject,
            bundle_description='All materials',
            display_order=1,
            is_active=True,
        )
        cls.store_bundle = Bundle.objects.create(
            bundle_template=cls.bundle_template,
            exam_session_subject=cls.ess,
            is_active=True,
            display_order=1,
        )

        # Bundle products
        cls.bundle_product_1 = BundleProduct.objects.create(
            bundle=cls.store_bundle,
            product=cls.store_product_1,
            default_price_type='standard',
            quantity=1,
            sort_order=1,
        )

    def authenticate_superuser(self):
        """Authenticate as superuser."""
        refresh = RefreshToken.for_user(self.superuser)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')

    def authenticate_regular_user(self):
        """Authenticate as regular user."""
        refresh = RefreshToken.for_user(self.regular_user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')

    def unauthenticate(self):
        """Remove authentication."""
        self.client.credentials()


# =============================================================================
# US3: Store Product Admin Write
# =============================================================================

class TestStoreProductAdminWrite(StoreAdminTestCase):
    """T021: Tests for store Product admin write operations."""

    def test_get_list_returns_200(self):
        """GET /api/store/products/ returns 200 (backward compat)."""
        response = self.client.get('/api/store/products/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_as_superuser_returns_201(self):
        """POST as superuser creates product with auto-generated code."""
        self.authenticate_superuser()
        response = self.client.post('/api/store/products/', {
            'exam_session_subject': self.ess_2.id,
            'product_product_variation': self.ppv_printed.id,
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.json()
        self.assertIn('product_code', data)
        self.assertTrue(len(data['product_code']) > 0)

    def test_create_as_regular_user_returns_403(self):
        """POST as regular user returns 403."""
        self.authenticate_regular_user()
        response = self.client.post('/api/store/products/', {
            'exam_session_subject': self.ess_2.id,
            'product_product_variation': self.ppv_printed.id,
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_duplicate_returns_400(self):
        """POST duplicate (ess, ppv) returns 400."""
        self.authenticate_superuser()
        response = self.client.post('/api/store/products/', {
            'exam_session_subject': self.ess.id,
            'product_product_variation': self.ppv_printed.id,
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_as_superuser_returns_200(self):
        """PATCH as superuser returns 200."""
        self.authenticate_superuser()
        response = self.client.patch(f'/api/store/products/{self.store_product_1.id}/', {
            'is_active': False,
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_delete_as_superuser_returns_204(self):
        """DELETE as superuser returns 204 for product with no dependents."""
        self.authenticate_superuser()
        product = Product.objects.create(
            exam_session_subject=self.ess_2,
            product_product_variation=self.ppv_ebook,
            product_code='TEST/DELETE/2026-04-ST',
        )
        response = self.client.delete(f'/api/store/products/{product.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)


# =============================================================================
# US3: Store Price Admin Write
# =============================================================================

class TestStorePriceAdminWrite(StoreAdminTestCase):
    """T022: Tests for store Price admin write operations."""

    def test_get_list_returns_200(self):
        """GET /api/store/prices/ returns 200 (backward compat)."""
        response = self.client.get('/api/store/prices/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_as_superuser_returns_201(self):
        """POST as superuser returns 201."""
        self.authenticate_superuser()
        response = self.client.post('/api/store/prices/', {
            'product': self.store_product_2.id,
            'price_type': 'standard',
            'amount': '99.99',
            'currency': 'GBP',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_create_as_regular_user_returns_403(self):
        """POST as regular user returns 403."""
        self.authenticate_regular_user()
        response = self.client.post('/api/store/prices/', {
            'product': self.store_product_2.id,
            'price_type': 'standard',
            'amount': '99.99',
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_duplicate_returns_400(self):
        """POST duplicate (product, price_type) returns 400."""
        self.authenticate_superuser()
        response = self.client.post('/api/store/prices/', {
            'product': self.store_product_1.id,
            'price_type': 'standard',
            'amount': '199.99',
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_as_superuser_returns_200(self):
        """PATCH as superuser returns 200."""
        self.authenticate_superuser()
        response = self.client.patch(f'/api/store/prices/{self.price_standard.id}/', {
            'amount': '209.99',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_delete_as_superuser_returns_204(self):
        """DELETE as superuser returns 204."""
        self.authenticate_superuser()
        price = Price.objects.create(
            product=self.store_product_2,
            price_type='reduced',
            amount=Decimal('79.99'),
        )
        response = self.client.delete(f'/api/store/prices/{price.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)


# =============================================================================
# US3: Store Bundle Admin Write
# =============================================================================

class TestStoreBundleAdminWrite(StoreAdminTestCase):
    """T023: Tests for store Bundle admin write operations."""

    def test_get_list_returns_200(self):
        """GET /api/store/bundles/ returns 200 (backward compat)."""
        response = self.client.get('/api/store/bundles/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_products_action_returns_200(self):
        """GET /api/store/bundles/{id}/products/ returns 200 (backward compat)."""
        response = self.client.get(f'/api/store/bundles/{self.store_bundle.id}/products/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_as_superuser_returns_201(self):
        """POST as superuser returns 201."""
        self.authenticate_superuser()
        bundle_template_2 = ProductBundle.objects.create(
            bundle_name='Basic Bundle',
            subject=self.subject,
            bundle_description='Basic materials',
        )
        response = self.client.post('/api/store/bundles/', {
            'bundle_template': bundle_template_2.id,
            'exam_session_subject': self.ess_2.id,
            'is_active': True,
            'display_order': 2,
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_create_as_regular_user_returns_403(self):
        """POST as regular user returns 403."""
        self.authenticate_regular_user()
        response = self.client.post('/api/store/bundles/', {
            'bundle_template': self.bundle_template.id,
            'exam_session_subject': self.ess_2.id,
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_duplicate_returns_400(self):
        """POST duplicate (bundle_template, ess) returns 400."""
        self.authenticate_superuser()
        response = self.client.post('/api/store/bundles/', {
            'bundle_template': self.bundle_template.id,
            'exam_session_subject': self.ess.id,
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_as_superuser_returns_200(self):
        """PATCH as superuser returns 200."""
        self.authenticate_superuser()
        response = self.client.patch(f'/api/store/bundles/{self.store_bundle.id}/', {
            'override_name': 'Custom Bundle Name',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_delete_as_superuser_returns_204(self):
        """DELETE as superuser returns 204 for bundle with no dependents."""
        self.authenticate_superuser()
        template = ProductBundle.objects.create(
            bundle_name='Temp Template',
            subject=self.subject_2,
        )
        bundle = Bundle.objects.create(
            bundle_template=template,
            exam_session_subject=self.ess_2,
        )
        response = self.client.delete(f'/api/store/bundles/{bundle.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)


# =============================================================================
# US3: Store BundleProduct ViewSet
# =============================================================================

class TestStoreBundleProductViewSet(StoreAdminTestCase):
    """T024: Tests for store BundleProduct admin CRUD."""

    def test_list_returns_200(self):
        """GET /api/store/bundle-products/ returns 200."""
        response = self.client.get('/api/store/bundle-products/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_as_superuser_returns_201(self):
        """POST as superuser returns 201."""
        self.authenticate_superuser()
        response = self.client.post('/api/store/bundle-products/', {
            'bundle': self.store_bundle.id,
            'product': self.store_product_2.id,
            'default_price_type': 'standard',
            'quantity': 1,
            'sort_order': 2,
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_create_as_regular_user_returns_403(self):
        """POST as regular user returns 403."""
        self.authenticate_regular_user()
        response = self.client.post('/api/store/bundle-products/', {
            'bundle': self.store_bundle.id,
            'product': self.store_product_2.id,
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_duplicate_returns_400(self):
        """POST duplicate (bundle, product) returns 400."""
        self.authenticate_superuser()
        response = self.client.post('/api/store/bundle-products/', {
            'bundle': self.store_bundle.id,
            'product': self.store_product_1.id,
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_as_superuser_returns_200(self):
        """PATCH as superuser returns 200."""
        self.authenticate_superuser()
        response = self.client.patch(f'/api/store/bundle-products/{self.bundle_product_1.id}/', {
            'quantity': 2,
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_delete_as_superuser_returns_204(self):
        """DELETE as superuser returns 204."""
        self.authenticate_superuser()
        bp = BundleProduct.objects.create(
            bundle=self.store_bundle,
            product=self.store_product_2,
            sort_order=3,
        )
        response = self.client.delete(f'/api/store/bundle-products/{bp.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
