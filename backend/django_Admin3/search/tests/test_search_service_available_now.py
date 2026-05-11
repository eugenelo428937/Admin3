"""Regression tests: SearchService respects the canonical available_now() predicate.

The search-app endpoints (/api/search/unified/, /api/search/default-data/,
/api/search/fuzzy/, /api/search/advanced-fuzzy/) and the bundle helpers must
filter through Purchasable.objects.available_now() — not just StoreProduct.is_active.

Without this, customers see purchasables whose upstream catalog rows are
inactive (ExamSession.is_active=False, ProductVariation.is_active=False,
ProductProductVariation.is_active=False) or whose exam-session date window
has closed. The store/products endpoint already enforces the predicate;
search must do the same.

See systematic-debugging session 2026-05-08 for the full diagnosis.
"""
from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from search.services.search_service import SearchService
from search.tests.factories import (
    create_subject,
    create_exam_session,
    create_exam_session_subject,
    create_catalog_product,
    create_product_variation,
    create_store_product,
    create_bundle_with_products,
)


class _AvailableNowFixtureMixin:
    """Build two store products: one fully-available, one with a single
    is_active=False upstream flag that should hide it from customer endpoints.

    Each subclass test toggles one of the upstream flags so we can assert
    each individual condition in the canonical predicate is enforced.
    """

    def _build_visible_product(self, subject_code, session_code):
        """Create a store product satisfying every available_now() condition."""
        now = timezone.now()
        subject = create_subject(subject_code)
        session = create_exam_session(
            session_code,
            start_date=now - timedelta(days=10),
            end_date=now + timedelta(days=90),
            is_active=True,
        )
        ess = create_exam_session_subject(session, subject, is_active=True)
        catalog = create_catalog_product(
            f'{subject_code} Materials', subject_code, f'{subject_code}P',
        )
        # PV / PPV default to is_active=False; explicitly set True.
        variation = create_product_variation(
            'Printed', 'Standard Printed',
            code=f'{subject_code[-2:]}P',
            is_active=True,
        )
        sp = create_store_product(
            ess, catalog, variation,
            product_code=f'{subject_code}/PP/{session_code}',
        )
        # The factory get_or_creates the PPV; flip its flag to True too.
        sp.product_product_variation.is_active = True
        sp.product_product_variation.save()
        return sp


class TestUnifiedSearchAppliesAvailableNow(_AvailableNowFixtureMixin, TestCase):
    """unified_search must hide store products that fail the canonical predicate."""

    def setUp(self):
        self.service = SearchService()

    def _ids_returned(self, search_query=''):
        result = self.service.unified_search(
            search_query=search_query,
            filters={},
            pagination={'page': 1, 'page_size': 100},
            options={'include_bundles': False},
        )
        # Each product entry has 'id' = store.Product PK
        return {p.get('id') for p in result['products'] if not p.get('is_bundle')}

    def test_visible_product_appears(self):
        """Sanity: a fully-active product IS returned (proves the predicate
        is satisfiable in the test fixture)."""
        sp = self._build_visible_product('AVN1', '2026-04')
        self.assertIn(sp.id, self._ids_returned())

    def test_excludes_when_exam_session_inactive(self):
        """ExamSession.is_active=False hides the product (Condition 7)."""
        sp = self._build_visible_product('AVN2', '2026-04')
        es = sp.exam_session_subject.exam_session
        es.is_active = False
        es.save()
        self.assertNotIn(sp.id, self._ids_returned())

    def test_includes_when_exam_session_window_closed(self):
        """ExamSession.end_date < now does NOT hide the product from listing.

        Listing predicate is 7 conditions — date window is intentionally
        excluded so customers can see products from recently-closed
        sessions. The frontend disables Add-to-cart for these and the
        cart-add gate (8-condition predicate) rejects direct purchase
        attempts.
        """
        sp = self._build_visible_product('AVN3', '2026-04')
        es = sp.exam_session_subject.exam_session
        es.end_date = timezone.now() - timedelta(days=1)
        es.save()
        self.assertIn(sp.id, self._ids_returned())

    def test_includes_when_exam_session_window_not_yet_open(self):
        """ExamSession.start_date > now does NOT hide the product from listing.

        Mirror of the closed-window case above — customers can browse
        products for upcoming sessions; only the Add-to-cart action is
        gated.
        """
        sp = self._build_visible_product('AVN3B', '2026-04')
        es = sp.exam_session_subject.exam_session
        es.start_date = timezone.now() + timedelta(days=30)
        es.end_date = timezone.now() + timedelta(days=210)
        es.save()
        self.assertIn(sp.id, self._ids_returned())

    def test_excludes_when_product_product_variation_inactive(self):
        """PPV.is_active=False hides the product (Condition 2)."""
        sp = self._build_visible_product('AVN4', '2026-04')
        sp.product_product_variation.is_active = False
        sp.product_product_variation.save()
        self.assertNotIn(sp.id, self._ids_returned())

    def test_excludes_when_product_variation_inactive(self):
        """ProductVariation.is_active=False hides the product (Condition 4)."""
        sp = self._build_visible_product('AVN5', '2026-04')
        pv = sp.product_product_variation.product_variation
        pv.is_active = False
        pv.save()
        self.assertNotIn(sp.id, self._ids_returned())

    def test_excludes_when_subject_inactive(self):
        """Subject.active=False hides the product (Condition 6)."""
        sp = self._build_visible_product('AVN6', '2026-04')
        subj = sp.exam_session_subject.subject
        subj.active = False
        subj.save()
        self.assertNotIn(sp.id, self._ids_returned())


