"""Activation command tests.

Policy under test (per spec):
- catalog_exam_sessions: activate every row whose end_date >= today.
- catalog_product_variations: activate every row.
- catalog_product_product_variations: activate every row whose related
  catalog_products.is_active=True AND catalog_product_variations.is_active=True.
- Idempotent: running twice yields the same result.
"""
from datetime import timedelta
from io import StringIO

from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone

from catalog.exam_session.models import ExamSession
from catalog.products.models import (
    Product as CatalogProduct,
    ProductVariation,
    ProductProductVariation,
)


class ActivateInitialCatalogTests(TestCase):
    def setUp(self):
        now = timezone.now()
        # Future-ending session → should be activated
        self.future = ExamSession.objects.create(
            session_code='F1', start_date=now - timedelta(days=10),
            end_date=now + timedelta(days=10), is_active=False,
        )
        # Past-ending session → should NOT be activated
        self.past = ExamSession.objects.create(
            session_code='P1', start_date=now - timedelta(days=100),
            end_date=now - timedelta(days=10), is_active=False,
        )
        self.var_active = ProductVariation.objects.create(
            variation_type='eBook', name='V1', code='V1', is_active=False,
        )
        self.cp_active = CatalogProduct.objects.create(
            fullname='A', shortname='A', code='CA', is_active=True,
        )
        self.cp_inactive = CatalogProduct.objects.create(
            fullname='B', shortname='B', code='CB', is_active=False,
        )
        self.ppv_eligible = ProductProductVariation.objects.create(
            product=self.cp_active, product_variation=self.var_active,
            is_active=False,
        )
        self.ppv_blocked = ProductProductVariation.objects.create(
            product=self.cp_inactive, product_variation=self.var_active,
            is_active=False,
        )

    def test_dry_run_does_not_change_data(self):
        out = StringIO()
        call_command('activate_initial_catalog', '--dry-run', stdout=out)

        self.future.refresh_from_db()
        self.var_active.refresh_from_db()
        self.ppv_eligible.refresh_from_db()
        self.assertFalse(self.future.is_active)
        self.assertFalse(self.var_active.is_active)
        self.assertFalse(self.ppv_eligible.is_active)
        # Output should describe the planned changes
        output = out.getvalue()
        self.assertIn('ExamSession', output)
        self.assertIn('F1', output)

    def test_real_run_applies_per_table_policy(self):
        call_command('activate_initial_catalog')

        self.future.refresh_from_db()
        self.past.refresh_from_db()
        self.var_active.refresh_from_db()
        self.ppv_eligible.refresh_from_db()
        self.ppv_blocked.refresh_from_db()

        self.assertTrue(self.future.is_active)
        self.assertFalse(self.past.is_active)        # past stays inactive
        self.assertTrue(self.var_active.is_active)
        self.assertTrue(self.ppv_eligible.is_active)
        self.assertFalse(self.ppv_blocked.is_active)  # parent inactive

    def test_idempotent(self):
        call_command('activate_initial_catalog')
        call_command('activate_initial_catalog')  # second run should be a no-op

        self.future.refresh_from_db()
        self.assertTrue(self.future.is_active)
