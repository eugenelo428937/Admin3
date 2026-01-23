# FoxPro Order Export Utility Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a Django management command to export orders, order items, users, and user profiles to Visual FoxPro DBF files for legacy system integration.

**Architecture:** Builds on existing `DbfExportService` infrastructure. Creates a specialized management command that exports 4 related tables (acted_orders, acted_order_items, auth_user, acted_user_profile) with proper FoxPro field naming conventions. Uses SQL joins to flatten related data where appropriate.

**Tech Stack:** Django 6.0, PostgreSQL, ydbf library (existing), cp1252 encoding for Windows/FoxPro compatibility

---

## Task 1: Create Test File for Export Management Command

**Files:**
- Create: `backend/django_Admin3/utils/management/commands/tests/test_export_orders_to_dbf.py`

**Step 1: Write the failing test for command existence**

```python
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

        # Create user profile
        self.profile = UserProfile.objects.create(
            user=self.user,
            title='Mr',
            send_invoices_to='HOME',
            send_study_material_to='WORK',
            remarks='Test remarks'
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
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/work/Documents/Code/Admin3/backend/django_Admin3 && python manage.py test utils.management.commands.tests.test_export_orders_to_dbf::ExportOrdersToDbfCommandTests::test_command_exists -v 2`

Expected: FAIL with "Unknown command: 'export_orders_to_dbf'"

**Step 3: Create minimal command to make test pass**

Create file `backend/django_Admin3/utils/management/commands/export_orders_to_dbf.py`:

```python
"""
Management command to export orders data to FoxPro DBF files.

Exports:
- acted_orders -> ORDERS.DBF
- acted_order_items -> ORDRITMS.DBF
- auth_user -> USERS.DBF
- acted_user_profile -> PROFILES.DBF
"""
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Export orders, order items, users, and profiles to FoxPro DBF files'

    def add_arguments(self, parser):
        parser.add_argument(
            '--output-dir',
            type=str,
            required=True,
            help='Directory to output DBF files'
        )

    def handle(self, *args, **options):
        self.stdout.write('Export command executed')
```

**Step 4: Run test to verify it passes**

Run: `cd /Users/work/Documents/Code/Admin3/backend/django_Admin3 && python manage.py test utils.management.commands.tests.test_export_orders_to_dbf::ExportOrdersToDbfCommandTests::test_command_exists -v 2`

Expected: PASS

**Step 5: Commit**

```bash
git add backend/django_Admin3/utils/management/commands/export_orders_to_dbf.py backend/django_Admin3/utils/management/commands/tests/test_export_orders_to_dbf.py
git commit -m "feat: add skeleton for export_orders_to_dbf command"
```

---

## Task 2: Add Test for Orders Export

**Files:**
- Modify: `backend/django_Admin3/utils/management/commands/tests/test_export_orders_to_dbf.py`
- Modify: `backend/django_Admin3/utils/management/commands/export_orders_to_dbf.py`

**Step 1: Write the failing test for orders DBF export**

Add to test file:

```python
    def test_exports_orders_dbf(self):
        """Test that command creates ORDERS.DBF file."""
        output_dir = os.path.join(self.test_dir, 'output')

        call_command(
            'export_orders_to_dbf',
            '--output-dir', output_dir
        )

        orders_file = os.path.join(output_dir, 'ORDERS.DBF')
        self.assertTrue(os.path.exists(orders_file), f"ORDERS.DBF not created at {orders_file}")
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/work/Documents/Code/Admin3/backend/django_Admin3 && python manage.py test utils.management.commands.tests.test_export_orders_to_dbf::ExportOrdersToDbfCommandTests::test_exports_orders_dbf -v 2`

Expected: FAIL with "ORDERS.DBF not created"

**Step 3: Implement orders export**

Update command:

