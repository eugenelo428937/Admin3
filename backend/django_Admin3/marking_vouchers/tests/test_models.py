"""
Test suite for marking_vouchers models.

This module tests the MarkingVoucher model to ensure proper field validations,
availability logic, and model behavior.
"""

from django.test import TestCase
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal

from marking_vouchers.models import MarkingVoucher


class MarkingVoucherTestCase(TestCase):
    """Test cases for MarkingVoucher model."""

    def test_marking_voucher_creation_with_required_fields(self):
        """Test MarkingVoucher creation with required fields only."""
        voucher = MarkingVoucher.objects.create(
            code='MARK2025',
            name='Standard Marking Voucher',
            price=Decimal('50.00')
        )

        self.assertEqual(voucher.code, 'MARK2025')
        self.assertEqual(voucher.name, 'Standard Marking Voucher')
        self.assertEqual(voucher.price, Decimal('50.00'))
        self.assertTrue(voucher.is_active)  # Default value
        self.assertIsNone(voucher.expiry_date)  # Optional field
        self.assertEqual(voucher.description, '')  # Blank=True defaults to ''
        self.assertIsNotNone(voucher.created_at)
        self.assertIsNotNone(voucher.updated_at)

    def test_marking_voucher_creation_with_all_fields(self):
        """Test MarkingVoucher creation with all fields."""
        expiry = timezone.now() + timedelta(days=30)

        voucher = MarkingVoucher.objects.create(
            code='PREMIUM2025',
            name='Premium Marking Voucher',
            description='Includes detailed feedback and consultation',
            price=Decimal('100.00'),
            is_active=True,
            expiry_date=expiry
        )

        self.assertEqual(voucher.code, 'PREMIUM2025')
        self.assertEqual(voucher.name, 'Premium Marking Voucher')
        self.assertEqual(voucher.description, 'Includes detailed feedback and consultation')
        self.assertEqual(voucher.price, Decimal('100.00'))
        self.assertTrue(voucher.is_active)
        self.assertEqual(voucher.expiry_date, expiry)

    def test_code_unique_constraint(self):
        """Test code field has unique constraint."""
        MarkingVoucher.objects.create(
            code='MARK2025',
            name='Voucher 1',
            price=Decimal('50.00')
        )

        # Attempt to create duplicate code should fail
        from django.db import IntegrityError
        with self.assertRaises(IntegrityError):
            MarkingVoucher.objects.create(
                code='MARK2025',  # Duplicate code
                name='Voucher 2',
                price=Decimal('60.00')
            )

    def test_code_max_length_validation(self):
        """Test code field respects 50 character maximum."""
        code = 'A' * 50
        voucher = MarkingVoucher.objects.create(
            code=code,
            name='Test Voucher',
            price=Decimal('50.00')
        )
        self.assertEqual(len(voucher.code), 50)

    def test_name_max_length_validation(self):
        """Test name field respects 200 character maximum."""
        name = 'A' * 200
        voucher = MarkingVoucher.objects.create(
            code='TEST2025',
            name=name,
            price=Decimal('50.00')
        )
        self.assertEqual(len(voucher.name), 200)

    def test_description_optional(self):
        """Test description field is optional (blank=True)."""
        voucher = MarkingVoucher.objects.create(
            code='MARK2025',
            name='Standard Voucher',
            price=Decimal('50.00')
        )
        self.assertEqual(voucher.description, '')

    def test_price_decimal_field(self):
        """Test price field stores decimal values correctly."""
        voucher = MarkingVoucher.objects.create(
            code='MARK2025',
            name='Standard Voucher',
            price=Decimal('49.99')
        )

        self.assertEqual(voucher.price, Decimal('49.99'))
        self.assertIsInstance(voucher.price, Decimal)

    def test_price_max_digits_validation(self):
        """Test price field respects max_digits=10, decimal_places=2."""
        # Maximum value: 99999999.99 (8 digits + 2 decimals)
        voucher = MarkingVoucher.objects.create(
            code='EXPENSIVE',
            name='Expensive Voucher',
            price=Decimal('99999999.99')
        )
        self.assertEqual(voucher.price, Decimal('99999999.99'))

    def test_is_active_default_value(self):
        """Test is_active defaults to True."""
        voucher = MarkingVoucher.objects.create(
            code='MARK2025',
            name='Standard Voucher',
            price=Decimal('50.00')
        )
        self.assertTrue(voucher.is_active)

    def test_expiry_date_optional(self):
        """Test expiry_date is optional (null=True, blank=True)."""
        voucher = MarkingVoucher.objects.create(
            code='MARK2025',
            name='Standard Voucher',
            price=Decimal('50.00')
        )
        self.assertIsNone(voucher.expiry_date)

    def test_auto_timestamp_fields(self):
        """Test created_at and updated_at are automatically set."""
        voucher = MarkingVoucher.objects.create(
            code='MARK2025',
            name='Standard Voucher',
            price=Decimal('50.00')
        )

        self.assertIsNotNone(voucher.created_at)
        self.assertIsNotNone(voucher.updated_at)

        # Created and updated dates should be approximately equal initially
        time_diff = voucher.updated_at - voucher.created_at
        self.assertLess(time_diff.total_seconds(), 1)

    def test_updated_at_changes_on_save(self):
        """Test updated_at changes when record is saved."""
        import time

        voucher = MarkingVoucher.objects.create(
            code='MARK2025',
            name='Standard Voucher',
            price=Decimal('50.00')
        )
        original_updated = voucher.updated_at

        # Wait a bit then save again
        time.sleep(0.1)
        voucher.description = 'Updated description'
        voucher.save()

        # Updated date should have changed
        voucher.refresh_from_db()
        self.assertGreater(voucher.updated_at, original_updated)

    def test_str_method_formatting(self):
        """Test __str__ method returns code and name."""
        voucher = MarkingVoucher.objects.create(
            code='MARK2025',
            name='Standard Marking Voucher',
            price=Decimal('50.00')
        )

        expected = "MARK2025 - Standard Marking Voucher"
        self.assertEqual(str(voucher), expected)

    def test_is_available_property_active_no_expiry(self):
        """Test is_available returns True for active voucher with no expiry."""
        voucher = MarkingVoucher.objects.create(
            code='MARK2025',
            name='Standard Voucher',
            price=Decimal('50.00'),
            is_active=True,
            expiry_date=None
        )

        self.assertTrue(voucher.is_available)

    def test_is_available_property_active_with_future_expiry(self):
        """Test is_available returns True for active voucher with future expiry."""
        future_expiry = timezone.now() + timedelta(days=30)

        voucher = MarkingVoucher.objects.create(
            code='MARK2025',
            name='Standard Voucher',
            price=Decimal('50.00'),
            is_active=True,
            expiry_date=future_expiry
        )

        self.assertTrue(voucher.is_available)

    def test_is_available_property_inactive(self):
        """Test is_available returns False for inactive voucher."""
        voucher = MarkingVoucher.objects.create(
            code='MARK2025',
            name='Standard Voucher',
            price=Decimal('50.00'),
            is_active=False
        )

        self.assertFalse(voucher.is_available)

    def test_is_available_property_expired(self):
        """Test is_available returns False for expired voucher."""
        past_expiry = timezone.now() - timedelta(days=1)

        voucher = MarkingVoucher.objects.create(
            code='EXPIRED2024',
            name='Expired Voucher',
            price=Decimal('50.00'),
            is_active=True,
            expiry_date=past_expiry
        )

        self.assertFalse(voucher.is_available)

    def test_is_available_property_inactive_and_expired(self):
        """Test is_available returns False for inactive AND expired voucher."""
        past_expiry = timezone.now() - timedelta(days=1)

        voucher = MarkingVoucher.objects.create(
            code='OLD2024',
            name='Old Voucher',
            price=Decimal('50.00'),
            is_active=False,
            expiry_date=past_expiry
        )

        self.assertFalse(voucher.is_available)

    def test_ordering_by_created_at_descending(self):
        """Test default ordering is by created_at descending (newest first)."""
        import time

        # Create three vouchers with slight time differences
        voucher1 = MarkingVoucher.objects.create(
            code='VOUCHER1',
            name='Voucher 1',
            price=Decimal('50.00')
        )
        time.sleep(0.01)

        voucher2 = MarkingVoucher.objects.create(
            code='VOUCHER2',
            name='Voucher 2',
            price=Decimal('50.00')
        )
        time.sleep(0.01)

        voucher3 = MarkingVoucher.objects.create(
            code='VOUCHER3',
            name='Voucher 3',
            price=Decimal('50.00')
        )

        # Query all - should be ordered newest first
        vouchers = list(MarkingVoucher.objects.all())
        self.assertEqual(vouchers[0].id, voucher3.id)  # Newest
        self.assertEqual(vouchers[1].id, voucher2.id)
        self.assertEqual(vouchers[2].id, voucher1.id)  # Oldest

    def test_verbose_name(self):
        """Test model verbose name is set correctly."""
        self.assertEqual(
            MarkingVoucher._meta.verbose_name,
            'Marking Voucher'
        )

    def test_verbose_name_plural(self):
        """Test model verbose name plural is set correctly."""
        self.assertEqual(
            MarkingVoucher._meta.verbose_name_plural,
            'Marking Vouchers'
        )

    def test_db_table_name(self):
        """Test custom database table name."""
        self.assertEqual(
            MarkingVoucher._meta.db_table,
            'acted_marking_vouchers'
        )

    def test_query_active_vouchers(self):
        """Test querying for active vouchers."""
        # Create active and inactive vouchers
        active1 = MarkingVoucher.objects.create(
            code='ACTIVE1',
            name='Active Voucher 1',
            price=Decimal('50.00'),
            is_active=True
        )
        active2 = MarkingVoucher.objects.create(
            code='ACTIVE2',
            name='Active Voucher 2',
            price=Decimal('60.00'),
            is_active=True
        )
        inactive = MarkingVoucher.objects.create(
            code='INACTIVE',
            name='Inactive Voucher',
            price=Decimal('70.00'),
            is_active=False
        )

        # Query for active vouchers
        active_vouchers = MarkingVoucher.objects.filter(is_active=True)
        self.assertEqual(active_vouchers.count(), 2)

    def test_query_available_vouchers(self):
        """Test querying for available vouchers using is_available property."""
        # Create various vouchers
        available1 = MarkingVoucher.objects.create(
            code='AVAILABLE1',
            name='Available Voucher 1',
            price=Decimal('50.00'),
            is_active=True
        )
        available2 = MarkingVoucher.objects.create(
            code='AVAILABLE2',
            name='Available Voucher 2',
            price=Decimal('60.00'),
            is_active=True,
            expiry_date=timezone.now() + timedelta(days=30)
        )
        inactive = MarkingVoucher.objects.create(
            code='INACTIVE',
            name='Inactive Voucher',
            price=Decimal('70.00'),
            is_active=False
        )
        expired = MarkingVoucher.objects.create(
            code='EXPIRED',
            name='Expired Voucher',
            price=Decimal('80.00'),
            is_active=True,
            expiry_date=timezone.now() - timedelta(days=1)
        )

        # Get all vouchers and filter by is_available property
        all_vouchers = MarkingVoucher.objects.all()
        available_vouchers = [v for v in all_vouchers if v.is_available]

        self.assertEqual(len(available_vouchers), 2)
        self.assertIn(available1, available_vouchers)
        self.assertIn(available2, available_vouchers)

    def test_multiple_vouchers_creation(self):
        """Test creating multiple voucher records."""
        voucher1 = MarkingVoucher.objects.create(
            code='VOUCHER1',
            name='Voucher 1',
            price=Decimal('50.00')
        )
        voucher2 = MarkingVoucher.objects.create(
            code='VOUCHER2',
            name='Voucher 2',
            price=Decimal('60.00')
        )
        voucher3 = MarkingVoucher.objects.create(
            code='VOUCHER3',
            name='Voucher 3',
            price=Decimal('70.00')
        )

        self.assertEqual(MarkingVoucher.objects.count(), 3)
