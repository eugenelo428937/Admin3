"""DEPRECATED: legacy CSV importer that wrote directly to `adm.events`.

This command predates the tutorial-events-as-master refactor (2026-05-15).
It used to write 20+ columns (title, learning_mode, lifecycle_state, etc.)
to `adm.events` — but those columns no longer exist on that table after
Phase 5. The webhook intake + `sync_events` are now the canonical sources
of Administrate-derived event data.

For CSV imports, use the new pipeline:
    python manage.py import_tutorial_events_csv <path-to-csv>

That command writes directly to `acted.tutorial_events` (the master) and
calls `event_dual_write.create_event_bridge_record` to maintain the
`adm.events` bridge row, mirroring the webhook flow.
"""
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = (
        'DEPRECATED. Use `import_tutorial_events_csv` instead. '
        'This command targeted columns that no longer exist on adm.events.'
    )

    def add_arguments(self, parser):
        # Keep the positional arg so existing scripts fail with a clearer
        # error than "unrecognized arguments" — they still get the
        # CommandError below pointing at the replacement command.
        parser.add_argument('csv_file', type=str)
        parser.add_argument('--dry-run', action='store_true')

    def handle(self, *args, **options):
        raise CommandError(
            'import_event_sessions is deprecated as of 2026-05-15.\n'
            '\n'
            'Background: this command wrote event fields (title, learning_mode,\n'
            'lifecycle_state, lms_start_date, etc.) directly to adm.events.\n'
            'Those columns no longer exist on that table after the\n'
            'tutorial-events-as-master refactor — adm.events is now a thin\n'
            'bridge keyed by external_id, with all event data on\n'
            'acted.tutorial_events.\n'
            '\n'
            'Use the replacement command:\n'
            '    python manage.py import_tutorial_events_csv <path>\n'
            '\n'
            'See docs/superpowers/plans/2026-05-15-tutorial-events-as-master-refactor.md'
        )