```python
"""
Management command to export orders data to FoxPro DBF files.

Exports:
- acted_orders -> ORDERS.DBF
- acted_order_items -> ORDRITMS.DBF
- auth_user -> USERS.DBF
- acted_user_profile -> PROFILES.DBF
"""
import os
from django.core.management.base import BaseCommand
from utils.services.dbf_export_service import DbfExportService


class Command(BaseCommand):
    help = 'Export orders, order items, users, and profiles to FoxPro DBF files'

    def add_arguments(self, parser):
        parser.add_argument(
            '--output-dir',
            type=str,
            required=True,
            help='Directory to output DBF files'
        )
        parser.add_argument(
            '--debug',
            action='store_true',
            help='Enable debug output'
        )

    def handle(self, *args, **options):
        output_dir = options['output_dir']
        debug = options.get('debug', False)

        # Ensure output directory exists
        os.makedirs(output_dir, exist_ok=True)

        service = DbfExportService(encoding='cp1252', debug=debug)

        # Export orders
        self._export_orders(service, output_dir)

        self.stdout.write(self.style.SUCCESS('Export completed'))

    def _export_orders(self, service, output_dir):
        """Export acted_orders table to ORDERS.DBF"""
        sql = """
        SELECT
            id as ORDER_ID,
            user_id as USER_ID,
            subtotal as SUBTOTAL,
            vat_amount as VAT_AMT,
            total_amount as TOTAL_AMT,
            vat_rate as VAT_RATE,
            vat_country as VAT_CNTRY,
            vat_calculation_type as VAT_TYPE,
            created_at::date as CREAT_DT,
            created_at::time as CREAT_TM,
            updated_at::date as UPDAT_DT
        FROM acted_orders
        ORDER BY id
        """

        output_file = os.path.join(output_dir, 'ORDERS.DBF')
        count = service.export_query_to_dbf(sql=sql, output_file=output_file)
        self.stdout.write(f"Exported {count} orders to ORDERS.DBF")
```

**Step 4: Run test to verify it passes**

Run: `cd /Users/work/Documents/Code/Admin3/backend/django_Admin3 && python manage.py test utils.management.commands.tests.test_export_orders_to_dbf::ExportOrdersToDbfCommandTests::test_exports_orders_dbf -v 2`

Expected: PASS

**Step 5: Commit**

```bash
git add backend/django_Admin3/utils/management/commands/export_orders_to_dbf.py backend/django_Admin3/utils/management/commands/tests/test_export_orders_to_dbf.py
git commit -m "feat: implement orders export to ORDERS.DBF"
```

---

## Task 3: Add Test for Order Items Export

**Files:**
- Modify: `backend/django_Admin3/utils/management/commands/tests/test_export_orders_to_dbf.py`
- Modify: `backend/django_Admin3/utils/management/commands/export_orders_to_dbf.py`

**Step 1: Write the failing test for order items export**

Add test setup for order item and test method:

```python
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

        # Create user profile
        self.profile = UserProfile.objects.create(
            user=self.user,
            title='Mr',
            send_invoices_to='HOME',
            send_study_material_to='WORK',
            remarks='Test remarks'
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

    def test_exports_order_items_dbf(self):
        """Test that command creates ORDRITMS.DBF file."""
        output_dir = os.path.join(self.test_dir, 'output')

        call_command(
            'export_orders_to_dbf',
            '--output-dir', output_dir
        )

        items_file = os.path.join(output_dir, 'ORDRITMS.DBF')
        self.assertTrue(os.path.exists(items_file), f"ORDRITMS.DBF not created")
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/work/Documents/Code/Admin3/backend/django_Admin3 && python manage.py test utils.management.commands.tests.test_export_orders_to_dbf::ExportOrdersToDbfCommandTests::test_exports_order_items_dbf -v 2`

Expected: FAIL with "ORDRITMS.DBF not created"

**Step 3: Implement order items export**

Add to command handle method and add new method:

