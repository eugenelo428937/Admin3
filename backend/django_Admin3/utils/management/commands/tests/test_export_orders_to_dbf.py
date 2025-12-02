"""Tests for the export_orders_to_dbf management command."""
import os
import tempfile
import shutil
from decimal import Decimal
from datetime import datetime, timedelta

from django.test import TestCase
from django.core.management import call_command
from django.core.management.base import CommandError
from django.contrib.auth.models import User
from django.db import connection

from cart.models import ActedOrder, ActedOrderItem
from userprofile.models import UserProfile


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
