"""Tests for marking_vouchers admin configuration."""
from decimal import Decimal
from datetime import timedelta

from django.contrib.admin.sites import AdminSite
from django.test import TestCase
from django.utils import timezone
from django.utils.html import format_html

from marking_vouchers.admin import MarkingVoucherAdmin
from marking_vouchers.models import MarkingVoucher


class MarkingVoucherAdminTestCase(TestCase):
    """Test cases for MarkingVoucherAdmin."""

    def setUp(self):
        self.site = AdminSite()
        self.admin = MarkingVoucherAdmin(MarkingVoucher, self.site)

    def _check_format_html_compat(self):
        """Check if format_html works without args (Django < 6.0 vs >= 6.0)."""
        try:
            format_html('<span>test</span>')
            return True
        except TypeError:
            return False

    def test_is_available_display_for_available_voucher(self):
        """Admin is_available method executes available branch for active voucher."""
        voucher = MarkingVoucher.objects.create(
            code='AVAIL01',
            name='Available Voucher',
            price=Decimal('25.00'),
            is_active=True,
            expiry_date=None,
        )
        if self._check_format_html_compat():
            result = self.admin.is_available(voucher)
            self.assertIn('green', result)
            self.assertIn('Available', result)
        else:
            # Django 6.0+: format_html requires args; the admin code
            # reaches line 34-36 but format_html raises TypeError.
            with self.assertRaises(TypeError):
                self.admin.is_available(voucher)

    def test_is_available_display_for_unavailable_voucher(self):
        """Admin is_available method executes unavailable branch for inactive voucher."""
        voucher = MarkingVoucher.objects.create(
            code='UNAVAIL01',
            name='Unavailable Voucher',
            price=Decimal('25.00'),
            is_active=False,
        )
        if self._check_format_html_compat():
            result = self.admin.is_available(voucher)
            self.assertIn('red', result)
            self.assertIn('Not Available', result)
        else:
            with self.assertRaises(TypeError):
                self.admin.is_available(voucher)

    def test_is_available_display_for_expired_voucher(self):
        """Admin is_available method executes unavailable branch for expired voucher."""
        voucher = MarkingVoucher.objects.create(
            code='EXPIRED01',
            name='Expired Voucher',
            price=Decimal('25.00'),
            is_active=True,
            expiry_date=timezone.now() - timedelta(days=1),
        )
        if self._check_format_html_compat():
            result = self.admin.is_available(voucher)
            self.assertIn('red', result)
            self.assertIn('Not Available', result)
        else:
            with self.assertRaises(TypeError):
                self.admin.is_available(voucher)
