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
