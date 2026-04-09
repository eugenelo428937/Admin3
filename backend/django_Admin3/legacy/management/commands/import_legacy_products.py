"""Import historical product data from legacy CSV exports into legacy.products.

Reads all CSV files from --csv-dir, validates each row using classify_row(),
normalizes fullnames using normalize_fullname(), and bulk-creates
LegacyProduct rows in batches.

Usage:
    python manage.py import_legacy_products --csv-dir ../../docs/misc
    python manage.py import_legacy_products --csv-dir ../../docs/misc --clear
"""
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import connection

from catalog.management.commands._legacy_import_helpers import (
    classify_row,
    iter_legacy_csv_rows,
    normalize_fullname,
)
from legacy.models import LegacyProduct


BATCH_SIZE = 1000


class Command(BaseCommand):
    help = 'Import legacy product CSV data into the legacy.products table.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--csv-dir',
            required=True,
            help='Directory containing raw_prods*.csv files',
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Truncate the legacy.products table before importing',
        )

    def handle(self, *args, **options):
        csv_dir = Path(options['csv_dir'])
        clear = options['clear']

        if not csv_dir.is_dir():
            raise CommandError(f'csv_dir does not exist: {csv_dir}')

        existing_count = LegacyProduct.objects.count()

        if clear and existing_count > 0:
            # Truncate is faster than DELETE for large tables
            with connection.cursor() as cursor:
                cursor.execute('TRUNCATE "legacy"."products" RESTART IDENTITY')
            self.stdout.write(
                self.style.WARNING(
                    f'  Truncated {existing_count} existing rows'
                )
            )
        elif existing_count > 0:
            self.stdout.write(
                self.style.WARNING(
                    f'  Table already has {existing_count} rows. '
                    f'Use --clear to reimport. Skipping.'
                )
            )
            return

        csv_paths = sorted(csv_dir.glob('*.csv'))
        self.stdout.write(f'Found {len(csv_paths)} CSV files in {csv_dir}')

        buffer = []
        imported = 0
        skipped = 0

        for row in iter_legacy_csv_rows(csv_paths):
            reason = classify_row(row)
            if reason is not None:
                skipped += 1
                continue

            buffer.append(LegacyProduct(
                subject_code=row.subject,
                delivery_format=row.col2,
                product_template_code=row.col3,
                session_code=row.session,
                full_code=row.full_code,
                legacy_product_name=row.raw_fullname,
                short_name=row.raw_shortname,
                normalized_name=normalize_fullname(
                    row.raw_fullname, col2=row.col2, col3=row.col3,
                ),
                source_file=row.source_file,
                source_line=row.source_line,
            ))

            if len(buffer) >= BATCH_SIZE:
                LegacyProduct.objects.bulk_create(buffer)
                imported += len(buffer)
                buffer.clear()

        # Flush remaining
        if buffer:
            LegacyProduct.objects.bulk_create(buffer)
            imported += len(buffer)
            buffer.clear()

        self.stdout.write(
            self.style.SUCCESS(
                f'  Imported {imported} rows, skipped {skipped}'
            )
        )
