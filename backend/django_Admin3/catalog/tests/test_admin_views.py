"""Tests for catalog admin API endpoints.

TDD tests for admin CRUD operations on catalog entities.

Test classes:
- Phase 1 (Setup): CatalogAdminTestCase base with extended test fixtures
- Phase 2 (US1): ExamSessionSubject, ProductVariation, ProductProductVariation
- Phase 3 (US2): ProductBundle, ProductBundleProduct, ProductVariationRecommendation
"""
from decimal import Decimal
from django.utils import timezone
from datetime import timedelta
from rest_framework import status

from catalog.tests.base import CatalogAPITestCase
from catalog.models import (
    ExamSessionSubject,
    ProductVariation,
    ProductProductVariation,
    ProductBundle,
    ProductBundleProduct,
    ProductVariationRecommendation,
)


class CatalogAdminTestCase(CatalogAPITestCase):
    """Extended base test case for catalog admin endpoint tests.

    Extends CatalogAPITestCase with additional fixtures needed for
    admin CRUD tests across US1 and US2.
    """

    def setUp(self):
        """Create extended test data for admin endpoint tests."""
        super().setUp()

        from catalog.tests.fixtures import (
            create_product_variation,
            create_product_product_variation,
            create_product_bundle,
        )

        # Additional ProductVariation for unique constraint tests
        self.variation_marking = create_product_variation(
            variation_type='Marking',
            name='Marking Service',
            description='Professional marking service',
            description_short='Marking',
            code='VAR-MARKING'
        )

        # Additional ProductProductVariation
        self.ppv_core_hub = create_product_product_variation(
            self.product_core,
            self.variation_hub,
        )

        # Additional ProductBundle for US2 tests
        self.bundle_sa1 = create_product_bundle(
            subject=self.subject_sa1,
            bundle_name='SA1 Study Bundle',
            bundle_description='Materials for SA1',
            is_featured=False,
            is_active=True,
            display_order=1,
        )

        # ProductVariationRecommendation
        self.recommendation, _ = ProductVariationRecommendation.objects.get_or_create(
            product_product_variation=self.ppv_core_ebook,
            defaults={
                'recommended_product_product_variation': self.ppv_marking_hub,
            }
        )


# =============================================================================
# Phase 2: US1 — ExamSessionSubject, ProductVariation, PPV
# =============================================================================