class TestListingVsPurchasePredicateSplit(_AvailableNowFixtureMixin, TestCase):
    """The listing predicate (7 conditions) and the purchase predicate
    (8 conditions, includes date window) MUST diverge on date-window
    edge cases. Listing keeps the product visible; the cart-add gate
    rejects it."""

    def test_listing_includes_out_of_window_but_purchase_excludes(self):
        from store.models import Purchasable
        sp = self._build_visible_product('SPLIT1', '2026-04')
        es = sp.exam_session_subject.exam_session
        # Push the session into the past — out of the date window.
        es.start_date = timezone.now() - timedelta(days=180)
        es.end_date = timezone.now() - timedelta(days=1)
        es.save()

        listing_ids = set(
            Purchasable.objects.available_for_listing().values_list('pk', flat=True)
        )
        purchase_ids = set(
            Purchasable.objects.available_now().values_list('pk', flat=True)
        )
        self.assertIn(sp.id, listing_ids)
        self.assertNotIn(sp.id, purchase_ids)

    def test_listing_excludes_when_inactive_flag_fails(self):
        """Listing predicate STILL enforces the 7 is_active conditions
        (only the date window is dropped vs. purchase)."""
        from store.models import Purchasable
        sp = self._build_visible_product('SPLIT2', '2026-04')
        # Flip off ExamSession.is_active — fails BOTH listing and purchase.
        es = sp.exam_session_subject.exam_session
        es.is_active = False
        es.save()

        listing_ids = set(
            Purchasable.objects.available_for_listing().values_list('pk', flat=True)
        )
        purchase_ids = set(
            Purchasable.objects.available_now().values_list('pk', flat=True)
        )
        self.assertNotIn(sp.id, listing_ids)
        self.assertNotIn(sp.id, purchase_ids)

    def test_is_available_now_helper_uses_purchase_predicate(self):
        """The per-instance helper used by cart-add and the
        ``CartItemSerializer.is_available`` flag MUST keep the date
        window check (otherwise customers can buy products from closed
        sessions)."""
        sp = self._build_visible_product('SPLIT3', '2026-04')
        # Visible while in window
        self.assertTrue(sp.is_available_now())
        # Drop out of window
        es = sp.exam_session_subject.exam_session
        es.end_date = timezone.now() - timedelta(days=1)
        es.save()
        self.assertFalse(sp.is_available_now())


class TestBundlesRespectAvailableNow(_AvailableNowFixtureMixin, TestCase):
    """Bundle helpers must hide bundles whose components fail the predicate."""

    def setUp(self):
        self.service = SearchService()

    def _bundle_ids_returned(self):
        result = self.service.unified_search(
            search_query='',
            filters={},
            pagination={'page': 1, 'page_size': 100},
            options={'include_bundles': True},
        )
        return {p.get('id') for p in result['products'] if p.get('is_bundle')}

    def test_bundle_with_inactive_session_is_hidden(self):
        """A bundle whose ESS exam_session is inactive must not appear."""
        sp = self._build_visible_product('BUN1', '2026-04')
        bundle, _ = create_bundle_with_products(
            sp.exam_session_subject, [sp], bundle_name='AVN Bundle',
        )
        # Visible while everything is active
        self.assertIn(bundle.id, self._bundle_ids_returned())
        # Hide the bundle by deactivating its exam session
        es = sp.exam_session_subject.exam_session
        es.is_active = False
        es.save()
        self.assertNotIn(bundle.id, self._bundle_ids_returned())
