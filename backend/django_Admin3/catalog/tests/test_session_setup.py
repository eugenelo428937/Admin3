"""Tests for the session setup service and endpoints.

Tests SessionSetupService (copy, deactivation, data counts) and the
/api/catalog/session-setup/ endpoints.
"""
from django.utils import timezone
from datetime import timedelta

from catalog.tests.base import CatalogAPITestCase
from catalog.tests.fixtures import (
    create_exam_session,
    create_subject,
    create_product_variation,
    create_product,
    create_product_product_variation,
    create_product_bundle,
    create_product_bundle_product,
)
from catalog.models import ExamSessionSubject
from catalog.services.session_setup_service import SessionSetupService
from store.models.product import Product as StoreProduct
from store.models.price import Price
from store.models.bundle import Bundle
from store.models.bundle_product import BundleProduct


class TestSessionSetupService(CatalogAPITestCase):
    """Unit tests for SessionSetupService.copy_products_and_bundles()."""

    def setUp(self):
        super().setUp()
        # CatalogTestDataMixin gives us: subject_cm2, subject_sa1,
        # session_april, session_sept, variation_ebook, variation_printed,
        # ppv_core_ebook, ppv_core_printed, bundle_cm2, etc.

        # Create a Tutorial variation + PPV for exclusion testing
        self.variation_tutorial = create_product_variation(
            variation_type='Tutorial', name='Online Tutorial', code='VAR-TUT'
        )
        self.product_tut_template = create_product(
            fullname='CM2 Tutorial', shortname='CM2 Tut', code='CM2-TUT-T'
        )
        self.ppv_tutorial = create_product_product_variation(
            self.product_tut_template, self.variation_tutorial
        )

        # Create a Marking variation + PPV
        self.variation_marking = create_product_variation(
            variation_type='Marking', name='Standard Marking', code='VAR-MARK'
        )
        self.ppv_marking = create_product_product_variation(
            self.product_marking, self.variation_marking
        )

        # Create ESS for previous session (april) - CM2 and SA1
        self.ess_prev_cm2 = ExamSessionSubject.objects.get_or_create(
            exam_session=self.session_april, subject=self.subject_cm2
        )[0]
        self.ess_prev_sa1 = ExamSessionSubject.objects.get_or_create(
            exam_session=self.session_april, subject=self.subject_sa1
        )[0]

        # Create store products for previous session
        self.store_prod_ebook = StoreProduct.objects.create(
            exam_session_subject=self.ess_prev_cm2,
            product_product_variation=self.ppv_core_ebook,
            is_active=True,
        )
        self.store_prod_printed = StoreProduct.objects.create(
            exam_session_subject=self.ess_prev_cm2,
            product_product_variation=self.ppv_core_printed,
            is_active=True,
        )
        self.store_prod_marking = StoreProduct.objects.create(
            exam_session_subject=self.ess_prev_cm2,
            product_product_variation=self.ppv_marking,
            is_active=True,
        )
        # Tutorial product (should be excluded from copy).
        # Pass product_code explicitly: tutorial codes are auto-generated
        # from a linked TutorialEvent, which we don't need for this fixture
        # (see store.models.product.Product._generate_product_code).
        self.store_prod_tutorial = StoreProduct.objects.create(
            exam_session_subject=self.ess_prev_cm2,
            product_product_variation=self.ppv_tutorial,
            is_active=True,
            product_code='CM2/TUT/26',
        )
        # Inactive product (should be excluded from copy).
        # ppv_marking_hub uses variation_type='Hub' which (like Tutorial)
        # requires a linked TutorialEvent for code auto-gen — bypass with
        # an explicit product_code.
        self.store_prod_inactive = StoreProduct.objects.create(
            exam_session_subject=self.ess_prev_cm2,
            product_product_variation=self.ppv_marking_hub,
            is_active=False,
            product_code='CM2/HUB/26',
        )

        # Create prices for previous products
        Price.objects.create(
            product=self.store_prod_ebook, price_type='standard',
            amount=49.99, currency='GBP'
        )
        Price.objects.create(
            product=self.store_prod_ebook, price_type='retaker',
            amount=39.99, currency='GBP'
        )
        Price.objects.create(
            product=self.store_prod_printed, price_type='standard',
            amount=59.99, currency='GBP'
        )

        # Create ESS for new session (sept) - only CM2 (SA1 not assigned)
        self.ess_new_cm2 = ExamSessionSubject.objects.get_or_create(
            exam_session=self.session_sept, subject=self.subject_cm2
        )[0]

    def test_copy_products_basic(self):
        """Products are copied with correct ESS mapping."""
        result = SessionSetupService.copy_products_and_bundles(
            self.session_sept.id, self.session_april.id
        )
        # 3 active non-tutorial products for CM2 (ebook, printed, marking)
        self.assertEqual(result['products_created'], 3)

    def test_copy_prices(self):
        """Prices are copied for each product."""
        result = SessionSetupService.copy_products_and_bundles(
            self.session_sept.id, self.session_april.id
        )
        # ebook has 2 prices, printed has 1, marking has 0 = 3 total
        self.assertEqual(result['prices_created'], 3)

    def test_tutorial_excluded(self):
        """Tutorial variation products are excluded from copy."""
        result = SessionSetupService.copy_products_and_bundles(
            self.session_sept.id, self.session_april.id
        )
        new_products = StoreProduct.objects.filter(
            exam_session_subject__exam_session=self.session_sept
        )
        tutorial_count = new_products.filter(
            product_product_variation__product_variation__variation_type='Tutorial'
        ).count()
        self.assertEqual(tutorial_count, 0)

    def test_inactive_products_excluded(self):
        """Inactive products are excluded from copy."""
        result = SessionSetupService.copy_products_and_bundles(
            self.session_sept.id, self.session_april.id
        )
        # Only 3 active non-tutorial products should be copied
        self.assertEqual(result['products_created'], 3)

    def test_skipped_subjects(self):
        """Subjects not assigned to new session are skipped."""
        # SA1 is in prev session but NOT in new session
        sa1_ess = ExamSessionSubject.objects.get_or_create(
            exam_session=self.session_april, subject=self.subject_sa1
        )[0]
        # Create a store product for SA1 in previous session
        sa1_prod = StoreProduct.objects.create(
            exam_session_subject=sa1_ess,
            product_product_variation=self.ppv_core_ebook,
            is_active=True,
        )

        result = SessionSetupService.copy_products_and_bundles(
            self.session_sept.id, self.session_april.id
        )
        self.assertIn('SA1', result['skipped_subjects'])

    def test_bundles_created_from_templates(self):
        """Bundles are created from catalog templates, not copied from store."""
        result = SessionSetupService.copy_products_and_bundles(
            self.session_sept.id, self.session_april.id
        )
        # bundle_cm2 is a catalog template for CM2 subject
        self.assertEqual(result['bundles_created'], 1)

    def test_bundle_products_matched_by_ppv(self):
        """Bundle products are matched by PPV from newly created products."""
        result = SessionSetupService.copy_products_and_bundles(
            self.session_sept.id, self.session_april.id
        )
        # bundle_cm2 has 2 template products: ppv_core_ebook and ppv_marking_hub
        # ppv_core_ebook was copied (active, not tutorial) → match
        # ppv_marking_hub was inactive in store → NOT copied → no match
        self.assertEqual(result['bundle_products_created'], 1)

    def test_atomic_rollback_on_failure(self):
        """Transaction rolls back all changes on failure."""
        # Create a situation that will cause a unique constraint violation
        # by pre-creating a product that the copy would try to create
        StoreProduct.objects.create(
            exam_session_subject=self.ess_new_cm2,
            product_product_variation=self.ppv_core_ebook,
            is_active=True,
        )

        with self.assertRaises(Exception):
            SessionSetupService.copy_products_and_bundles(
                self.session_sept.id, self.session_april.id
            )

        # Verify no prices or bundles were created (rolled back)
        new_bundles = Bundle.objects.filter(
            exam_session_subject__exam_session=self.session_sept
        ).count()
        self.assertEqual(new_bundles, 0)

    def test_no_ess_raises_value_error(self):
        """ValueError raised when new session has no ESS records."""
        empty_session = create_exam_session(session_code='2027-01')
        with self.assertRaises(ValueError) as ctx:
            SessionSetupService.copy_products_and_bundles(
                empty_session.id, self.session_april.id
            )
        self.assertIn('No exam session subjects', str(ctx.exception))

    def test_price_amounts_preserved(self):
        """Copied prices have exact same amounts and currency."""
        SessionSetupService.copy_products_and_bundles(
            self.session_sept.id, self.session_april.id
        )
        new_ebook = StoreProduct.objects.filter(
            exam_session_subject=self.ess_new_cm2,
            product_product_variation=self.ppv_core_ebook,
        ).first()
        self.assertIsNotNone(new_ebook)
        std_price = Price.objects.get(purchasable_id=new_ebook.pk, price_type='standard')
        self.assertEqual(std_price.amount, self.store_prod_ebook.prices.get(
            price_type='standard').amount)
        self.assertEqual(std_price.currency, 'GBP')


