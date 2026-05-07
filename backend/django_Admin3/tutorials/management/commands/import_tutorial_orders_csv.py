"""Import tutorial orders + choices from a CSV (additive — no truncation).

USAGE
    # Dry run (default)
    python manage.py import_tutorial_orders_csv path/to/tutorial_orders.csv

    # Commit
    python manage.py import_tutorial_orders_csv path/to/tutorial_orders.csv --commit

    # Specify encoding (default utf-8; legacy export is cp1252)
    python manage.py import_tutorial_orders_csv ... --encoding cp1252

WORKFLOW (see services/orders_csv_importer.py for details):
    1. Parse CSV → OrdersParseResult (OC rows skipped, choice rank extracted)
    2. For each parsed row: resolve (Student auto-created if missing,
       TutorialEvent looked up by xname+sitting)
    3. Group by (student, sitting) → ONE Order; one OrderItem per row;
       one TutorialChoice per OrderItem.
    4. Print aggregate report.

Pre-requisite: tutorial_events must already exist for the sittings the
orders.csv references (run import_tutorial_events_csv first).
"""
from __future__ import annotations

from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from tutorials.services.orders_csv_parser import parse_orders_csv
from tutorials.services.orders_csv_importer import (
    import_parsed_orders, OrdersImportReport,
)


class Command(BaseCommand):
    help = (
        "Import tutorial orders/choices from a CSV. Additive — does not "
        "truncate existing Orders/OrderItems/TutorialChoices. Defaults to "
        "dry-run; pass --commit to write."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            'csv_path', type=str,
            help='Path to the tutorial_orders.csv file.',
        )
        parser.add_argument(
            '--commit', action='store_true',
            help='Apply changes to the database (default is a dry run).',
        )
        parser.add_argument(
            '--encoding', type=str, default='utf-8',
            help='File encoding (default utf-8). Use cp1252 for the legacy '
                 'Windows export with accented characters.',
        )

    def handle(self, *args, **opts):
        csv_path = Path(opts['csv_path'])
        if not csv_path.exists():
            raise CommandError(f"CSV file does not exist: {csv_path}")

        commit = opts['commit']
        encoding = opts['encoding']
        mode_label = 'COMMITTED' if commit else 'DRY RUN'

        with csv_path.open(encoding=encoding) as f:
            parsed = parse_orders_csv(f)

        self.stdout.write(self.style.NOTICE(
            f"Parsed {len(parsed.rows)} face-to-face choice rows "
            f"(total CSV rows: {parsed.total_rows}). "
            f"Skipped — OC:{parsed.skipped_oc_count} "
            f"unparseable:{parsed.skipped_unparseable_count}"
        ))

        report: OrdersImportReport = import_parsed_orders(parsed, dry_run=not commit)

        self.stdout.write(self.style.SUCCESS(
            f"[{mode_label}] orders_created={report.orders_created} "
            f"order_items_created={report.order_items_created} "
            f"choices_created={report.choices_created} "
            f"students_auto_created={report.students_auto_created} "
            f"rows_skipped_errors={report.rows_skipped_errors}"
        ))

        if report.row_errors:
            self.stdout.write(self.style.WARNING(
                f"\n{len(report.row_errors)} rows skipped due to resolution errors:"
            ))
            for err in report.row_errors[:30]:
                self.stdout.write(
                    f"  - student={err['student_ref']} event={err['event_code_xname']} "
                    f"sitting={err['sitting_year']}"
                )
                for msg in err['errors']:
                    self.stdout.write(f"      {msg}")
            if len(report.row_errors) > 30:
                self.stdout.write(f"  ... and {len(report.row_errors) - 30} more")
