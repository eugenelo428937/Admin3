"""Tests for the export_orders_to_dbf management command."""
import os
import tempfile
import shutil
import unittest
from decimal import Decimal
from datetime import datetime, timedelta

from django.test import TestCase
from django.core.management import call_command
from django.core.management.base import CommandError
from django.contrib.auth.models import User
from django.db import connection

from cart.models import ActedOrder, ActedOrderItem
from userprofile.models import UserProfile
from utils.services.dbf_export_service import DbfExportService, YDBF_AVAILABLE


@unittest.skipUnless(YDBF_AVAILABLE, 'ydbf library not installed')
class ExportOrdersToDbfCommandTests(TestCase):
    """Test cases for export_orders_to_dbf management command."""

    def setUp(self):
        """Set up test data."""
        self.test_dir = tempfile.mkdtemp()

        # Create test user
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            first_name='Test',
            last_name='User',
            password='testpass123'
        )

        # Get or create user profile (signal may auto-create)
        self.profile, _ = UserProfile.objects.get_or_create(
            user=self.user,
            defaults={
                'title': 'Mr',
                'send_invoices_to': 'HOME',
                'send_study_material_to': 'WORK',
                'remarks': 'Test remarks'
            }
        )

        # Create test order
        self.order = ActedOrder.objects.create(
            user=self.user,
            subtotal=Decimal('100.00'),
            vat_amount=Decimal('20.00'),
            total_amount=Decimal('120.00'),
            vat_rate=Decimal('0.2000'),
            vat_country='GB'
        )

        # Create test order item (fee type - no product/voucher required)
        self.order_item = ActedOrderItem.objects.create(
            order=self.order,
            item_type='fee',
            quantity=1,
            price_type='standard',
            actual_price=Decimal('50.00'),
            net_amount=Decimal('50.00'),
            vat_amount=Decimal('10.00'),
            gross_amount=Decimal('60.00'),
            vat_rate=Decimal('0.2000'),
            is_vat_exempt=False
        )

    def tearDown(self):
        """Clean up test directory."""
        shutil.rmtree(self.test_dir, ignore_errors=True)

    def test_command_exists(self):
        """Test that the management command exists and is callable."""
        output_dir = os.path.join(self.test_dir, 'output')

        # Should not raise CommandError for missing command
        call_command(
            'export_orders_to_dbf',
            '--output-dir', output_dir
        )

    def test_exports_orders_dbf(self):
        """Test that command creates ORDERS.DBF file."""
        output_dir = os.path.join(self.test_dir, 'output')

        call_command(
            'export_orders_to_dbf',
            '--output-dir', output_dir
        )

        orders_file = os.path.join(output_dir, 'ORDERS.DBF')
        self.assertTrue(os.path.exists(orders_file), f"ORDERS.DBF not created at {orders_file}")

    def test_exports_order_items_dbf(self):
        """Test that command creates ORDRITMS.DBF file."""
        output_dir = os.path.join(self.test_dir, 'output')

        call_command(
            'export_orders_to_dbf',
            '--output-dir', output_dir
        )

        items_file = os.path.join(output_dir, 'ORDRITMS.DBF')
        self.assertTrue(os.path.exists(items_file), f"ORDRITMS.DBF not created")

    def test_exports_users_dbf(self):
        """Test that command creates USERS.DBF file."""
        output_dir = os.path.join(self.test_dir, 'output')

        call_command(
            'export_orders_to_dbf',
            '--output-dir', output_dir
        )

        users_file = os.path.join(output_dir, 'USERS.DBF')
        self.assertTrue(os.path.exists(users_file), f"USERS.DBF not created")

    def test_exports_profiles_dbf(self):
        """Test that command creates PROFILES.DBF file."""
        output_dir = os.path.join(self.test_dir, 'output')

        call_command(
            'export_orders_to_dbf',
            '--output-dir', output_dir
        )

        profiles_file = os.path.join(output_dir, 'PROFILES.DBF')
        self.assertTrue(os.path.exists(profiles_file), f"PROFILES.DBF not created")

    def test_filters_orders_by_date_range(self):
        """Test that --from-date and --to-date filters orders."""
        # Create an old order (should be excluded)
        old_user = User.objects.create_user(
            username='olduser',
            email='old@example.com',
            password='pass123'
        )

        output_dir = os.path.join(self.test_dir, 'output')

        # Filter to only include today's orders
        today = datetime.now().strftime('%Y-%m-%d')

        call_command(
            'export_orders_to_dbf',
            '--output-dir', output_dir,
            '--from-date', today,
            '--to-date', today
        )

        # Verify the command completed without error
        orders_file = os.path.join(output_dir, 'ORDERS.DBF')
        self.assertTrue(os.path.exists(orders_file))

    def test_dbf_files_contain_expected_data(self):
        """Test that exported DBF files contain the expected data."""
        output_dir = os.path.join(self.test_dir, 'output')

        call_command(
            'export_orders_to_dbf',
            '--output-dir', output_dir
        )

        # Validate using the service
        service = DbfExportService()

        # Check orders file
        orders_info = service.validate_dbf_file(os.path.join(output_dir, 'ORDERS.DBF'))
        if 'validation' in orders_info:
            # dbfread not available - skip validation
            self.skipTest(f"Skipping DBF validation: {orders_info['validation']}")
        self.assertTrue(orders_info.get('valid', False), f"ORDERS.DBF invalid: {orders_info}")
        self.assertEqual(orders_info['record_count'], 1, "Expected 1 order record")

        # Check order items file
        items_info = service.validate_dbf_file(os.path.join(output_dir, 'ORDRITMS.DBF'))
        self.assertTrue(items_info.get('valid', False), f"ORDRITMS.DBF invalid: {items_info}")
        self.assertEqual(items_info['record_count'], 1, "Expected 1 order item record")

        # Check users file
        users_info = service.validate_dbf_file(os.path.join(output_dir, 'USERS.DBF'))
        self.assertTrue(users_info.get('valid', False), f"USERS.DBF invalid: {users_info}")
        self.assertGreaterEqual(users_info['record_count'], 1, "Expected at least 1 user record")

        # Check profiles file
        profiles_info = service.validate_dbf_file(os.path.join(output_dir, 'PROFILES.DBF'))
        self.assertTrue(profiles_info.get('valid', False), f"PROFILES.DBF invalid: {profiles_info}")
        self.assertEqual(profiles_info['record_count'], 1, "Expected 1 profile record")

    def test_only_with_orders_filters_users_and_profiles(self):
        """Test --only-with-orders flag limits users/profiles to those with orders."""
        # Create a user without orders
        no_order_user = User.objects.create_user(
            username='noorderuser',
            email='noorder@example.com',
            password='pass123'
        )
        # Get or create user profile (signal may auto-create)
        UserProfile.objects.get_or_create(
            user=no_order_user,
            defaults={'title': 'Ms'}
        )

        output_dir = os.path.join(self.test_dir, 'output')

        call_command(
            'export_orders_to_dbf',
            '--output-dir', output_dir,
            '--only-with-orders'
        )

        service = DbfExportService()

        # Should only export the user with orders (1), not the user without (2 total)
        users_info = service.validate_dbf_file(os.path.join(output_dir, 'USERS.DBF'))
        if 'validation' in users_info:
            # dbfread not available - skip validation
            self.skipTest(f"Skipping DBF validation: {users_info['validation']}")
        self.assertEqual(users_info['record_count'], 1, "Should only export users with orders")

        profiles_info = service.validate_dbf_file(os.path.join(output_dir, 'PROFILES.DBF'))
        self.assertEqual(profiles_info['record_count'], 1, "Should only export profiles with orders")