class TestSessionSetupEndpoint(CatalogAPITestCase):
    """Integration tests for POST /api/catalog/session-setup/copy-products/."""

    URL = '/api/catalog/session-setup/copy-products/'

    def setUp(self):
        super().setUp()
        # Create ESS for previous session
        self.ess_prev = ExamSessionSubject.objects.get_or_create(
            exam_session=self.session_april, subject=self.subject_cm2
        )[0]
        # Create ESS for new session
        self.ess_new = ExamSessionSubject.objects.get_or_create(
            exam_session=self.session_sept, subject=self.subject_cm2
        )[0]
        # Create a store product in previous session
        self.store_prod = StoreProduct.objects.create(
            exam_session_subject=self.ess_prev,
            product_product_variation=self.ppv_core_ebook,
            is_active=True,
        )
        Price.objects.create(
            product=self.store_prod, price_type='standard',
            amount=49.99, currency='GBP'
        )

    def test_requires_superuser(self):
        """Endpoint requires IsSuperUser permission."""
        self.authenticate_regular_user()
        response = self.client.post(self.URL, {
            'new_exam_session_id': self.session_sept.id,
            'previous_exam_session_id': self.session_april.id,
        })
        self.assertEqual(response.status_code, 403)

    def test_unauthenticated_rejected(self):
        """Unauthenticated requests are rejected."""
        self.unauthenticate()
        response = self.client.post(self.URL, {
            'new_exam_session_id': self.session_sept.id,
            'previous_exam_session_id': self.session_april.id,
        })
        self.assertEqual(response.status_code, 401)

    def test_successful_copy(self):
        """Successful copy returns 201 with summary."""
        self.authenticate_superuser()
        response = self.client.post(self.URL, {
            'new_exam_session_id': self.session_sept.id,
            'previous_exam_session_id': self.session_april.id,
        })
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual(data['products_created'], 1)
        self.assertEqual(data['prices_created'], 1)
        self.assertIn('message', data)
        self.assertIn('skipped_subjects', data)

    def test_invalid_session_returns_400(self):
        """Invalid session ID returns 400."""
        self.authenticate_superuser()
        response = self.client.post(self.URL, {
            'new_exam_session_id': 99999,
            'previous_exam_session_id': self.session_april.id,
        })
        self.assertEqual(response.status_code, 400)

    def test_no_ess_returns_400(self):
        """New session without ESS returns 400."""
        self.authenticate_superuser()
        empty_session = create_exam_session(session_code='2027-01')
        response = self.client.post(self.URL, {
            'new_exam_session_id': empty_session.id,
            'previous_exam_session_id': self.session_april.id,
        })
        self.assertEqual(response.status_code, 400)

    def test_response_shape(self):
        """Response contains all expected fields."""
        self.authenticate_superuser()
        response = self.client.post(self.URL, {
            'new_exam_session_id': self.session_sept.id,
            'previous_exam_session_id': self.session_april.id,
        })
        data = response.json()
        expected_fields = [
            'products_created', 'prices_created', 'bundles_created',
            'bundle_products_created', 'skipped_subjects', 'message'
        ]
        for field in expected_fields:
            self.assertIn(field, data, f"Response missing field: {field}")


