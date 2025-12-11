"""
Django management command to test email connection and sending.
Run on Railway: railway run python manage.py test_email_connection
Or as one-off: python manage.py test_email_connection
"""

import smtplib
import hmac
import hashlib
import base64
from django.core.management.base import BaseCommand
from django.conf import settings
from django.core.mail import send_mail, EmailMultiAlternatives, get_connection


class Command(BaseCommand):
    help = 'Test email connection and sending capabilities'

    def add_arguments(self, parser):
        parser.add_argument(
            '--send-test',
            action='store_true',
            help='Actually send a test email'
        )
        parser.add_argument(
            '--to',
            type=str,
            default='eugene.lo1030@gmail.com',
            help='Email address to send test email to'
        )
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Show detailed SMTP debug output'
        )

    def handle(self, *args, **options):
        send_test = options['send_test']
        to_email = options['to']
        verbose = options['verbose']

        self.stdout.write(self.style.HTTP_INFO('=' * 60))
        self.stdout.write(self.style.HTTP_INFO('Email Connection Test'))
        self.stdout.write(self.style.HTTP_INFO('=' * 60))

        # Display current settings
        self.display_settings()

        # Test 1: Raw SMTP Connection
        self.test_smtp_connection(verbose)

        # Test 2: Django Connection
        self.test_django_connection(verbose)

        # Test 3: Send test email (if requested)
        if send_test:
            self.send_test_email(to_email)
        else:
            self.stdout.write(self.style.WARNING(
                '\nTo send a test email, run with --send-test flag'
            ))

        self.stdout.write(self.style.HTTP_INFO('\n' + '=' * 60))
        self.stdout.write(self.style.SUCCESS('Tests completed!'))
        self.stdout.write(self.style.HTTP_INFO('=' * 60))

    def display_settings(self):
        self.stdout.write('\nCurrent Email Settings:')
        self.stdout.write(f'  EMAIL_BACKEND: {settings.EMAIL_BACKEND}')
        self.stdout.write(f'  EMAIL_HOST: {getattr(settings, "EMAIL_HOST", "Not set")}')
        self.stdout.write(f'  EMAIL_PORT: {getattr(settings, "EMAIL_PORT", "Not set")}')
        self.stdout.write(f'  EMAIL_USE_TLS: {getattr(settings, "EMAIL_USE_TLS", False)}')
        self.stdout.write(f'  EMAIL_USE_SSL: {getattr(settings, "EMAIL_USE_SSL", False)}')
        self.stdout.write(f'  EMAIL_TIMEOUT: {getattr(settings, "EMAIL_TIMEOUT", "Not set")}')
        self.stdout.write(f'  EMAIL_HOST_USER: {getattr(settings, "EMAIL_HOST_USER", "Not set")}')
        self.stdout.write(f'  EMAIL_AUTH_METHOD: {getattr(settings, "EMAIL_AUTH_METHOD", "Not set")}')
        self.stdout.write(f'  DEFAULT_FROM_EMAIL: {settings.DEFAULT_FROM_EMAIL}')
        self.stdout.write(f'  USE_INTERNAL_SMTP: {getattr(settings, "USE_INTERNAL_SMTP", False)}')
        self.stdout.write(f'  USE_SENDGRID: {getattr(settings, "USE_SENDGRID", False)}')

    def test_smtp_connection(self, verbose=False):
        self.stdout.write(self.style.HTTP_INFO('\n[Test 1] Raw SMTP Connection Test'))

        host = getattr(settings, 'EMAIL_HOST', None)
        port = getattr(settings, 'EMAIL_PORT', 25)
        username = getattr(settings, 'EMAIL_HOST_USER', '')
        password = getattr(settings, 'EMAIL_HOST_PASSWORD', '')
        timeout = getattr(settings, 'EMAIL_TIMEOUT', 30)

        if not host:
            self.stdout.write(self.style.WARNING('  Skipped: EMAIL_HOST not configured'))
            return

        try:
            self.stdout.write(f'  Connecting to {host}:{port}...')
            server = smtplib.SMTP(host, port, timeout=timeout)

            if verbose:
                server.set_debuglevel(2)

            # EHLO
            code, msg = server.ehlo()
            self.stdout.write(f'  EHLO response: {code}')

            # Check auth methods
            if hasattr(server, 'esmtp_features'):
                auth_methods = server.esmtp_features.get('auth', '')
                self.stdout.write(f'  Supported AUTH methods: {auth_methods}')

            # Try CRAM-MD5 auth if configured
            auth_method = getattr(settings, 'EMAIL_AUTH_METHOD', '')
            if auth_method == 'CRAM-MD5' and username and password:
                self.stdout.write(f'  Attempting CRAM-MD5 auth as {username}...')

                code, response = server.docmd("AUTH", "CRAM-MD5")
                if code == 334:
                    challenge = base64.b64decode(response)
                    digest = hmac.new(
                        password.encode('utf-8'),
                        challenge,
                        hashlib.md5
                    ).hexdigest()
                    response_str = f"{username} {digest}"
                    response_b64 = base64.b64encode(
                        response_str.encode('utf-8')
                    ).decode('utf-8')

                    code, msg = server.docmd(response_b64)
                    if code == 235:
                        self.stdout.write(self.style.SUCCESS(
                            '  CRAM-MD5 authentication: SUCCESS'
                        ))
                    else:
                        self.stdout.write(self.style.ERROR(
                            f'  CRAM-MD5 authentication: FAILED ({code} {msg})'
                        ))
            elif username and password:
                # Standard login
                self.stdout.write(f'  Attempting standard login as {username}...')
                try:
                    server.login(username, password)
                    self.stdout.write(self.style.SUCCESS(
                        '  Standard authentication: SUCCESS'
                    ))
                except smtplib.SMTPAuthenticationError as e:
                    self.stdout.write(self.style.ERROR(
                        f'  Standard authentication: FAILED ({e})'
                    ))

            server.quit()
            self.stdout.write(self.style.SUCCESS('  Raw SMTP test: PASSED'))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'  Raw SMTP test: FAILED - {e}'))

    def test_django_connection(self, verbose=False):
        self.stdout.write(self.style.HTTP_INFO('\n[Test 2] Django Email Connection Test'))

        try:
            connection = get_connection(fail_silently=False)
            self.stdout.write(f'  Backend: {type(connection).__name__}')

            self.stdout.write('  Opening connection...')
            connection.open()

            if verbose and hasattr(connection, 'connection') and connection.connection:
                connection.connection.set_debuglevel(2)

            self.stdout.write(self.style.SUCCESS('  Django connection: OPENED'))

            connection.close()
            self.stdout.write(self.style.SUCCESS('  Django connection test: PASSED'))

        except Exception as e:
            self.stdout.write(self.style.ERROR(
                f'  Django connection test: FAILED - {e}'
            ))

    def send_test_email(self, to_email):
        self.stdout.write(self.style.HTTP_INFO(f'\n[Test 3] Sending Test Email to {to_email}'))

        try:
            # Test 1: Simple send_mail
            self.stdout.write('  Sending via send_mail()...')
            result = send_mail(
                subject='Railway Email Test - send_mail',
                message='This is a test email from Railway using send_mail().',
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[to_email],
                fail_silently=False,
            )
            self.stdout.write(self.style.SUCCESS(f'  send_mail(): SUCCESS (result={result})'))

            # Test 2: EmailMultiAlternatives
            self.stdout.write('  Sending via EmailMultiAlternatives...')
            email = EmailMultiAlternatives(
                subject='Railway Email Test - EmailMultiAlternatives',
                body='This is a test email from Railway using EmailMultiAlternatives.',
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[to_email],
            )
            email.attach_alternative(
                '<p>This is a <strong>test email</strong> from Railway.</p>',
                'text/html'
            )
            result = email.send(fail_silently=False)
            self.stdout.write(self.style.SUCCESS(
                f'  EmailMultiAlternatives: SUCCESS (result={result})'
            ))

            self.stdout.write(self.style.SUCCESS('\n  All test emails sent successfully!'))
            self.stdout.write(f'  Check inbox for: {to_email}')

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'  Send test: FAILED - {e}'))
            import traceback
            traceback.print_exc()
