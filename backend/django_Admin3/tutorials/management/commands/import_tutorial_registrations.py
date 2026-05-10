"""``python manage.py import_tutorial_registrations``.

One-shot legacy bulk import of ``docs/misc/tutorial_registrations.csv``
into ``acted.tutorial_registrations``. See
``docs/superpowers/specs/2026-05-08-tutorial-registrations-legacy-import-design.md``.

Examples
--------
Dry run (rolls back, prints summary)::

    python manage.py import_tutorial_registrations \\
        --file docs/misc/tutorial_registrations.csv \\
        --user admin --dry-run

Live import::

    python manage.py import_tutorial_registrations \\
        --file docs/misc/tutorial_registrations.csv \\
        --user admin

Convention deviation
--------------------
Sibling commands ``import_tutorial_events_csv`` and ``import_tutorial_orders_csv``
use a positional ``csv_path`` and default to dry-run with an opt-in ``--commit``.
This command intentionally inverts that pattern: it uses ``--file`` and defaults
to a *committing* run, with ``--dry-run`` available as the safety opt-in. The
inversion is deliberate — the sibling commands are recurring sync tools where a
preview is the common case, whereas this is a one-shot legacy bulk load where a
live run is the goal and the operator opts into preview only when investigating.
"""
from __future__ import annotations

from pathlib import Path

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand, CommandError

from tutorials.services.registrations_importer import import_registrations_csv


class Command(BaseCommand):
    help = (
        'One-shot bulk import of the legacy registrations CSV into '
        'tutorial_registrations. Refuses to run if the table is non-empty.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--file', required=True,
            help='Path to the registrations CSV (e.g. docs/misc/tutorial_registrations.csv).',
        )
        parser.add_argument(
            '--user', required=True,
            help='Username for TutorialEnrolmentImport.uploaded_by audit field.',
        )
        parser.add_argument(
            '--dry-run', action='store_true',
            help='Run inside a transaction and roll back. Prints summary; persists nothing.',
        )
        parser.add_argument(
            '--strict', action='store_true',
            help='On per-row IntegrityError, abort the whole import (default: skip + count).',
        )

    def handle(self, *args, **opts):
        try:
            user = User.objects.get(username=opts['user'])
        except User.DoesNotExist as exc:
            raise CommandError(f"user not found: {opts['user']!r}") from exc

        path = Path(opts['file'])
        if not path.exists():
            raise CommandError(f"file not found: {path}")

        with path.open('r', encoding='utf-8-sig', newline='') as fh:
            try:
                result = import_registrations_csv(
                    fh,
                    uploaded_by=user,
                    filename=str(path),
                    dry_run=opts['dry_run'],
                    strict=opts['strict'],
                )
            except RuntimeError as exc:
                raise CommandError(str(exc)) from exc

        self._print_summary(result, dry_run=opts['dry_run'])

    def _print_summary(self, result, *, dry_run: bool):
        mode = 'DRY RUN' if dry_run else 'COMMITTED'

        # Percentage helper for per-row counters. Per-token counters
        # (skipped_unknown_student, skipped_paren_suffix) and per-insert
        # counters (skipped_duplicate_in_db) intentionally omit the % since
        # their denominator differs from total_csv_rows.
        def pct(n):
            if not result.total_csv_rows:
                return ''
            return f' ({100 * n / result.total_csv_rows:.1f}% of CSV rows)'

        self.stdout.write(self.style.SUCCESS(f'Tutorial registrations import — {mode}'))
        self.stdout.write(f'  batch_id:                {result.batch_id}')
        self.stdout.write(f'  total_csv_rows:          {result.total_csv_rows}')
        self.stdout.write(f'  created:                 {result.created}')
        self.stdout.write(f'    linked_to_choice:      {result.linked_to_choice}')
        self.stdout.write(f'    unlinked:              {result.unlinked}{pct(result.unlinked)}')
        self.stdout.write(f'  multi_match_warnings:    {result.multi_match_warnings}')
        self.stdout.write(f'  skipped_cancelled:       {result.skipped_cancelled}{pct(result.skipped_cancelled)}')
        self.stdout.write(f'  skipped_unknown_session: {result.skipped_unknown_session}{pct(result.skipped_unknown_session)}')
        self.stdout.write(f'  skipped_unknown_student: {result.skipped_unknown_student}')
        self.stdout.write(f'  skipped_paren_suffix:    {result.skipped_paren_suffix}')
        self.stdout.write(f'  skipped_empty:           {result.skipped_empty}{pct(result.skipped_empty)}')
        self.stdout.write(f'  skipped_duplicate_in_db: {result.skipped_duplicate_in_db}')

        if result.warnings:
            self.stdout.write('')
            self.stdout.write(self.style.WARNING(f'{len(result.warnings)} warnings:'))
            for w in result.warnings:
                self.stdout.write(f'  - {w}')
