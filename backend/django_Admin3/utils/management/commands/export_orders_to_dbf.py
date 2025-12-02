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

        # Export all tables
        self._export_orders(service, output_dir)
        self._export_order_items(service, output_dir)
        self._export_users(service, output_dir)
        self._export_user_profiles(service, output_dir)

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