class TestSessionDataCounts(CatalogAPITestCase):
    """Tests for SessionSetupService.get_session_data_counts()."""

    def test_empty_session_has_no_data(self):
        """Session with no ESS/products returns has_data=False."""
        counts = SessionSetupService.get_session_data_counts(self.session_sept.id)
        self.assertFalse(counts['has_data'])
        self.assertEqual(counts['exam_session_subjects'], 0)
        self.assertEqual(counts['products'], 0)
        self.assertEqual(counts['bundles'], 0)

    def test_session_with_ess_has_data(self):
        """Session with ESS records returns correct counts."""
        ExamSessionSubject.objects.create(
            exam_session=self.session_sept, subject=self.subject_cm2
        )
        counts = SessionSetupService.get_session_data_counts(self.session_sept.id)
        self.assertTrue(counts['has_data'])
        self.assertEqual(counts['exam_session_subjects'], 1)

    def test_session_with_products_has_data(self):
        """Session with products returns correct counts."""
        ess = ExamSessionSubject.objects.create(
            exam_session=self.session_sept, subject=self.subject_cm2
        )
        StoreProduct.objects.create(
            exam_session_subject=ess,
            product_product_variation=self.ppv_core_ebook,
            is_active=True,
        )
        counts = SessionSetupService.get_session_data_counts(self.session_sept.id)
        self.assertTrue(counts['has_data'])
        self.assertEqual(counts['products'], 1)


