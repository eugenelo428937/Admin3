import logging
from django.core.management.base import BaseCommand
from django.core.management import call_command
from io import StringIO

logger = logging.getLogger(__name__)

SYNC_COMMANDS = [
    ('sync_custom_fields', 'custom fields'),
    ('sync_price_levels', 'price levels'),
    ('sync_locations', 'locations'),
    ('sync_venues', 'venues'),
    ('sync_instructors', 'instructors'),
    ('sync_course_templates', 'course templates'),
    ('sync_course_template_price_levels', 'course template price levels'),
]


class Command(BaseCommand):
    help = 'Run all Administrate sync commands in dependency order'

    def add_arguments(self, parser):
        parser.add_argument(
            '--debug',
            action='store_true',
            help='Enable debug logging (passed to all sub-commands)'
        )
        parser.add_argument(
            '--no-prompt',
            action='store_true',
            help='Skip interactive prompts (passed to all sub-commands)'
        )
        parser.add_argument(
            '--skip-errors',
            action='store_true',
            help='Continue to next command on failure (default: stop on first error)'
        )

    def handle(self, *args, **options):
        debug = options['debug']
        no_prompt = options['no_prompt']
        skip_errors = options['skip_errors']

        if debug:
            logger.setLevel(logging.DEBUG)

        self.stdout.write('=== Administrate Full Sync ===\n')

        total_commands = len(SYNC_COMMANDS)
        completed = 0
        failed = 0

        for index, (command_name, display_name) in enumerate(SYNC_COMMANDS, 1):
            self.stdout.write(f'[{index}/{total_commands}] Syncing {display_name}...')

            try:
                cmd_args = []
                if debug:
                    cmd_args.append('--debug')
                if no_prompt:
                    cmd_args.append('--no-prompt')

                # Capture output from sub-command
                out = StringIO()
                call_command(command_name, *cmd_args, stdout=out, stderr=out)

                output = out.getvalue()
                # Show the last line (summary) from each command
                lines = [l.strip() for l in output.strip().split('\n') if l.strip()]
                if lines:
                    self.stdout.write(f'  ✓ {display_name}: {lines[-1]}')
                else:
                    self.stdout.write(f'  ✓ {display_name}: completed')

                completed += 1

            except Exception as e:
                failed += 1
                self.stdout.write(
                    self.style.ERROR(f'  ✗ {display_name}: FAILED - {str(e)}')
                )
                if debug:
                    logger.exception(e)

                if not skip_errors:
                    self.stdout.write(
                        self.style.ERROR(
                            f'\nSync aborted after {display_name} failure. '
                            f'Use --skip-errors to continue on failure.'
                        )
                    )
                    break

        self.stdout.write(f'\n=== Sync Complete ===')
        self.stdout.write(
            f'Total: {completed} succeeded, {failed} failed '
            f'out of {total_commands} commands'
        )

        if failed > 0:
            self.stdout.write(
                self.style.WARNING(
                    f'{failed} command(s) failed. '
                    f'Run individual commands with --debug for details.'
                )
            )
