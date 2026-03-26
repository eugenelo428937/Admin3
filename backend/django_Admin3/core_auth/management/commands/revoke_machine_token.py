from django.core.management.base import BaseCommand, CommandError
from core_auth.models import MachineToken


class Command(BaseCommand):
    help = 'Revoke machine tokens by machine name or user email'

    def add_arguments(self, parser):
        parser.add_argument('--machine', help='Machine name to revoke')
        parser.add_argument('--user', help='User email to revoke all tokens for')
        parser.add_argument('--force', action='store_true',
                            help='Skip confirmation prompt')

    def handle(self, *args, **options):
        machine = options.get('machine')
        user_email = options.get('user')
        force = options.get('force', False)

        if not machine and not user_email:
            raise CommandError('Provide --machine or --user')

        tokens = MachineToken.objects.filter(is_active=True)
        if machine:
            tokens = tokens.filter(machine_name=machine)
        if user_email:
            tokens = tokens.filter(user__email=user_email)

        count = tokens.count()
        if count == 0:
            self.stdout.write('No active tokens found matching criteria.')
            return

        if not force:
            self.stdout.write(f'Will revoke {count} token(s):')
            for t in tokens.select_related('user'):
                self.stdout.write(f'  - {t.machine_name} \u2192 {t.user.email}')
            confirm = input('Proceed? [y/N] ')
            if confirm.lower() != 'y':
                self.stdout.write('Cancelled.')
                return

        tokens.update(is_active=False)
        self.stdout.write(self.style.SUCCESS(f'Revoked {count} token(s).'))
