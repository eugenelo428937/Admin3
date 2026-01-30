"""Tests for marking_vouchers serializers."""
from decimal import Decimal
from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from marking_vouchers.models import MarkingVoucher
from marking_vouchers.serializers import AddMarkingVoucherToCartSerializer


class AddMarkingVoucherToCartSerializerTestCase(TestCase):
    """Test cases for AddMarkingVoucherToCartSerializer validation."""

    def test_validate_voucher_id_nonexistent_voucher(self):
        """Serializer rejects a voucher_id that does not exist."""
        serializer = AddMarkingVoucherToCartSerializer(
            data={'voucher_id': 999999, 'quantity': 1}
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn('voucher_id', serializer.errors)
        self.assertIn('Voucher not found', str(serializer.errors['voucher_id']))

    def test_validate_voucher_id_unavailable_voucher(self):
        """Serializer rejects a voucher_id for an inactive voucher."""
        voucher = MarkingVoucher.objects.create(
            code='SER_INACTIVE',
            name='Inactive Voucher',
            price=Decimal('25.00'),
            is_active=False,
        )
        serializer = AddMarkingVoucherToCartSerializer(
            data={'voucher_id': voucher.id, 'quantity': 1}
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn('voucher_id', serializer.errors)
        self.assertIn('not available', str(serializer.errors['voucher_id']))

    def test_validate_voucher_id_expired_voucher(self):
        """Serializer rejects a voucher_id for an expired voucher."""
        voucher = MarkingVoucher.objects.create(
            code='SER_EXPIRED',
            name='Expired Voucher',
            price=Decimal('25.00'),
            is_active=True,
            expiry_date=timezone.now() - timedelta(days=1),
        )
        serializer = AddMarkingVoucherToCartSerializer(
            data={'voucher_id': voucher.id, 'quantity': 1}
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn('voucher_id', serializer.errors)
        self.assertIn('not available', str(serializer.errors['voucher_id']))

    def test_validate_quantity_less_than_one(self):
        """Serializer rejects quantity less than 1 via min_value constraint."""
        voucher = MarkingVoucher.objects.create(
            code='SER_VALID',
            name='Valid Voucher',
            price=Decimal('25.00'),
            is_active=True,
        )
        serializer = AddMarkingVoucherToCartSerializer(
            data={'voucher_id': voucher.id, 'quantity': 0}
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn('quantity', serializer.errors)