```python
    def handle(self, *args, **options):
        output_dir = options['output_dir']
        debug = options.get('debug', False)

        # Ensure output directory exists
        os.makedirs(output_dir, exist_ok=True)

        service = DbfExportService(encoding='cp1252', debug=debug)

        # Export all tables
        self._export_orders(service, output_dir)
        self._export_order_items(service, output_dir)

        self.stdout.write(self.style.SUCCESS('Export completed'))

    def _export_order_items(self, service, output_dir):
        """Export acted_order_items table to ORDRITMS.DBF"""
        sql = """
        SELECT
            id as ITEM_ID,
            order_id as ORDER_ID,
            product_id as PROD_ID,
            marking_voucher_id as VOUCHER_ID,
            item_type as ITEM_TYPE,
            quantity as QTY,
            price_type as PRICE_TYP,
            actual_price as ACT_PRICE,
            net_amount as NET_AMT,
            vat_amount as VAT_AMT,
            gross_amount as GROSS_AMT,
            vat_rate as VAT_RATE,
            is_vat_exempt as VAT_EXMPT
        FROM acted_order_items
        ORDER BY order_id, id
        """

        output_file = os.path.join(output_dir, 'ORDRITMS.DBF')
        count = service.export_query_to_dbf(sql=sql, output_file=output_file)
        self.stdout.write(f"Exported {count} order items to ORDRITMS.DBF")
```

**Step 4: Run test to verify it passes**

Run: `cd /Users/work/Documents/Code/Admin3/backend/django_Admin3 && python manage.py test utils.management.commands.tests.test_export_orders_to_dbf::ExportOrdersToDbfCommandTests::test_exports_order_items_dbf -v 2`

Expected: PASS

**Step 5: Commit**

```bash
git add backend/django_Admin3/utils/management/commands/export_orders_to_dbf.py backend/django_Admin3/utils/management/commands/tests/test_export_orders_to_dbf.py
git commit -m "feat: implement order items export to ORDRITMS.DBF"
```

---

## Task 4: Add Test for Users Export

**Files:**
- Modify: `backend/django_Admin3/utils/management/commands/tests/test_export_orders_to_dbf.py`
- Modify: `backend/django_Admin3/utils/management/commands/export_orders_to_dbf.py`

**Step 1: Write the failing test for users export**

```python
    def test_exports_users_dbf(self):
        """Test that command creates USERS.DBF file."""
        output_dir = os.path.join(self.test_dir, 'output')

        call_command(
            'export_orders_to_dbf',
            '--output-dir', output_dir
        )

        users_file = os.path.join(output_dir, 'USERS.DBF')
        self.assertTrue(os.path.exists(users_file), f"USERS.DBF not created")
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/work/Documents/Code/Admin3/backend/django_Admin3 && python manage.py test utils.management.commands.tests.test_export_orders_to_dbf::ExportOrdersToDbfCommandTests::test_exports_users_dbf -v 2`

Expected: FAIL with "USERS.DBF not created"

**Step 3: Implement users export**

Add to handle method and add new method:

```python
    def handle(self, *args, **options):
        output_dir = options['output_dir']
        debug = options.get('debug', False)

        # Ensure output directory exists
        os.makedirs(output_dir, exist_ok=True)

        service = DbfExportService(encoding='cp1252', debug=debug)

        # Export all tables
        self._export_orders(service, output_dir)
        self._export_order_items(service, output_dir)
        self._export_users(service, output_dir)

        self.stdout.write(self.style.SUCCESS('Export completed'))

    def _export_users(self, service, output_dir):
        """Export auth_user table to USERS.DBF (excluding password)"""
        sql = """
        SELECT
            id as USER_ID,
            username as USERNAME,
            first_name as FIRST_NM,
            last_name as LAST_NM,
            email as EMAIL,
            is_staff as IS_STAFF,
            is_active as IS_ACTIVE,
            date_joined::date as JOIN_DT,
            last_login::date as LOGIN_DT
        FROM auth_user
        ORDER BY id
        """

        output_file = os.path.join(output_dir, 'USERS.DBF')
        count = service.export_query_to_dbf(sql=sql, output_file=output_file)
        self.stdout.write(f"Exported {count} users to USERS.DBF")
```

