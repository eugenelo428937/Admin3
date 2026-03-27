"""
Management command to create an ExternalApiKey for the batch email API.

Usage:
    python manage.py create_api_key --name "Staff Laptop - Eugene"
    python manage.py create_api_key --name "CI Pipeline" --inactive
"""
import hashlib
import secrets

from django.core.management.base import BaseCommand, CommandError

from email_system.models import ExternalApiKey


class Command(BaseCommand):
    help = 'Create a new API key for the batch email API'

    def add_arguments(self, parser):
        parser.add_argument(
            '--name',
            required=True,
            help='Display name for the API key (e.g., "Staff Laptop - Eugene")',
        )
        parser.add_argument(
            '--inactive',
            action='store_true',
            help='Create the key in inactive state',
        )

    def handle(self, *args, **options):
        name = options['name']
        is_active = not options['inactive']

        raw_key = secrets.token_urlsafe(32)
        key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
        key_prefix = raw_key[:8]

        ExternalApiKey.objects.create(
            key_hash=key_hash,
            key_prefix=key_prefix,
            name=name,
            is_active=is_active,
        )

        self.stdout.write(self.style.SUCCESS('API Key created successfully!'))
        self.stdout.write(f'Name:   {name}')
        self.stdout.write(f'Active: {is_active}')
        self.stdout.write(f'Key:    {raw_key}')
        self.stdout.write('')
        self.stdout.write(self.style.WARNING(
            'Save this key now — it cannot be recovered after this.'
        ))
