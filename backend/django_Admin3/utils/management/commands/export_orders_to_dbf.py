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
        WHERE 1=1 {date_filter['clause'].replace('created_at', 'o.created_at') if date_filter['clause'] else ''}
        ORDER BY oi.order_id, oi.id
        """

        output_file = os.path.join(output_dir, 'ORDRITMS.DBF')
        count = service.export_query_to_dbf(
            sql=sql,
            output_file=output_file,
            params=date_filter['params']
        )
        self.stdout.write(f"Exported {count} order items to ORDRITMS.DBF")

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
            WHERE 1=1 {date_filter['clause'].replace('created_at', 'o.created_at') if date_filter['clause'] else ''}
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
            WHERE 1=1 {date_filter['clause'].replace('created_at', 'o.created_at') if date_filter['clause'] else ''}
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
