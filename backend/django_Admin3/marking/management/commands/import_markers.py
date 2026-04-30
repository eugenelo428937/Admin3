"""Management command — import markers from legacy CSV.

Workflow:
  1. Pre-check: target Marker table must be empty.
  2. Parse markers.csv.
  3. Validate every row (collect all errors).
  4. If errors → write error CSV, abort.
  5. Else (and not --dry-run) → atomic create.
"""
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from marking.models import Marker
from marking.services.csv_imports.error_report import write_markers_errors_csv
from marking.services.csv_imports.markers import (
    parse_markers_csv,
    validate_markers_rows,
)


class Command(BaseCommand):
    help = 'Import markers from legacy markers.csv.'

    def add_arguments(self, parser):
        parser.add_argument('--csv-path', required=True, help='Path to markers.csv')
        parser.add_argument(
            '--errors-path',
            default='markers_errors.csv',
            help='Where to write the error report (default: markers_errors.csv)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Validate only; never write to DB.',
        )

    def handle(self, *args, **options):
        if Marker.objects.exists():
            raise CommandError(
                'Aborting: marking.markers table is not empty. '
                'Truncate before re-running.'
            )

        with open(options['csv_path'], encoding='utf-8') as f:
            rows = parse_markers_csv(f)

        if not rows:
            self.stdout.write(self.style.WARNING('No data rows found in CSV.'))
            return

        errors, resolved = validate_markers_rows(rows)

        if errors:
            with open(options['errors_path'], 'w', encoding='utf-8', newline='') as f:
                write_markers_errors_csv(errors, f)
            self.stderr.write(self.style.ERROR(
                f'{len(errors)} validation error(s) — see {options["errors_path"]}'
            ))
            raise CommandError('Validation failed.')

        if options['dry_run']:
            self.stdout.write(self.style.SUCCESS(
                f'Dry-run OK: {len(resolved)} markers would be imported.'
            ))
            return

        with transaction.atomic():
            for r in resolved:
                Marker.objects.create(
                    user_id=r.user_id,
                    initial=r.initials,
                    legacy_id=r.mkref_int,
                )

        self.stdout.write(self.style.SUCCESS(
            f'Imported {len(resolved)} markers.'
        ))
