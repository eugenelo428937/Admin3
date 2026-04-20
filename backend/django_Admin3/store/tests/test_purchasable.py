"""Tests for store.Purchasable — the unified catalog parent."""
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.test import TestCase
from store.models import Purchasable


class PurchasableModelTests(TestCase):
    def test_create_minimum_fields(self):
        obj = Purchasable.objects.create(
            kind='marking_voucher',
            code='MV-STD-01',
            name='Standard Marking Voucher',
        )
        self.assertEqual(obj.kind, 'marking_voucher')
        self.assertEqual(obj.code, 'MV-STD-01')
        self.assertTrue(obj.is_active)
        self.assertFalse(obj.dynamic_pricing)

    def test_code_is_unique(self):
        Purchasable.objects.create(kind='product', code='DUPE', name='First')
        with self.assertRaises(IntegrityError):
            Purchasable.objects.create(kind='marking_voucher', code='DUPE', name='Second')

    def test_kind_choices_enforced(self):
        obj = Purchasable(kind='banana', code='X', name='X')
        with self.assertRaises(ValidationError):
            obj.full_clean()

    def test_dynamic_pricing_default_false(self):
        obj = Purchasable.objects.create(kind='document_binder', code='DB-1', name='Binder')
        self.assertFalse(obj.dynamic_pricing)

    def test_str(self):
        obj = Purchasable.objects.create(kind='product', code='ABC', name='Thing')
        self.assertIn('ABC', str(obj))

    def test_db_table_in_acted_schema(self):
        self.assertEqual(Purchasable._meta.db_table, '"acted"."purchasables"')


from decimal import Decimal
from store.models import Price, Product


class PurchasablePricingTests(TestCase):
    def test_price_linked_to_purchasable(self):
        p = Purchasable.objects.create(kind='marking_voucher', code='MV-01', name='V')
        price = Price.objects.create(
            purchasable=p, price_type='standard', amount=Decimal('50.00')
        )
        self.assertEqual(p.prices.count(), 1)
        self.assertEqual(p.prices.first().amount, Decimal('50.00'))

    def test_price_still_linked_to_product_legacy_path(self):
        """Guards the dual-write contract — the legacy product FK must
        remain functional during Tasks 3-10 before Task 11 backfills and
        Release B removes it."""
        from django.utils import timezone
        from catalog.models import (
            Subject, ExamSession, ExamSessionSubject,
            Product as CatalogProduct, ProductVariation,
            ProductProductVariation,
        )
        subject = Subject.objects.create(code='LP1', description='Legacy Path', active=True)
        session = ExamSession.objects.create(
            session_code='2099-01',
            start_date=timezone.now(),
            end_date=timezone.now() + timezone.timedelta(days=30),
        )
        ess = ExamSessionSubject.objects.create(
            exam_session=session, subject=subject, is_active=True
        )
        catalog_product = CatalogProduct.objects.create(
            fullname='Legacy Product', shortname='LP', code='LP01', is_active=True,
        )
        variation = ProductVariation.objects.create(
            variation_type='Printed', name='Printed', code='P',
        )
        ppv = ProductProductVariation.objects.create(
            product=catalog_product, product_variation=variation,
        )
        product = Product.objects.create(
            exam_session_subject=ess,
            product_product_variation=ppv,
        )
        Price.objects.create(
            product=product, price_type='standard', amount=Decimal('25.00')
        )
        # Legacy reverse accessor via transitional shim property
        self.assertEqual(product.prices.count(), 1)
        self.assertEqual(product.prices.first().amount, Decimal('25.00'))