**Step 4: Run test to verify it passes**

Run: `cd /Users/work/Documents/Code/Admin3/backend/django_Admin3 && python manage.py test utils.management.commands.tests.test_export_orders_to_dbf::ExportOrdersToDbfCommandTests::test_exports_users_dbf -v 2`

Expected: PASS

**Step 5: Commit**

```bash
git add backend/django_Admin3/utils/management/commands/export_orders_to_dbf.py backend/django_Admin3/utils/management/commands/tests/test_export_orders_to_dbf.py
git commit -m "feat: implement users export to USERS.DBF"
```

---

## Task 5: Add Test for User Profiles Export

**Files:**
- Modify: `backend/django_Admin3/utils/management/commands/tests/test_export_orders_to_dbf.py`
- Modify: `backend/django_Admin3/utils/management/commands/export_orders_to_dbf.py`

**Step 1: Write the failing test for profiles export**

```python
    def test_exports_profiles_dbf(self):
        """Test that command creates PROFILES.DBF file."""
        output_dir = os.path.join(self.test_dir, 'output')

        call_command(
            'export_orders_to_dbf',
            '--output-dir', output_dir
        )

        profiles_file = os.path.join(output_dir, 'PROFILES.DBF')
        self.assertTrue(os.path.exists(profiles_file), f"PROFILES.DBF not created")
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/work/Documents/Code/Admin3/backend/django_Admin3 && python manage.py test utils.management.commands.tests.test_export_orders_to_dbf::ExportOrdersToDbfCommandTests::test_exports_profiles_dbf -v 2`

Expected: FAIL with "PROFILES.DBF not created"

**Step 3: Implement profiles export**

Add to handle method and add new method:

```python
    def handle(self, *args, **options):
        output_dir = options['output_dir']
        debug = options.get('debug', False)

        # Ensure output directory exists
        os.makedirs(output_dir, exist_ok=True)

        service = DbfExportService(encoding='cp1252', debug=debug)

        # Export all tables
        self._export_orders(service, output_dir)
        self._export_order_items(service, output_dir)
        self._export_users(service, output_dir)
        self._export_user_profiles(service, output_dir)

        self.stdout.write(self.style.SUCCESS('Export completed'))

    def _export_user_profiles(self, service, output_dir):
        """Export acted_user_profile table to PROFILES.DBF"""
        sql = """
        SELECT
            id as PROF_ID,
            user_id as USER_ID,
            title as TITLE,
            send_invoices_to as INV_TO,
            send_study_material_to as STUDY_TO,
            remarks as REMARKS
        FROM acted_user_profile
        ORDER BY user_id
        """

        output_file = os.path.join(output_dir, 'PROFILES.DBF')
        count = service.export_query_to_dbf(sql=sql, output_file=output_file)
        self.stdout.write(f"Exported {count} profiles to PROFILES.DBF")
```

**Step 4: Run test to verify it passes**

Run: `cd /Users/work/Documents/Code/Admin3/backend/django_Admin3 && python manage.py test utils.management.commands.tests.test_export_orders_to_dbf::ExportOrdersToDbfCommandTests::test_exports_profiles_dbf -v 2`

Expected: PASS

**Step 5: Commit**

```bash
git add backend/django_Admin3/utils/management/commands/export_orders_to_dbf.py backend/django_Admin3/utils/management/commands/tests/test_export_orders_to_dbf.py
git commit -m "feat: implement profiles export to PROFILES.DBF"
```

---

## Task 6: Add Date Range Filtering

**Files:**
- Modify: `backend/django_Admin3/utils/management/commands/tests/test_export_orders_to_dbf.py`
- Modify: `backend/django_Admin3/utils/management/commands/export_orders_to_dbf.py`

**Step 1: Write the failing test for date filtering**

