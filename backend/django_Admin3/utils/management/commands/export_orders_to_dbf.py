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