class TestDeactivateSessionData(CatalogAPITestCase):
    """Tests for SessionSetupService.deactivate_session_data()."""

    def setUp(self):
        super().setUp()
        self.ess = ExamSessionSubject.objects.create(
            exam_session=self.session_sept, subject=self.subject_cm2
        )
        self.product = StoreProduct.objects.create(
            exam_session_subject=self.ess,
            product_product_variation=self.ppv_core_ebook,
            is_active=True,
        )
        self.price = Price.objects.create(
            product=self.product, price_type='standard',
            amount=49.99, currency='GBP'
        )
        self.bundle = Bundle.objects.create(
            bundle_template=self.bundle_cm2,
            exam_session_subject=self.ess,
            is_active=True,
            display_order=1,
        )
        self.bundle_product = BundleProduct.objects.create(
            bundle=self.bundle,
            product=self.product,
            default_price_type='standard',
            quantity=1,
            sort_order=1,
            is_active=True,
        )

    def test_deactivates_all_records(self):
        """All related records get is_active=False."""
        result = SessionSetupService.deactivate_session_data(self.session_sept.id)
        self.assertEqual(result['exam_session_subjects_deactivated'], 1)
        self.assertEqual(result['products_deactivated'], 1)
        self.assertEqual(result['prices_deactivated'], 1)
        self.assertEqual(result['bundles_deactivated'], 1)
        self.assertEqual(result['bundle_products_deactivated'], 1)

        # Verify actual DB state
        self.ess.refresh_from_db()
        self.assertFalse(self.ess.is_active)
        self.product.refresh_from_db()
        self.assertFalse(self.product.is_active)
        self.price.refresh_from_db()
        self.assertFalse(self.price.is_active)
        self.bundle.refresh_from_db()
        self.assertFalse(self.bundle.is_active)
        self.bundle_product.refresh_from_db()
        self.assertFalse(self.bundle_product.is_active)

    def test_deactivation_is_atomic(self):
        """Deactivation is wrapped in a transaction."""
        # Verify all records are active before
        self.assertTrue(self.ess.is_active)
        self.assertTrue(self.product.is_active)

        # Deactivate
        SessionSetupService.deactivate_session_data(self.session_sept.id)

        # All should be inactive
        self.ess.refresh_from_db()
        self.product.refresh_from_db()
        self.assertFalse(self.ess.is_active)
        self.assertFalse(self.product.is_active)

    def test_only_deactivates_target_session(self):
        """Deactivation does not affect other sessions."""
        # Create data for a different session
        other_ess = ExamSessionSubject.objects.create(
            exam_session=self.session_april, subject=self.subject_cm2
        )
        other_product = StoreProduct.objects.create(
            exam_session_subject=other_ess,
            product_product_variation=self.ppv_core_printed,
            is_active=True,
        )

        SessionSetupService.deactivate_session_data(self.session_sept.id)

        # Other session data should be untouched
        other_ess.refresh_from_db()
        other_product.refresh_from_db()
        self.assertTrue(other_ess.is_active)
        self.assertTrue(other_product.is_active)


