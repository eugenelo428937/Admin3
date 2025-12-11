#!/usr/bin/env python
"""
Test script to debug the email queue flow.
This mimics exactly what queue_service.py does to identify the 503 error source.
"""

import os
import sys

# Add the Django project to the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')

import django
django.setup()

from django.conf import settings
from django.core.mail import EmailMultiAlternatives, get_connection
from utils.email_service import EmailService


def test_email_service_simple():
    """Test 1: EmailService with simple send (no template)."""
    print("=" * 60)
    print("Test 1: EmailService simple send (no template)")
    print("=" * 60)

    try:
        email_service = EmailService()

        # Simple EmailMultiAlternatives like email_service uses
        email = EmailMultiAlternatives(
            subject='Queue Flow Test 1 - Simple',
            body='This is a plain text test email.',
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=['eugene.lo1030@gmail.com'],
            reply_to=[email_service.reply_to_email] if email_service.reply_to_email else None
        )
        email.attach_alternative('<p>This is an HTML test email.</p>', 'text/html')

        result = email.send()
        print(f"SUCCESS: email.send() returned {result}")
        return True

    except Exception as e:
        print(f"FAILED: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_email_service_with_mjml():
    """Test 2: EmailService._send_mjml_email (what queue uses)."""
    print("\n" + "=" * 60)
    print("Test 2: EmailService._send_mjml_email")
    print("=" * 60)

    try:
        email_service = EmailService()

        # Context like order confirmation
        context = {
            'customer_name': 'Test Customer',
            'first_name': 'Test',
            'last_name': 'Customer',
            'order_number': 'TEST-001',
            'order': {
                'created_at_formatted': 'January 01, 2025 at 12:00 PM',
                'subtotal': 100.00,
                'vat_amount': 20.00,
                'discount_amount': 0,
            },
            'total_amount': 120.00,
            'items': [
                {
                    'name': 'Test Product',
                    'quantity': 1,
                    'price': 100.00,
                    'total': 100.00,
                }
            ],
            'item_count': 1,
            'total_items': 1,
            'base_url': 'http://127.0.0.1:3000',
        }

        # Call the actual method queue uses
        response = email_service._send_mjml_email(
            template_name='order_confirmation',
            context=context,
            to_emails=['eugene.lo1030@gmail.com'],
            subject='Queue Flow Test 2 - MJML',
            from_email=settings.DEFAULT_FROM_EMAIL,
            enhance_outlook_compatibility=True
        )

        print(f"Response: {response}")
        if response.get('success'):
            print(f"SUCCESS: Email sent via _send_mjml_email")
            return True
        else:
            print(f"FAILED: {response.get('response_message')}")
            return False

    except Exception as e:
        print(f"FAILED: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_multiple_emails_sequential():
    """Test 3: Multiple emails in sequence (like queue processing)."""
    print("\n" + "=" * 60)
    print("Test 3: Multiple emails in sequence")
    print("=" * 60)

    try:
        success_count = 0

        for i in range(3):
            print(f"\n  Sending email {i + 1}/3...")

            email = EmailMultiAlternatives(
                subject=f'Queue Flow Test 3 - Sequential Email {i + 1}',
                body=f'This is sequential test email number {i + 1}.',
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=['eugene.lo1030@gmail.com'],
            )
            email.attach_alternative(f'<p>Sequential test email {i + 1}</p>', 'text/html')

            result = email.send()
            print(f"    Email {i + 1} result: {result}")

            if result > 0:
                success_count += 1

        print(f"\nSUCCESS: {success_count}/3 emails sent")
        return success_count == 3

    except Exception as e:
        print(f"FAILED: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_connection_reuse():
    """Test 4: Explicit connection reuse (potential issue source)."""
    print("\n" + "=" * 60)
    print("Test 4: Explicit connection reuse")
    print("=" * 60)

    try:
        connection = get_connection(fail_silently=False)

        print("Opening connection...")
        connection.open()
        print(f"Connection opened. Connection object: {type(connection.connection)}")

        # Enable debug
        if hasattr(connection, 'connection') and connection.connection:
            connection.connection.set_debuglevel(1)

        success_count = 0

        for i in range(3):
            print(f"\n  Sending email {i + 1}/3 with shared connection...")

            email = EmailMultiAlternatives(
                subject=f'Queue Flow Test 4 - Shared Connection {i + 1}',
                body=f'This is shared connection test email {i + 1}.',
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=['eugene.lo1030@gmail.com'],
                connection=connection
            )
            email.attach_alternative(f'<p>Shared connection test {i + 1}</p>', 'text/html')

            try:
                result = email.send(fail_silently=False)
                print(f"    Email {i + 1} result: {result}")
                if result > 0:
                    success_count += 1
            except Exception as send_error:
                print(f"    Email {i + 1} FAILED: {send_error}")

        print("\nClosing connection...")
        connection.close()

        print(f"SUCCESS: {success_count}/3 emails sent with shared connection")
        return success_count == 3

    except Exception as e:
        print(f"FAILED: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_cram_md5_backend_directly():
    """Test 5: Direct test of CramMD5EmailBackend."""
    print("\n" + "=" * 60)
    print("Test 5: Direct CramMD5EmailBackend test")
    print("=" * 60)

    try:
        from utils.email_backends import CramMD5EmailBackend

        # Create backend instance
        backend = CramMD5EmailBackend(
            host=settings.EMAIL_HOST,
            port=settings.EMAIL_PORT,
            username=settings.EMAIL_HOST_USER,
            password=settings.EMAIL_HOST_PASSWORD,
            use_tls=settings.EMAIL_USE_TLS,
            use_ssl=settings.EMAIL_USE_SSL,
            timeout=getattr(settings, 'EMAIL_TIMEOUT', 30),
            fail_silently=False
        )

        print(f"Backend created: {backend}")
        print(f"Host: {backend.host}:{backend.port}")

        # Open connection
        print("\nOpening connection...")
        opened = backend.open()
        print(f"Connection opened: {opened}")

        if backend.connection:
            backend.connection.set_debuglevel(2)

        # Create and send email
        email = EmailMultiAlternatives(
            subject='Queue Flow Test 5 - Direct Backend',
            body='Testing CramMD5EmailBackend directly.',
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=['eugene.lo1030@gmail.com'],
        )
        email.attach_alternative('<p>Direct backend test</p>', 'text/html')

        print("\nSending email...")
        result = backend.send_messages([email])
        print(f"Result: {result}")

        # Close connection
        print("\nClosing connection...")
        backend.close()

        if result > 0:
            print("SUCCESS: Email sent via direct backend")
            return True
        else:
            print("FAILED: No emails sent")
            return False

    except Exception as e:
        print(f"FAILED: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_backend_multiple_messages():
    """Test 6: CramMD5EmailBackend with multiple messages (like queue batch)."""
    print("\n" + "=" * 60)
    print("Test 6: CramMD5EmailBackend with multiple messages")
    print("=" * 60)

    try:
        from utils.email_backends import CramMD5EmailBackend

        backend = CramMD5EmailBackend(
            host=settings.EMAIL_HOST,
            port=settings.EMAIL_PORT,
            username=settings.EMAIL_HOST_USER,
            password=settings.EMAIL_HOST_PASSWORD,
            use_tls=settings.EMAIL_USE_TLS,
            use_ssl=settings.EMAIL_USE_SSL,
            timeout=getattr(settings, 'EMAIL_TIMEOUT', 30),
            fail_silently=False
        )

        # Create multiple emails
        emails = []
        for i in range(3):
            email = EmailMultiAlternatives(
                subject=f'Queue Flow Test 6 - Batch Message {i + 1}',
                body=f'Batch message {i + 1}.',
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=['eugene.lo1030@gmail.com'],
            )
            email.attach_alternative(f'<p>Batch message {i + 1}</p>', 'text/html')
            emails.append(email)

        print(f"Sending {len(emails)} emails in one batch...")

        # Open connection
        backend.open()
        if backend.connection:
            backend.connection.set_debuglevel(1)

        result = backend.send_messages(emails)

        backend.close()

        print(f"Result: {result} emails sent")

        if result == len(emails):
            print("SUCCESS: All batch emails sent")
            return True
        else:
            print(f"PARTIAL: Only {result}/{len(emails)} sent")
            return False

    except Exception as e:
        print(f"FAILED: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    print("Django Email Settings:")
    print(f"  EMAIL_BACKEND: {settings.EMAIL_BACKEND}")
    print(f"  EMAIL_HOST: {settings.EMAIL_HOST}")
    print(f"  EMAIL_PORT: {settings.EMAIL_PORT}")
    print(f"  EMAIL_USE_TLS: {getattr(settings, 'EMAIL_USE_TLS', False)}")
    print(f"  EMAIL_USE_SSL: {getattr(settings, 'EMAIL_USE_SSL', False)}")
    print(f"  EMAIL_TIMEOUT: {getattr(settings, 'EMAIL_TIMEOUT', 'Not set')}")
    print(f"  DEFAULT_FROM_EMAIL: {settings.DEFAULT_FROM_EMAIL}")
    print()

    results = {}

    # Run all tests
    results['test1_simple'] = test_email_service_simple()
    results['test2_mjml'] = test_email_service_with_mjml()
    results['test3_sequential'] = test_multiple_emails_sequential()
    results['test4_connection_reuse'] = test_connection_reuse()
    results['test5_direct_backend'] = test_cram_md5_backend_directly()
    results['test6_batch'] = test_backend_multiple_messages()

    print("\n" + "=" * 60)
    print("Test Summary:")
    print("=" * 60)
    for test_name, passed in results.items():
        status = "PASS" if passed else "FAIL"
        print(f"  {test_name}: {status}")

    passed_count = sum(1 for v in results.values() if v)
    print(f"\nTotal: {passed_count}/{len(results)} tests passed")