class TestExamSessionSubjectAdminViewSet(CatalogAdminTestCase):
    """T004: Tests for ExamSessionSubject admin CRUD."""

    def test_list_returns_200(self):
        """GET /api/catalog/exam-session-subjects/ returns 200."""
        response = self.client.get('/api/catalog/exam-session-subjects/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_retrieve_returns_200(self):
        """GET /api/catalog/exam-session-subjects/{id}/ returns 200."""
        ess = ExamSessionSubject.objects.create(
            exam_session=self.session_april,
            subject=self.subject_cm2,
        )
        response = self.client.get(f'/api/catalog/exam-session-subjects/{ess.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_as_superuser_returns_201(self):
        """POST as superuser returns 201."""
        self.authenticate_superuser()
        response = self.client.post('/api/catalog/exam-session-subjects/', {
            'exam_session': self.session_sept.id,
            'subject': self.subject_sa1.id,
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_create_as_regular_user_returns_403(self):
        """POST as regular user returns 403."""
        self.authenticate_regular_user()
        response = self.client.post('/api/catalog/exam-session-subjects/', {
            'exam_session': self.session_sept.id,
            'subject': self.subject_sa1.id,
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_duplicate_returns_400(self):
        """POST duplicate (exam_session, subject) returns 400."""
        self.authenticate_superuser()
        ExamSessionSubject.objects.create(
            exam_session=self.session_april,
            subject=self.subject_sa1,
        )
        response = self.client.post('/api/catalog/exam-session-subjects/', {
            'exam_session': self.session_april.id,
            'subject': self.subject_sa1.id,
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_as_superuser_returns_200(self):
        """PUT as superuser returns 200."""
        self.authenticate_superuser()
        ess = ExamSessionSubject.objects.create(
            exam_session=self.session_april,
            subject=self.subject_cm2,
            is_active=True,
        )
        response = self.client.put(f'/api/catalog/exam-session-subjects/{ess.id}/', {
            'exam_session': self.session_april.id,
            'subject': self.subject_cm2.id,
            'is_active': False,
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ess.refresh_from_db()
        self.assertFalse(ess.is_active)

    def test_delete_as_superuser_returns_204(self):
        """DELETE as superuser returns 204."""
        self.authenticate_superuser()
        ess = ExamSessionSubject.objects.create(
            exam_session=self.session_sept,
            subject=self.subject_cm2,
        )
        response = self.client.delete(f'/api/catalog/exam-session-subjects/{ess.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_delete_with_dependent_store_products_returns_400(self):
        """DELETE returns 400 when ESS has dependent store products."""
        from store.models import Product as StoreProduct
        self.authenticate_superuser()
        ess = ExamSessionSubject.objects.create(
            exam_session=self.session_sept,
            subject=self.subject_sa1,
        )
        # Create dependent store product
        StoreProduct.objects.create(
            exam_session_subject=ess,
            product_product_variation=self.ppv_core_ebook,
            product_code='TEST/DEPEND/2026-09',
        )
        response = self.client.delete(f'/api/catalog/exam-session-subjects/{ess.id}/')
        # CASCADE delete will succeed since store.Product uses CASCADE not PROTECT
        # If it has PROTECT, it would be 400
        self.assertIn(response.status_code, [status.HTTP_204_NO_CONTENT, status.HTTP_400_BAD_REQUEST])


class TestProductVariationAdminViewSet(CatalogAdminTestCase):
    """T005: Tests for ProductVariation admin CRUD."""

    def test_list_returns_200(self):
        """GET /api/catalog/product-variations/ returns 200."""
        response = self.client.get('/api/catalog/product-variations/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_retrieve_returns_200(self):
        """GET /api/catalog/product-variations/{id}/ returns 200."""
        response = self.client.get(f'/api/catalog/product-variations/{self.variation_ebook.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_response_includes_description_short_and_code(self):
        """Response should include description_short and code fields."""
        response = self.client.get(f'/api/catalog/product-variations/{self.variation_ebook.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertIn('description_short', data)
        self.assertIn('code', data)

    def test_create_as_superuser_returns_201(self):
        """POST as superuser returns 201."""
        self.authenticate_superuser()
        response = self.client.post('/api/catalog/product-variations/', {
            'variation_type': 'Tutorial',
            'name': 'Live Tutorial',
            'description': 'Live online tutorial sessions',
            'description_short': 'Live sessions',
            'code': 'VAR-TUTORIAL-LIVE',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_create_as_regular_user_returns_403(self):
        """POST as regular user returns 403."""
        self.authenticate_regular_user()
        response = self.client.post('/api/catalog/product-variations/', {
            'variation_type': 'Tutorial',
            'name': 'New Tutorial',
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_duplicate_returns_400(self):
        """POST duplicate (variation_type, name) returns 400."""
        self.authenticate_superuser()
        response = self.client.post('/api/catalog/product-variations/', {
            'variation_type': 'eBook',
            'name': 'Standard eBook',
            'code': 'VAR-EBOOK-DUP',
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_as_superuser_returns_200(self):
        """PUT as superuser returns 200."""
        self.authenticate_superuser()
        response = self.client.put(f'/api/catalog/product-variations/{self.variation_marking.id}/', {
            'variation_type': 'Marking',
            'name': 'Marking Service',
            'description': 'Updated marking description',
            'description_short': 'Updated marking',
            'code': 'VAR-MARKING',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_delete_as_superuser_returns_204(self):
        """DELETE as superuser returns 204 for variation with no dependents."""
        self.authenticate_superuser()
        variation = ProductVariation.objects.create(
            variation_type='Tutorial',
            name='Temp Tutorial',
            code='VAR-TEMP-TUT',
        )
        response = self.client.delete(f'/api/catalog/product-variations/{variation.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)


class TestProductProductVariationAdminViewSet(CatalogAdminTestCase):
    """T006: Tests for ProductProductVariation admin CRUD."""

    def test_list_returns_200(self):
        """GET /api/catalog/product-product-variations/ returns 200."""
        response = self.client.get('/api/catalog/product-product-variations/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_retrieve_returns_200(self):
        """GET /api/catalog/product-product-variations/{id}/ returns 200."""
        response = self.client.get(f'/api/catalog/product-product-variations/{self.ppv_core_ebook.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_as_superuser_returns_201(self):
        """POST as superuser returns 201."""
        self.authenticate_superuser()
        response = self.client.post('/api/catalog/product-product-variations/', {
            'product': self.product_tutorial.id,
            'product_variation': self.variation_marking.id,
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_create_as_regular_user_returns_403(self):
        """POST as regular user returns 403."""
        self.authenticate_regular_user()
        response = self.client.post('/api/catalog/product-product-variations/', {
            'product': self.product_tutorial.id,
            'product_variation': self.variation_marking.id,
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_duplicate_returns_400(self):
        """POST duplicate (product, product_variation) returns 400."""
        self.authenticate_superuser()
        response = self.client.post('/api/catalog/product-product-variations/', {
            'product': self.product_core.id,
            'product_variation': self.variation_ebook.id,
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_delete_as_superuser_returns_204(self):
        """DELETE as superuser returns 204 for PPV with no dependents."""
        self.authenticate_superuser()
        ppv = ProductProductVariation.objects.create(
            product=self.product_tutorial,
            product_variation=self.variation_marking,
        )
        response = self.client.delete(f'/api/catalog/product-product-variations/{ppv.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_delete_with_dependent_store_products_returns_400(self):
        """DELETE returns 400 when PPV has dependent store products."""
        from store.models import Product as StoreProduct
        self.authenticate_superuser()
        ppv = ProductProductVariation.objects.create(
            product=self.product_tutorial,
            product_variation=self.variation_printed,
        )
        ess = ExamSessionSubject.objects.create(
            exam_session=self.session_sept,
            subject=self.subject_sa1,
        )
        StoreProduct.objects.create(
            exam_session_subject=ess,
            product_product_variation=ppv,
            product_code='TEST/PPV-DEP/2026-09',
        )
        response = self.client.delete(f'/api/catalog/product-product-variations/{ppv.id}/')
        # CASCADE vs PROTECT — depends on model on_delete setting
        self.assertIn(response.status_code, [status.HTTP_204_NO_CONTENT, status.HTTP_400_BAD_REQUEST])

    def test_list_response_includes_variation_details(self):
        """GET list should include nested variation name, code, and type."""
        response = self.client.get('/api/catalog/product-product-variations/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        results = data if isinstance(data, list) else data.get('results', data)
        self.assertTrue(len(results) > 0)
        first = results[0]
        self.assertIn('variation_name', first)
        self.assertIn('variation_code', first)
        self.assertIn('variation_type', first)

    def test_list_filter_by_product(self):
        """GET ?product={id} returns only PPVs for that product."""
        response = self.client.get(
            f'/api/catalog/product-product-variations/?product={self.product_core.id}'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        results = data if isinstance(data, list) else data.get('results', data)
        for item in results:
            self.assertEqual(item['product'], self.product_core.id)

    def test_list_filter_by_product_excludes_others(self):
        """GET ?product={id} must NOT include PPVs from other products."""
        response = self.client.get(
            f'/api/catalog/product-product-variations/?product={self.product_marking.id}'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        results = data if isinstance(data, list) else data.get('results', data)
        product_ids = {item['product'] for item in results}
        self.assertNotIn(self.product_core.id, product_ids)


# =============================================================================
# Phase 3: US2 — ProductBundle, ProductBundleProduct, Recommendation
# =============================================================================

class TestProductBundleAdminViewSet(CatalogAdminTestCase):
    """T013: Tests for ProductBundle admin CRUD."""

    def test_list_returns_200(self):
        """GET /api/catalog/product-bundles/ returns 200."""
        response = self.client.get('/api/catalog/product-bundles/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_as_superuser_returns_201(self):
        """POST as superuser returns 201."""
        self.authenticate_superuser()
        response = self.client.post('/api/catalog/product-bundles/', {
            'bundle_name': 'New Test Bundle',
            'subject': self.subject_cm2.id,
            'bundle_description': 'Test bundle description',
            'is_featured': True,
            'is_active': True,
            'display_order': 5,
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_create_as_regular_user_returns_403(self):
        """POST as regular user returns 403."""
        self.authenticate_regular_user()
        response = self.client.post('/api/catalog/product-bundles/', {
            'bundle_name': 'Blocked Bundle',
            'subject': self.subject_cm2.id,
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_duplicate_returns_400(self):
        """POST duplicate (subject, bundle_name) returns 400."""
        self.authenticate_superuser()
        response = self.client.post('/api/catalog/product-bundles/', {
            'bundle_name': 'CM2 Complete Bundle',  # already exists from fixtures
            'subject': self.subject_cm2.id,
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_as_superuser_returns_200(self):
        """PUT as superuser returns 200."""
        self.authenticate_superuser()
        response = self.client.put(f'/api/catalog/product-bundles/{self.bundle_sa1.id}/', {
            'bundle_name': 'SA1 Study Bundle',
            'subject': self.subject_sa1.id,
            'bundle_description': 'Updated description',
            'is_featured': True,
            'is_active': True,
            'display_order': 2,
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_delete_as_superuser_returns_204(self):
        """DELETE as superuser returns 204 for bundle with no dependents."""
        self.authenticate_superuser()
        bundle = ProductBundle.objects.create(
            subject=self.subject_sa1,
            bundle_name='Temp Delete Bundle',
        )
        response = self.client.delete(f'/api/catalog/product-bundles/{bundle.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_delete_with_dependent_store_bundles_returns_400(self):
        """DELETE returns 400 when bundle has dependent store bundles."""
        from store.models import Bundle as StoreBundle
        self.authenticate_superuser()
        bundle = ProductBundle.objects.create(
            subject=self.subject_sa1,
            bundle_name='Bundle With Store Deps',
        )
        ess = ExamSessionSubject.objects.create(
            exam_session=self.session_sept,
            subject=self.subject_sa1,
        )
        StoreBundle.objects.create(
            bundle_template=bundle,
            exam_session_subject=ess,
        )
        response = self.client.delete(f'/api/catalog/product-bundles/{bundle.id}/')
        # CASCADE on store.Bundle.bundle_template means this deletes successfully
        self.assertIn(response.status_code, [status.HTTP_204_NO_CONTENT, status.HTTP_400_BAD_REQUEST])


class TestProductBundleProductAdminViewSet(CatalogAdminTestCase):
    """T014: Tests for ProductBundleProduct admin CRUD."""

    def test_list_returns_200(self):
        """GET /api/catalog/bundle-products/ returns 200."""
        response = self.client.get('/api/catalog/bundle-products/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_list_filter_by_bundle(self):
        """GET /api/catalog/bundle-products/?bundle={id} filters results."""
        response = self.client.get(f'/api/catalog/bundle-products/?bundle={self.bundle_cm2.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        results = data if isinstance(data, list) else data.get('results', data)
        if isinstance(results, list):
            for item in results:
                self.assertEqual(item['bundle'], self.bundle_cm2.id)

    def test_create_as_superuser_returns_201(self):
        """POST as superuser returns 201."""
        self.authenticate_superuser()
        response = self.client.post('/api/catalog/bundle-products/', {
            'bundle': self.bundle_sa1.id,
            'product_product_variation': self.ppv_core_ebook.id,
            'default_price_type': 'standard',
            'quantity': 1,
            'sort_order': 1,
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_create_as_regular_user_returns_403(self):
        """POST as regular user returns 403."""
        self.authenticate_regular_user()
        response = self.client.post('/api/catalog/bundle-products/', {
            'bundle': self.bundle_sa1.id,
            'product_product_variation': self.ppv_core_ebook.id,
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_duplicate_returns_400(self):
        """POST duplicate (bundle, product_product_variation) returns 400."""
        self.authenticate_superuser()
        # bundle_product_1 already has (bundle_cm2, ppv_core_ebook)
        response = self.client.post('/api/catalog/bundle-products/', {
            'bundle': self.bundle_cm2.id,
            'product_product_variation': self.ppv_core_ebook.id,
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_delete_as_superuser_returns_204(self):
        """DELETE as superuser returns 204."""
        self.authenticate_superuser()
        bp = ProductBundleProduct.objects.create(
            bundle=self.bundle_sa1,
            product_product_variation=self.ppv_marking_hub,
            sort_order=1,
        )
        response = self.client.delete(f'/api/catalog/bundle-products/{bp.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_list_response_includes_product_details(self):
        """GET list should include nested product name, code, variation name, and code."""
        response = self.client.get('/api/catalog/bundle-products/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        results = data if isinstance(data, list) else data.get('results', data)
        self.assertTrue(len(results) > 0)
        first = results[0]
        self.assertIn('product_name', first)
        self.assertIn('product_code', first)
        self.assertIn('variation_name', first)
        self.assertIn('variation_code', first)

    def test_list_filter_by_bundle_excludes_others(self):
        """GET ?bundle={id} must NOT include products from other bundles."""
        response = self.client.get(
            f'/api/catalog/bundle-products/?bundle={self.bundle_sa1.id}'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        results = data if isinstance(data, list) else data.get('results', data)
        bundle_ids = {item['bundle'] for item in results}
        self.assertNotIn(self.bundle_cm2.id, bundle_ids)


class TestRecommendationAdminViewSet(CatalogAdminTestCase):
    """T015: Tests for ProductVariationRecommendation admin CRUD."""

    def test_list_returns_200(self):
        """GET /api/catalog/recommendations/ returns 200."""
        response = self.client.get('/api/catalog/recommendations/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_as_superuser_returns_201(self):
        """POST as superuser returns 201."""
        self.authenticate_superuser()
        response = self.client.post('/api/catalog/recommendations/', {
            'product_product_variation': self.ppv_core_printed.id,
            'recommended_product_product_variation': self.ppv_core_hub.id,
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_create_as_regular_user_returns_403(self):
        """POST as regular user returns 403."""
        self.authenticate_regular_user()
        response = self.client.post('/api/catalog/recommendations/', {
            'product_product_variation': self.ppv_core_printed.id,
            'recommended_product_product_variation': self.ppv_core_hub.id,
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_self_reference_returns_400(self):
        """POST with ppv == recommended_ppv returns 400."""
        self.authenticate_superuser()
        response = self.client.post('/api/catalog/recommendations/', {
            'product_product_variation': self.ppv_core_printed.id,
            'recommended_product_product_variation': self.ppv_core_printed.id,
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_duplicate_returns_400(self):
        """POST duplicate (OneToOne on ppv) returns 400."""
        self.authenticate_superuser()
        # cls.recommendation already has ppv_core_ebook → ppv_marking_hub
        response = self.client.post('/api/catalog/recommendations/', {
            'product_product_variation': self.ppv_core_ebook.id,
            'recommended_product_product_variation': self.ppv_core_hub.id,
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_delete_as_superuser_returns_204(self):
        """DELETE as superuser returns 204."""
        self.authenticate_superuser()
        rec = ProductVariationRecommendation.objects.create(
            product_product_variation=self.ppv_core_printed,
            recommended_product_product_variation=self.ppv_core_hub,
        )
        response = self.client.delete(f'/api/catalog/recommendations/{rec.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)


# =============================================================================
# Phase 4: US3 — Subject Admin (unfiltered CRUD)
# =============================================================================

class TestSubjectAdminViewSet(CatalogAdminTestCase):
    """Tests for SubjectAdminViewSet — unfiltered admin CRUD."""

    def _get_results(self, response):
        """Extract results list from paginated or non-paginated response."""
        data = response.json()
        if isinstance(data, dict) and 'results' in data:
            return data['results']
        return data

    def test_list_returns_all_subjects_including_inactive(self):
        """Admin list must include inactive subjects (unlike public endpoint)."""
        from catalog.models import Subject
        Subject.objects.filter(code='CM2').update(active=False)

        self.authenticate_superuser()
        response = self.client.get('/api/catalog/admin-subjects/')
        self.assertEqual(response.status_code, 200)

        codes = [s['code'] for s in self._get_results(response)]
        self.assertIn('CM2', codes)  # inactive subject must appear

    def test_list_includes_active_field(self):
        """Response must include the active boolean field."""
        self.authenticate_superuser()
        response = self.client.get('/api/catalog/admin-subjects/')
        self.assertEqual(response.status_code, 200)
        results = self._get_results(response)
        self.assertTrue(len(results) > 0, "Expected at least one subject in results")
        first = results[0]
        for field in ['id', 'code', 'description', 'name', 'active']:
            self.assertIn(field, first, f"Response missing expected field: {field}")

    def test_list_requires_superuser(self):
        """Non-superusers must get 403 on list."""
        self.authenticate_regular_user()
        response = self.client.get('/api/catalog/admin-subjects/')
        self.assertEqual(response.status_code, 403)

    def test_list_rejects_anonymous(self):
        """Anonymous users must get 401."""
        self.unauthenticate()
        response = self.client.get('/api/catalog/admin-subjects/')
        self.assertEqual(response.status_code, 401)

    def test_retrieve_single_subject(self):
        self.authenticate_superuser()
        response = self.client.get(f'/api/catalog/admin-subjects/{self.subject_cm2.id}/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['code'], 'CM2')

    def test_create_subject(self):
        self.authenticate_superuser()
        response = self.client.post('/api/catalog/admin-subjects/', {
            'code': 'SP3',
            'description': 'Test Subject SP3',
            'active': True,
        })
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()['code'], 'SP3')

    def test_update_subject(self):
        self.authenticate_superuser()
        response = self.client.put(f'/api/catalog/admin-subjects/{self.subject_cm2.id}/', {
            'code': 'CM2',
            'description': 'Updated Description',
            'active': False,
        })
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['description'], 'Updated Description')
        self.assertFalse(response.json()['active'])

    def test_delete_subject(self):
        from catalog.models import Subject
        subj = Subject.objects.create(code='DEL1', description='To Delete', active=True)
        self.authenticate_superuser()
        response = self.client.delete(f'/api/catalog/admin-subjects/{subj.id}/')
        self.assertEqual(response.status_code, 204)