class TestSessionDataCountsEndpoint(CatalogAPITestCase):
    """Tests for GET /api/catalog/session-setup/session-data-counts/<id>/."""

    def test_requires_superuser(self):
        """Endpoint requires IsSuperUser permission."""
        self.authenticate_regular_user()
        url = f'/api/catalog/session-setup/session-data-counts/{self.session_sept.id}/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, 403)

    def test_returns_counts(self):
        """Returns correct data counts for a session."""
        self.authenticate_superuser()
        ess = ExamSessionSubject.objects.create(
            exam_session=self.session_sept, subject=self.subject_cm2
        )
        StoreProduct.objects.create(
            exam_session_subject=ess,
            product_product_variation=self.ppv_core_ebook,
            is_active=True,
        )
        url = f'/api/catalog/session-setup/session-data-counts/{self.session_sept.id}/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['has_data'])
        self.assertEqual(data['exam_session_subjects'], 1)
        self.assertEqual(data['products'], 1)


class TestDeactivateEndpoint(CatalogAPITestCase):
    """Tests for POST /api/catalog/session-setup/deactivate-session-data/."""

    URL = '/api/catalog/session-setup/deactivate-session-data/'

    def setUp(self):
        super().setUp()
        self.ess = ExamSessionSubject.objects.create(
            exam_session=self.session_sept, subject=self.subject_cm2
        )
        self.product = StoreProduct.objects.create(
            exam_session_subject=self.ess,
            product_product_variation=self.ppv_core_ebook,
            is_active=True,
        )

    def test_requires_superuser(self):
        """Endpoint requires IsSuperUser permission."""
        self.authenticate_regular_user()
        response = self.client.post(self.URL, {
            'exam_session_id': self.session_sept.id,
        })
        self.assertEqual(response.status_code, 403)

    def test_successful_deactivation(self):
        """Successful deactivation returns counts."""
        self.authenticate_superuser()
        response = self.client.post(self.URL, {
            'exam_session_id': self.session_sept.id,
        })
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['exam_session_subjects_deactivated'], 1)
        self.assertEqual(data['products_deactivated'], 1)

    def test_invalid_session_returns_400(self):
        """Invalid session ID returns 400."""
        self.authenticate_superuser()
        response = self.client.post(self.URL, {
            'exam_session_id': 99999,
        })
        self.assertEqual(response.status_code, 400)

    def test_response_shape(self):
        """Response contains all expected fields."""
        self.authenticate_superuser()
        response = self.client.post(self.URL, {
            'exam_session_id': self.session_sept.id,
        })
        data = response.json()
        expected_fields = [
            'exam_session_subjects_deactivated', 'products_deactivated',
            'prices_deactivated', 'bundles_deactivated',
            'bundle_products_deactivated',
        ]
        for field in expected_fields:
            self.assertIn(field, data, f"Response missing field: {field}")
