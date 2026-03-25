from django.core.management.base import BaseCommand
from core_auth.models import MachineToken


class Command(BaseCommand):
    help = 'List machine tokens with optional filtering'

    def add_arguments(self, parser):
        parser.add_argument('--user', help='Filter by user email')
        parser.add_argument('--machine', help='Filter by machine name')
        parser.add_argument('--all', action='store_true',
                            help='Include inactive tokens')

    def handle(self, *args, **options):
        tokens = MachineToken.objects.select_related('user').all()

        if not options.get('all'):
            tokens = tokens.filter(is_active=True)
        if options.get('user'):
            tokens = tokens.filter(user__email=options['user'])
        if options.get('machine'):
            tokens = tokens.filter(machine_name=options['machine'])

        if not tokens.exists():
            self.stdout.write('No tokens found.')
            return

        self.stdout.write(
            f'{"Machine":<25} {"User":<30} {"Active":<8} {"Created":<20} {"Last Used":<20}'
        )
        self.stdout.write('-' * 103)

        for t in tokens:
            last_used = t.last_used_at.strftime('%Y-%m-%d %H:%M') if t.last_used_at else 'Never'
            created = t.created_at.strftime('%Y-%m-%d %H:%M')
            active = 'Yes' if t.is_active else 'No'
            self.stdout.write(
                f'{t.machine_name:<25} {t.user.email:<30} {active:<8} {created:<20} {last_used:<20}'
            )
