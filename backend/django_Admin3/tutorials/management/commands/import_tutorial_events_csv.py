"""Import tutorial events + sessions from a CSV (truncate-and-replace).

USAGE
    # Dry run (no DB writes; default)
    python manage.py import_tutorial_events_csv path/to/tutorial_import.csv

    # Commit
    python manage.py import_tutorial_events_csv path/to/tutorial_import.csv --commit

The dry-run prints the same report a real run would produce, so operators
can review skip counts and per-event errors before committing.

WORKFLOW (see services/event_csv_importer.py for details):
    1. Parse CSV (services/event_csv_parser.py)
    2. Truncate tutorial_events / tutorial_sessions / session-instructors M2M
    3. For each parsed event: skip cancelled, resolve dependencies, insert
    4. Print aggregate report

Locations / venues / instructor records survive across imports — the CSV
re-references them by name and the resolver get_or_creates as needed.
"""
from __future__ import annotations

from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from tutorials.services.event_csv_parser import parse_events_csv
from tutorials.services.event_csv_importer import (
    import_parsed_events, ImportReport,
)


class Command(BaseCommand):
    help = (
        "Import tutorial events and sessions from a CSV. "
        "Truncates tutorial_events / tutorial_sessions / session-instructor "
        "M2M before inserting. Defaults to dry-run; pass --commit to write."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            'csv_path',
            type=str,
            help='Path to the tutorial_import.csv file.',
        )
        parser.add_argument(
            '--commit',
            action='store_true',
            help='Apply changes to the database (default is a dry run).',
        )

    def handle(self, *args, **opts):
        csv_path = Path(opts['csv_path'])
        if not csv_path.exists():
            raise CommandError(f"CSV file does not exist: {csv_path}")

        commit = opts['commit']
        mode_label = 'COMMITTED' if commit else 'DRY RUN'

        with csv_path.open(encoding='utf-8') as f:
            parsed = parse_events_csv(f)

        self.stdout.write(self.style.NOTICE(
            f"Parsed {len(parsed.events)} events ({sum(len(e.sessions) for e in parsed.events)} sessions). "
            f"Skipped — OC:{parsed.skipped_oc_count} IGNORE:{parsed.skipped_ignore_count} "
            f"cancelled:{parsed.skipped_cancelled_count} malformed:{parsed.skipped_malformed_count} "
            f"duplicate:{parsed.skipped_duplicate_count} orphan:{parsed.skipped_orphan_count}"
        ))

        report: ImportReport = import_parsed_events(parsed, dry_run=not commit)

        self.stdout.write(self.style.SUCCESS(
            f"[{mode_label}] events_created={report.events_created} "
            f"sessions_created={report.sessions_created} "
            f"sessions_skipped_dup_seq={report.sessions_skipped_duplicate_sequence} "
            f"events_skipped_cancelled={report.events_skipped_cancelled} "
            f"events_skipped_errors={report.events_skipped_errors} "
            f"truncated_events={report.truncated_events} "
            f"truncated_sessions={report.truncated_sessions}"
        ))

        if report.event_errors:
            self.stdout.write(self.style.WARNING(
                f"\n{len(report.event_errors)} events skipped due to resolution errors:"
            ))
            for err in report.event_errors[:30]:  # cap output for huge runs
                self.stdout.write(f"  - {err['title']}")
                for msg in err['errors']:
                    self.stdout.write(f"      {msg}")
            if len(report.event_errors) > 30:
                self.stdout.write(f"  ... and {len(report.event_errors) - 30} more")