```python
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
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/work/Documents/Code/Admin3/backend/django_Admin3 && python manage.py test utils.management.commands.tests.test_export_orders_to_dbf::ExportOrdersToDbfCommandTests::test_filters_orders_by_date_range -v 2`

Expected: FAIL with "unrecognized arguments: --from-date"

**Step 3: Implement date filtering**

Update add_arguments and handle methods:

```python
    def add_arguments(self, parser):
        parser.add_argument(
            '--output-dir',
            type=str,
            required=True,
            help='Directory to output DBF files'
        )
        parser.add_argument(
            '--from-date',
            type=str,
            help='Start date for orders (YYYY-MM-DD)'
        )
        parser.add_argument(
            '--to-date',
            type=str,
            help='End date for orders (YYYY-MM-DD)'
        )
        parser.add_argument(
            '--debug',
            action='store_true',
            help='Enable debug output'
        )

    def handle(self, *args, **options):
        output_dir = options['output_dir']
        debug = options.get('debug', False)
        from_date = options.get('from_date')
        to_date = options.get('to_date')

        # Ensure output directory exists
        os.makedirs(output_dir, exist_ok=True)

        service = DbfExportService(encoding='cp1252', debug=debug)

        # Build date filter clause
        date_filter = self._build_date_filter(from_date, to_date)

        # Export all tables
        self._export_orders(service, output_dir, date_filter)
        self._export_order_items(service, output_dir, date_filter)
        self._export_users(service, output_dir)
        self._export_user_profiles(service, output_dir)

        self.stdout.write(self.style.SUCCESS('Export completed'))

    def _build_date_filter(self, from_date, to_date):
        """Build SQL date filter clause for orders."""
        conditions = []
        params = []

        if from_date:
            conditions.append("created_at >= %s")
            params.append(from_date)

        if to_date:
            conditions.append("created_at < (%s::date + interval '1 day')")
            params.append(to_date)

        if conditions:
            return {
                'clause': ' AND ' + ' AND '.join(conditions),
                'params': params
            }
        return {'clause': '', 'params': []}

    def _export_orders(self, service, output_dir, date_filter=None):
        """Export acted_orders table to ORDERS.DBF"""
        date_filter = date_filter or {'clause': '', 'params': []}

        sql = f"""
        SELECT
            id as ORDER_ID,
            user_id as USER_ID,
            subtotal as SUBTOTAL,
            vat_amount as VAT_AMT,
            total_amount as TOTAL_AMT,
            vat_rate as VAT_RATE,
            vat_country as VAT_CNTRY,
            vat_calculation_type as VAT_TYPE,
            created_at::date as CREAT_DT,
            created_at::time as CREAT_TM,
            updated_at::date as UPDAT_DT
        FROM acted_orders
        WHERE 1=1 {date_filter['clause']}
        ORDER BY id
        """

        output_file = os.path.join(output_dir, 'ORDERS.DBF')
        count = service.export_query_to_dbf(
            sql=sql,
            output_file=output_file,
            params=date_filter['params']
        )
        self.stdout.write(f"Exported {count} orders to ORDERS.DBF")

    def _export_order_items(self, service, output_dir, date_filter=None):
        """Export acted_order_items table to ORDRITMS.DBF"""
        date_filter = date_filter or {'clause': '', 'params': []}

        # Filter items by order date
        sql = f"""
        SELECT
            oi.id as ITEM_ID,
            oi.order_id as ORDER_ID,
            oi.product_id as PROD_ID,
            oi.marking_voucher_id as VOUCHER_ID,
            oi.item_type as ITEM_TYPE,
            oi.quantity as QTY,
            oi.price_type as PRICE_TYP,
            oi.actual_price as ACT_PRICE,
            oi.net_amount as NET_AMT,
            oi.vat_amount as VAT_AMT,
            oi.gross_amount as GROSS_AMT,
            oi.vat_rate as VAT_RATE,
            oi.is_vat_exempt as VAT_EXMPT
        FROM acted_order_items oi
        JOIN acted_orders o ON oi.order_id = o.id
        WHERE 1=1 {date_filter['clause'].replace('created_at', 'o.created_at')}
        ORDER BY oi.order_id, oi.id
        """

        output_file = os.path.join(output_dir, 'ORDRITMS.DBF')
        count = service.export_query_to_dbf(
            sql=sql,
            output_file=output_file,
            params=date_filter['params']
        )
        self.stdout.write(f"Exported {count} order items to ORDRITMS.DBF")
```

