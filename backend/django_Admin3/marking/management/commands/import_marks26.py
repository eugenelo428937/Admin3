"""Management command — import marks26.csv into marking + voucher tables."""
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from marking.models import (
    MarkingPaperFeedback, MarkingPaperGrading, MarkingPaperSubmission,
)
from marking_vouchers.models import IssuedVoucher, RedeemedVoucher

from marking.services.csv_imports.error_report import write_marks26_errors_csv
from marking.services.csv_imports.marks26_lookups import build_lookups
from marking.services.csv_imports.marks26_parsing import parse_marks26_csv
from marking.services.csv_imports.marks26_steps import run_import_steps
from marking.services.csv_imports.marks26_validators import (
    preflight_checks,
    validate_marks26_row,
)


TARGET_TABLES = [
    ('issued_vouchers', IssuedVoucher),
    ('redeemed_vouchers', RedeemedVoucher),
    ('marking_paper_submissions', MarkingPaperSubmission),
    ('marking_paper_gradings', MarkingPaperGrading),
    ('marking_paper_feedbacks', MarkingPaperFeedback),
]


class Command(BaseCommand):
    help = 'Import marks26.csv (vouchers + submissions + gradings + feedbacks).'

    def add_arguments(self, parser):
        parser.add_argument('--csv-path', required=True)
        parser.add_argument('--errors-path', default='marks26_errors.csv')
        parser.add_argument('--dry-run', action='store_true')

    def handle(self, *args, **options):
        # 1. Pre-check — target tables must be empty
        for label, model in TARGET_TABLES:
            if model.objects.exists():
                raise CommandError(
                    f'Aborting: {label} table is not empty. '
                    'Truncate target tables before re-running.'
                )

        # 2. Parse
        with open(options['csv_path'], encoding='utf-8') as f:
            rows = parse_marks26_csv(f)

        if not rows:
            self.stdout.write(self.style.WARNING('No data rows found in CSV.'))
            return

        # 3. Build lookups + pre-flight
        lookups = build_lookups()
        preflight_errors = preflight_checks(rows, lookups)
        if preflight_errors:
            self.stderr.write(self.style.ERROR('Pre-flight failed:'))
            for msg in preflight_errors:
                self.stderr.write(f'  {msg}')
            raise CommandError('Pre-flight checks failed.')

        # 4. Per-row validation
        all_errors = []
        for row in rows:
            all_errors.extend(validate_marks26_row(row, lookups))
        if all_errors:
            with open(options['errors_path'], 'w', encoding='utf-8', newline='') as f:
                write_marks26_errors_csv(all_errors, f)
            self.stderr.write(self.style.ERROR(
                f'{len(all_errors)} validation error(s) — see {options["errors_path"]}'
            ))
            raise CommandError('Validation failed.')

        # 5. Dry-run short-circuit
        if options['dry_run']:
            self.stdout.write(self.style.SUCCESS(
                f'Dry-run OK: {len(rows)} row(s) validated, no DB writes.'
            ))
            return

        # 6. Atomic import
        with transaction.atomic():
            counts = run_import_steps(rows, lookups)

        self.stdout.write(self.style.SUCCESS(
            'Import complete. '
            f'IssuedVouchers={counts["iv"]} '
            f'RedeemedVouchers={counts["rv"]} '
            f'Submissions={counts["sub"]} '
            f'Gradings={counts["grading"]} '
            f'Feedbacks={counts["feedback"]}'
        ))
