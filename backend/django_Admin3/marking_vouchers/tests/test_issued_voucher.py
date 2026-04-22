"""Tests for IssuedVoucher — per-unit issued voucher instances."""
from django.test import TestCase
from marking_vouchers.models import IssuedVoucher


class IssuedVoucherModelTests(TestCase):
    def test_status_choices(self):
        self.assertIn(('active', 'Active'), IssuedVoucher.STATUS_CHOICES)
        self.assertIn(('redeemed', 'Redeemed'), IssuedVoucher.STATUS_CHOICES)
        self.assertIn(('expired', 'Expired'), IssuedVoucher.STATUS_CHOICES)
        self.assertIn(('cancelled', 'Cancelled'), IssuedVoucher.STATUS_CHOICES)

    def test_voucher_code_unique(self):
        self.assertTrue(IssuedVoucher._meta.get_field('voucher_code').unique)

    def test_db_table_in_acted_schema(self):
        self.assertEqual(IssuedVoucher._meta.db_table, '"acted"."issued_vouchers"')

    def test_expires_at_required(self):
        self.assertFalse(IssuedVoucher._meta.get_field('expires_at').null)