**Step 4: Run test to verify it passes**

Run: `cd /Users/work/Documents/Code/Admin3/backend/django_Admin3 && python manage.py test utils.management.commands.tests.test_export_orders_to_dbf::ExportOrdersToDbfCommandTests::test_filters_orders_by_date_range -v 2`

Expected: PASS

**Step 5: Commit**

```bash
git add backend/django_Admin3/utils/management/commands/export_orders_to_dbf.py backend/django_Admin3/utils/management/commands/tests/test_export_orders_to_dbf.py
git commit -m "feat: add date range filtering for order exports"
```

---

## Task 7: Add DBF File Validation Test

**Files:**
- Modify: `backend/django_Admin3/utils/management/commands/tests/test_export_orders_to_dbf.py`

**Step 1: Write test to validate DBF content**

```python
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
```

**Step 2: Run test to verify it passes**

Run: `cd /Users/work/Documents/Code/Admin3/backend/django_Admin3 && python manage.py test utils.management.commands.tests.test_export_orders_to_dbf::ExportOrdersToDbfCommandTests::test_dbf_files_contain_expected_data -v 2`

Expected: PASS (if dbfread is installed) or test skipped (if not)

**Step 3: Commit**

```bash
git add backend/django_Admin3/utils/management/commands/tests/test_export_orders_to_dbf.py
git commit -m "test: add DBF content validation test"
```

---

## Task 8: Add Only-With-Orders Filter Option

**Files:**
- Modify: `backend/django_Admin3/utils/management/commands/tests/test_export_orders_to_dbf.py`
- Modify: `backend/django_Admin3/utils/management/commands/export_orders_to_dbf.py`

**Step 1: Write the failing test for only-with-orders filter**

```python
    def test_only_with_orders_filters_users_and_profiles(self):
        """Test --only-with-orders flag limits users/profiles to those with orders."""
        # Create a user without orders
        no_order_user = User.objects.create_user(
            username='noorderuser',
            email='noorder@example.com',
            password='pass123'
        )
        UserProfile.objects.create(
            user=no_order_user,
            title='Ms'
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
        self.assertEqual(users_info['record_count'], 1, "Should only export users with orders")

        profiles_info = service.validate_dbf_file(os.path.join(output_dir, 'PROFILES.DBF'))
        self.assertEqual(profiles_info['record_count'], 1, "Should only export profiles with orders")
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/work/Documents/Code/Admin3/backend/django_Admin3 && python manage.py test utils.management.commands.tests.test_export_orders_to_dbf::ExportOrdersToDbfCommandTests::test_only_with_orders_filters_users_and_profiles -v 2`

Expected: FAIL with "unrecognized arguments: --only-with-orders"

**Step 3: Implement only-with-orders filter**

Update command:

