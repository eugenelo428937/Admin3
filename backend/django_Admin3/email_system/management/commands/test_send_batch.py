"""
Test script to send an email batch via the batch API.

Usage:
    python manage.py test_send_batch

Sends a "Password Reset Completed" batch to 4 test recipients.
"""
import hashlib
import secrets
import requests
from django.core.management.base import BaseCommand
from email_system.models import EmailTemplate, ExternalApiKey


class Command(BaseCommand):
    help = 'Send a test email batch using the batch API'

    def add_arguments(self, parser):
        parser.add_argument(
            '--base-url',
            default='http://127.0.0.1:8888',
            help='Base URL of the running Django server (default: http://127.0.0.1:8888)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Print the request payload without sending',
        )

    def handle(self, *args, **options):
        base_url = options['base_url']
        dry_run = options['dry_run']

        # 1. Find the template
        template_name = 'password_reset_completed'
        try:
            template = EmailTemplate.objects.get(name=template_name)
        except EmailTemplate.DoesNotExist:
            # Try content variant
            try:
                template = EmailTemplate.objects.get(name='password_reset_completed_content')
            except EmailTemplate.DoesNotExist:
                self.stderr.write(self.style.ERROR(
                    f'Template "{template_name}" not found. Available templates:'
                ))
                for t in EmailTemplate.objects.all().values_list('name', 'display_name'):
                    self.stderr.write(f'  - {t[0]} ({t[1]})')
                return

        self.stdout.write(f'Using template: {template.name} (id={template.id}, display="{template.display_name}")')

        # 2. Get or create a test API key
        raw_key = 'test-batch-script-key-2026'
        key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
        api_key, created = ExternalApiKey.objects.get_or_create(
            key_hash=key_hash,
            defaults={
                'key_prefix': raw_key[:8],
                'name': 'Test Batch Script',
                'is_active': True,
            },
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'Created API key: {raw_key}'))
        else:
            self.stdout.write(f'Using existing API key: {raw_key}')

        # 3. Build the batch payload
        recipients = [
            'eugene.lo1030@gmail.com',
            'eugenelo@bpp.com',
            'smalleyes1030@gmail.com',
            'smalleyes3333@gmail.coma',
        ]

        payload = {
            'template_id': template.id,
            'requested_by': 'test_send_batch script',
            'notify_email': 'eugene.lo1030@gmail.com',
            'items': [
                {
                    'to_email': email,
                    'payload': {
                        'user': {
                            'first_name': email.split('@')[0].replace('.', ' ').title(),
                            'username': email,
                        },
                        'reset_timestamp': '2026-03-26T12:00:00Z',
                        'base_url': 'http://127.0.0.1:3000',
                    },
                }
                for email in recipients
            ],
        }

        if dry_run:
            import json
            self.stdout.write(self.style.WARNING('\n--- DRY RUN ---'))
            self.stdout.write(f'POST {base_url}/api/email/batch/send/')
            self.stdout.write(f'X-Api-Key: {raw_key}')
            self.stdout.write(json.dumps(payload, indent=2))
            return

        # 4. Send the batch
        url = f'{base_url}/api/email/batch/send/'
        self.stdout.write(f'\nSending batch to {url} ...')

        try:
            response = requests.post(
                url,
                json=payload,
                headers={'X-Api-Key': raw_key},
                timeout=30,
            )
        except requests.ConnectionError:
            self.stderr.write(self.style.ERROR(
                f'Could not connect to {base_url}. Is the Django server running?'
            ))
            return

        self.stdout.write(f'Status: {response.status_code}')

        if response.status_code == 201:
            data = response.json()
            batch = data.get('batch', {})
            self.stdout.write(self.style.SUCCESS(f'\nBatch created successfully!'))
            self.stdout.write(f'  Batch ID:    {batch.get("batch_id")}')
            self.stdout.write(f'  Status:      {batch.get("status")}')
            self.stdout.write(f'  Total items: {batch.get("total_items")}')
            self.stdout.write(f'\nPer-item results:')
            for item in batch.get('items', []):
                status_icon = '\u2705' if item.get('is_success') else '\u274c'
                self.stdout.write(f'  {status_icon} {item.get("to_email")} - queue_id: {item.get("queue_id")}')

            # 5. Query the batch status
            batch_id = batch.get('batch_id')
            if batch_id:
                self.stdout.write(f'\nQuerying batch status...')
                query_response = requests.get(
                    f'{base_url}/api/email/batch/{batch_id}/',
                    headers={'X-Api-Key': raw_key},
                    timeout=10,
                )
                if query_response.status_code == 200:
                    status_data = query_response.json()
                    self.stdout.write(f'  Status:     {status_data.get("status")}')
                    self.stdout.write(f'  Sent:       {status_data.get("sent_count")}/{status_data.get("total_items")}')
                    self.stdout.write(f'  Errors:     {status_data.get("error_count")}')
        else:
            self.stderr.write(self.style.ERROR(f'\nBatch send failed:'))
            self.stderr.write(response.text)
