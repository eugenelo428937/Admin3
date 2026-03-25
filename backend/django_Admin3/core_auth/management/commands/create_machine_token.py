import secrets
from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth.models import User
from core_auth.models import MachineToken
from core_auth.utils import hash_token


class Command(BaseCommand):
    help = 'Create a machine token for admin auto-login'

    def add_arguments(self, parser):
        parser.add_argument('--email', required=True, help='User email address')
        parser.add_argument('--machine', required=True, help='Machine name (e.g., LAPTOP-ELO01)')

    def handle(self, *args, **options):
        email = options['email']
        machine_name = options['machine']

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise CommandError(f'User with email "{email}" does not exist.')

        if not user.is_superuser:
            raise CommandError(f'User "{email}" is not a superuser.')

        raw_token = secrets.token_hex(32)
        token_hash_value = hash_token(raw_token)

        MachineToken.objects.create(
            token_hash=token_hash_value,
            user=user,
            machine_name=machine_name
        )

        self.stdout.write(self.style.SUCCESS(
            f'Machine token created for {email} on {machine_name}'
        ))
        self.stdout.write(f'Token: {raw_token}')
        self.stdout.write(f'URL:   https://7.32.1.138:8443/admin#machine_token={raw_token}')
        self.stdout.write(self.style.WARNING(
            '\nThis token will not be shown again. Save it now.'
        ))