```python
    def add_arguments(self, parser):
        parser.add_argument(
            '--output-dir',
            type=str,
            required=True,
            help='Directory to output DBF files'
        )
        parser.add_argument(
            '--from-date',
            type=str,
            help='Start date for orders (YYYY-MM-DD)'
        )
        parser.add_argument(
            '--to-date',
            type=str,
            help='End date for orders (YYYY-MM-DD)'
        )
        parser.add_argument(
            '--only-with-orders',
            action='store_true',
            help='Only export users/profiles that have orders'
        )
        parser.add_argument(
            '--debug',
            action='store_true',
            help='Enable debug output'
        )

    def handle(self, *args, **options):
        output_dir = options['output_dir']
        debug = options.get('debug', False)
        from_date = options.get('from_date')
        to_date = options.get('to_date')
        only_with_orders = options.get('only_with_orders', False)

        # Ensure output directory exists
        os.makedirs(output_dir, exist_ok=True)

        service = DbfExportService(encoding='cp1252', debug=debug)

        # Build date filter clause
        date_filter = self._build_date_filter(from_date, to_date)

        # Export all tables
        self._export_orders(service, output_dir, date_filter)
        self._export_order_items(service, output_dir, date_filter)
        self._export_users(service, output_dir, only_with_orders, date_filter)
        self._export_user_profiles(service, output_dir, only_with_orders, date_filter)

        self.stdout.write(self.style.SUCCESS('Export completed'))

    def _export_users(self, service, output_dir, only_with_orders=False, date_filter=None):
        """Export auth_user table to USERS.DBF (excluding password)"""
        date_filter = date_filter or {'clause': '', 'params': []}

        if only_with_orders:
            sql = f"""
            SELECT DISTINCT
                u.id as USER_ID,
                u.username as USERNAME,
                u.first_name as FIRST_NM,
                u.last_name as LAST_NM,
                u.email as EMAIL,
                u.is_staff as IS_STAFF,
                u.is_active as IS_ACTIVE,
                u.date_joined::date as JOIN_DT,
                u.last_login::date as LOGIN_DT
            FROM auth_user u
            INNER JOIN acted_orders o ON u.id = o.user_id
            WHERE 1=1 {date_filter['clause'].replace('created_at', 'o.created_at')}
            ORDER BY u.id
            """
            params = date_filter['params']
        else:
            sql = """
            SELECT
                id as USER_ID,
                username as USERNAME,
                first_name as FIRST_NM,
                last_name as LAST_NM,
                email as EMAIL,
                is_staff as IS_STAFF,
                is_active as IS_ACTIVE,
                date_joined::date as JOIN_DT,
                last_login::date as LOGIN_DT
            FROM auth_user
            ORDER BY id
            """
            params = []

        output_file = os.path.join(output_dir, 'USERS.DBF')
        count = service.export_query_to_dbf(sql=sql, output_file=output_file, params=params)
        self.stdout.write(f"Exported {count} users to USERS.DBF")

    def _export_user_profiles(self, service, output_dir, only_with_orders=False, date_filter=None):
        """Export acted_user_profile table to PROFILES.DBF"""
        date_filter = date_filter or {'clause': '', 'params': []}

        if only_with_orders:
            sql = f"""
            SELECT DISTINCT
                p.id as PROF_ID,
                p.user_id as USER_ID,
                p.title as TITLE,
                p.send_invoices_to as INV_TO,
                p.send_study_material_to as STUDY_TO,
                p.remarks as REMARKS
            FROM acted_user_profile p
            INNER JOIN acted_orders o ON p.user_id = o.user_id
            WHERE 1=1 {date_filter['clause'].replace('created_at', 'o.created_at')}
            ORDER BY p.user_id
            """
            params = date_filter['params']
        else:
            sql = """
            SELECT
                id as PROF_ID,
                user_id as USER_ID,
                title as TITLE,
                send_invoices_to as INV_TO,
                send_study_material_to as STUDY_TO,
                remarks as REMARKS
            FROM acted_user_profile
            ORDER BY user_id
            """
            params = []

        output_file = os.path.join(output_dir, 'PROFILES.DBF')
        count = service.export_query_to_dbf(sql=sql, output_file=output_file, params=params)
        self.stdout.write(f"Exported {count} profiles to PROFILES.DBF")
```

**Step 4: Run test to verify it passes**

Run: `cd /Users/work/Documents/Code/Admin3/backend/django_Admin3 && python manage.py test utils.management.commands.tests.test_export_orders_to_dbf::ExportOrdersToDbfCommandTests::test_only_with_orders_filters_users_and_profiles -v 2`

