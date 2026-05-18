"""Tests for Purchasable.objects.available_now() — the canonical predicate.

Each "_disabled" test flips ONE upstream flag to false, then asserts
the product is excluded. This proves every condition is wired in.
"""
from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from catalog.exam_session.models import ExamSession
from catalog.subject.models import Subject
from catalog.models import ExamSessionSubject
from catalog.products.models import (
    Product as CatalogProduct,
    ProductVariation,
    ProductProductVariation,
)
from store.models import Product as StoreProduct, Purchasable
from store.models import MaterialProduct


class AvailableNowTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        now = timezone.now()
        cls.session = ExamSession.objects.create(
            session_code='2099-04',
            start_date=now - timedelta(days=10),
            end_date=now + timedelta(days=10),
            is_active=True,
        )
        cls.subject = Subject.objects.create(
            code='ZZ1', description='Test Subject', active=True,
        )
        cls.ess = ExamSessionSubject.objects.create(
            exam_session=cls.session, subject=cls.subject, is_active=True,
        )
        cls.cat_product = CatalogProduct.objects.create(
            fullname='Z1 Test', shortname='Z1', code='Z1', is_active=True,
        )
        cls.variation = ProductVariation.objects.create(
            variation_type='eBook', name='Test eBook', code='TEBK',
            is_active=True,
        )
        cls.ppv = ProductProductVariation.objects.create(
            product=cls.cat_product,
            product_variation=cls.variation,
            is_active=True,
        )
        cls.store_product = MaterialProduct.objects.create(
exam_session_subject=cls.ess,
            product_product_variation=cls.ppv,
            is_active=True,
            name='Z1 Test eBook 2099-04',
        )

    def _ids(self):
        return list(
            Purchasable.objects.available_now()
            .values_list('pk', flat=True)
        )

    # --- happy path
    def test_fully_active_product_is_included(self):
        self.assertIn(self.store_product.pk, self._ids())

    # --- each upstream flag false (8 cases including date window)
    def test_excluded_when_purchasable_inactive(self):
        Purchasable.objects.filter(pk=self.store_product.pk).update(is_active=False)
        self.assertNotIn(self.store_product.pk, self._ids())

    def test_excluded_when_ppv_inactive(self):
        ProductProductVariation.objects.filter(pk=self.ppv.pk).update(is_active=False)
        self.assertNotIn(self.store_product.pk, self._ids())

    def test_excluded_when_catalog_product_inactive(self):
        CatalogProduct.objects.filter(pk=self.cat_product.pk).update(is_active=False)
        self.assertNotIn(self.store_product.pk, self._ids())

    def test_excluded_when_product_variation_inactive(self):
        ProductVariation.objects.filter(pk=self.variation.pk).update(is_active=False)
        self.assertNotIn(self.store_product.pk, self._ids())

    def test_excluded_when_ess_inactive(self):
        ExamSessionSubject.objects.filter(pk=self.ess.pk).update(is_active=False)
        self.assertNotIn(self.store_product.pk, self._ids())

    def test_excluded_when_subject_inactive(self):
        Subject.objects.filter(pk=self.subject.pk).update(active=False)
        self.assertNotIn(self.store_product.pk, self._ids())

    def test_excluded_when_exam_session_inactive(self):
        ExamSession.objects.filter(pk=self.session.pk).update(is_active=False)
        self.assertNotIn(self.store_product.pk, self._ids())

    def test_excluded_when_today_before_start_date(self):
        future_now = self.session.start_date - timedelta(days=1)
        ids = list(
            Purchasable.objects.available_now(at=future_now)
            .values_list('pk', flat=True)
        )
        self.assertNotIn(self.store_product.pk, ids)

    def test_excluded_when_today_after_end_date(self):
        past_now = self.session.end_date + timedelta(days=1)
        ids = list(
            Purchasable.objects.available_now(at=past_now)
            .values_list('pk', flat=True)
        )
        self.assertNotIn(self.store_product.pk, ids)

    # --- non-product purchasable bypasses the chain
    def test_non_product_purchasable_only_checks_is_active(self):
        from store.models import GenericItem
        gi = GenericItem.objects.create(
            kind=Purchasable.Kind.MARKING_VOUCHER,
            code='TEST-VOUCHER-1',
            name='Test Voucher',
            is_active=True,
        )
        ids = self._ids()
        self.assertIn(gi.pk, ids)

        Purchasable.objects.filter(pk=gi.pk).update(is_active=False)
        ids = self._ids()
        self.assertNotIn(gi.pk, ids)

    # --- per-instance helper
    def test_is_available_now_matches_queryset(self):
        self.assertTrue(self.store_product.is_available_now())
        Purchasable.objects.filter(pk=self.store_product.pk).update(is_active=False)
        self.store_product.refresh_from_db()
        self.assertFalse(self.store_product.is_available_now())

    def test_available_now_rejects_naive_datetime(self):
        from datetime import datetime
        with self.assertRaises(ValueError):
            list(Purchasable.objects.available_now(at=datetime(2099, 1, 1)))


class ProductAvailableNowTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        from datetime import timedelta
        from django.utils import timezone
        from catalog.exam_session.models import ExamSession
        from catalog.subject.models import Subject
        from catalog.models import ExamSessionSubject
        from catalog.products.models import (
            Product as CatalogProduct,
            ProductVariation,
            ProductProductVariation,
        )
        from store.models import Product as StoreProduct, Purchasable

        now = timezone.now()
        session = ExamSession.objects.create(
            session_code='2099-09', start_date=now - timedelta(days=10),
            end_date=now + timedelta(days=10), is_active=True,
        )
        subject = Subject.objects.create(code='ZP1', description='T', active=True)
        ess = ExamSessionSubject.objects.create(
            exam_session=session, subject=subject, is_active=True,
        )
        cp = CatalogProduct.objects.create(
            fullname='P-Avail', shortname='PA', code='PA', is_active=True,
        )
        v = ProductVariation.objects.create(
            variation_type='eBook', name='PA-V', code='PA-EBK', is_active=True,
        )
        ppv = ProductProductVariation.objects.create(
            product=cp, product_variation=v, is_active=True,
        )
        cls.active_sp = MaterialProduct.objects.create(
exam_session_subject=ess, product_product_variation=ppv, is_active=True,
            name='P-Avail eBook',
            product_code='ZP1/PA-EBKPA/2099-09-A',
            code='ZP1/PA-EBKPA/2099-09-A',
        )
        cls.inactive_sp = MaterialProduct.objects.create(
exam_session_subject=ess, product_product_variation=ppv, is_active=False,
            name='P-Inactive eBook', is_addon=True,  # is_addon=True so it can share PPV with active_sp
            product_code='ZP1/PA-EBKPA/2099-09-B',
            code='ZP1/PA-EBKPA/2099-09-B',
        )

    def test_returns_store_product_typed_results(self):
        from store.models import Product as StoreProduct
        qs = StoreProduct.available_now()
        self.assertGreater(qs.count(), 0)
        # Each result is a store.Product instance (not a base Purchasable)
        for sp in qs:
            self.assertIsInstance(sp, StoreProduct)
            self.assertTrue(sp.is_available_now())

    def test_excludes_inactive_purchasable(self):
        from store.models import Product as StoreProduct
        ids = list(StoreProduct.available_now().values_list('pk', flat=True))
        self.assertIn(self.active_sp.pk, ids)
        self.assertNotIn(self.inactive_sp.pk, ids)
