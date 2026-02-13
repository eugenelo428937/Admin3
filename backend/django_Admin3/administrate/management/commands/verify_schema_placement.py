"""
Management command to verify all tables are in their expected PostgreSQL schemas.

Usage:
    python manage.py verify_schema_placement          # Human-readable output
    python manage.py verify_schema_placement --json    # JSON output (for CI)
    python manage.py verify_schema_placement --fix     # Show fix commands for misplaced tables
"""
import json
import sys

from django.core.management.base import BaseCommand
from django.db import connection


EXPECTED_SCHEMAS = {
    'adm': [
        'course_templates',
        'custom_fields',
        'instructors',
        'locations',
        'pricelevels',
        'venues',
        'course_template_price_levels',
        'events',
        'sessions',
    ],
    'acted': [
        # catalog
        'catalog_exam_sessions',
        'catalog_exam_session_subjects',
        'catalog_subjects',
        'catalog_products',
        'catalog_product_variations',
        'catalog_product_product_variations',
        'catalog_product_bundles',
        'catalog_product_bundle_products',
        'product_productvariation_recommendations',
        # store
        'products',
        'prices',
        'bundles',
        'bundle_products',
        # tutorials
        'tutorial_events',
        'tutorial_sessions',
        'tutorial_course_templates',
        'staff',
        'tutorial_instructors',
        'tutorial_locations',
        'tutorial_venues',
        # filtering
        'filter_product_product_groups',
        'filter_groups',
        'filter_configurations',
        'filter_configuration_groups',
        'filter_presets',
        'filter_usage_analytics',
        # cart
        'carts',
        'cart_items',
        'cart_fees',
        # orders
        'orders',
        'order_items',
        'order_payments',
        'order_delivery_detail',
        'order_user_contact',
        'order_user_preferences',
        'order_user_acknowledgments',
        # rules engine
        'rules',
        'rules_fields',
        'rules_message_templates',
        'rule_entry_points',
        'rule_executions',
        # user profile
        'user_profile',
        'user_profile_address',
        'user_profile_email',
        'user_profile_contact_number',
        # marking
        'marking_paper',
        'marking_vouchers',
        # students
        'students',
    ],
}


class Command(BaseCommand):
    help = 'Verify all tables are in their expected PostgreSQL schemas.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--json', action='store_true',
            help='Output results as JSON',
        )
        parser.add_argument(
            '--fix', action='store_true',
            help='Show SQL commands to fix misplaced tables',
        )

    def handle(self, *args, **options):
        if connection.vendor != 'postgresql':
            self.stderr.write(
                'This command requires PostgreSQL. '
                f'Current backend: {connection.vendor}'
            )
            sys.exit(1)

        errors = []
        verified = []

        with connection.cursor() as cursor:
            for schema, tables in EXPECTED_SCHEMAS.items():
                for table in tables:
                    cursor.execute(
                        "SELECT 1 FROM information_schema.tables "
                        "WHERE table_schema = %s AND table_name = %s",
                        [schema, table],
                    )
                    if cursor.fetchone():
                        verified.append(f'{schema}.{table}')
                    else:
                        errors.append({
                            'table': table,
                            'expected_schema': schema,
                            'fix_sql': (
                                f'ALTER TABLE public."{table}" '
                                f'SET SCHEMA {schema};'
                            ),
                        })

        if options['json']:
            self.stdout.write(json.dumps({
                'ok': len(errors) == 0,
                'verified': len(verified),
                'errors': errors,
            }))
        else:
            for v in verified:
                self.stdout.write(self.style.SUCCESS(f'  OK: {v}'))
            for e in errors:
                self.stdout.write(self.style.ERROR(
                    f'  MISSING: {e["expected_schema"]}.{e["table"]}'
                ))
                if options['fix']:
                    self.stdout.write(f'    FIX: {e["fix_sql"]}')

            if errors:
                self.stdout.write(self.style.ERROR(
                    f'\n{len(errors)} table(s) in wrong schema!'
                ))
                sys.exit(1)
            else:
                self.stdout.write(self.style.SUCCESS(
                    f'\nAll tables verified ({len(verified)} tables in correct schemas).'
                ))