Expected: PASS

**Step 5: Commit**

```bash
git add backend/django_Admin3/utils/management/commands/export_orders_to_dbf.py backend/django_Admin3/utils/management/commands/tests/test_export_orders_to_dbf.py
git commit -m "feat: add --only-with-orders filter for users and profiles"
```

---

## Task 9: Run All Tests and Final Cleanup

**Files:**
- Modify: `backend/django_Admin3/utils/management/commands/export_orders_to_dbf.py` (add docstrings)

**Step 1: Run all tests**

Run: `cd /Users/work/Documents/Code/Admin3/backend/django_Admin3 && python manage.py test utils.management.commands.tests.test_export_orders_to_dbf -v 2`

Expected: All tests PASS

**Step 2: Add comprehensive docstrings**

Update command file header:

```python
"""
Management command to export orders data to FoxPro DBF files.

This command exports order-related data to Visual FoxPro DBF format for
legacy system integration.

Output Files:
- ORDERS.DBF: Order header information (acted_orders table)
- ORDRITMS.DBF: Order line items (acted_order_items table)
- USERS.DBF: User accounts (auth_user table, excludes password)
- PROFILES.DBF: User profile data (acted_user_profile table)

Field Naming Convention:
- All field names are max 10 characters (FoxPro limit)
- Field names are uppercase
- Abbreviations used: AMT=amount, DT=date, TM=time, NM=name

Usage Examples:
    # Export all data
    python manage.py export_orders_to_dbf --output-dir /path/to/exports

    # Export orders from specific date range
    python manage.py export_orders_to_dbf --output-dir /exports --from-date 2024-01-01 --to-date 2024-12-31

    # Export only users/profiles that have placed orders
    python manage.py export_orders_to_dbf --output-dir /exports --only-with-orders

    # Combine filters with debug output
    python manage.py export_orders_to_dbf --output-dir /exports --from-date 2024-01-01 --only-with-orders --debug

Dependencies:
    - ydbf: Required for DBF file creation (pip install ydbf)
    - dbfread: Optional for file validation (pip install dbfread)
"""
```

**Step 3: Commit final version**

```bash
git add backend/django_Admin3/utils/management/commands/export_orders_to_dbf.py
git commit -m "docs: add comprehensive docstrings to export_orders_to_dbf command"
```

---

## Task 10: Create __init__.py for Tests Directory

**Files:**
- Create: `backend/django_Admin3/utils/management/commands/tests/__init__.py`

**Step 1: Create the __init__.py file**

```python
"""Tests for utils management commands."""
```

**Step 2: Verify tests still run**

Run: `cd /Users/work/Documents/Code/Admin3/backend/django_Admin3 && python manage.py test utils.management.commands.tests.test_export_orders_to_dbf -v 2`

Expected: All tests PASS

**Step 3: Commit**

```bash
git add backend/django_Admin3/utils/management/commands/tests/__init__.py
git commit -m "chore: add __init__.py to utils management command tests"
```

---

## Summary

After completing all tasks, you will have:

1. **Management Command**: `export_orders_to_dbf` in `utils/management/commands/`
2. **4 DBF Output Files**:
   - `ORDERS.DBF` - Order headers
   - `ORDRITMS.DBF` - Order line items
   - `USERS.DBF` - User accounts (no passwords)
   - `PROFILES.DBF` - User profiles
3. **Features**:
   - Date range filtering (`--from-date`, `--to-date`)
   - Filter to only users with orders (`--only-with-orders`)
   - Debug mode (`--debug`)
   - cp1252 encoding for FoxPro compatibility
4. **Tests**: Comprehensive test coverage in `test_export_orders_to_dbf.py`

**Usage**:
```bash
cd backend/django_Admin3
python manage.py export_orders_to_dbf --output-dir ./exports --only-with-orders --debug
```
