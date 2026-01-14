#!/usr/bin/env python
"""
Test script to send an actual email using Django's email backend.
Run from the django_Admin3 directory with:
    python scripts/test_send_email.py
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
from django.core.mail import send_mail, EmailMessage, get_connection
import smtplib


def test_simple_send():
    """Test using Django's simple send_mail function."""
    print("=" * 60)
    print("Test 1: Django send_mail()")
    print("=" * 60)

    try:
        result = send_mail(
            subject='Test Email from Django',
            message='This is a test email sent using Django send_mail().',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=['eugene.lo1030@gmail.com'],
            fail_silently=False,
        )
        print(f"SUCCESS: send_mail returned {result}")
    except Exception as e:
        print(f"FAILED: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()


def test_email_message():
    """Test using EmailMessage class."""
    print("\n" + "=" * 60)
    print("Test 2: Django EmailMessage")
    print("=" * 60)

    try:
        email = EmailMessage(
            subject='Test Email from Django EmailMessage',
            body='This is a test email sent using Django EmailMessage.',
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=['eugene.lo1030@gmail.com'],
        )
        result = email.send(fail_silently=False)
        print(f"SUCCESS: EmailMessage.send() returned {result}")
    except Exception as e:
        print(f"FAILED: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()


def test_with_debug_connection():
    """Test with a debug-enabled connection."""
    print("\n" + "=" * 60)
    print("Test 3: Manual connection with debug")
    print("=" * 60)

    try:
        # Get a connection with debug enabled
        connection = get_connection(fail_silently=False)

        # Open the connection
        print("Opening connection...")
        connection.open()

        # Enable debug mode on the underlying SMTP connection
        if hasattr(connection, 'connection') and connection.connection:
            connection.connection.set_debuglevel(2)
            print("Debug mode enabled on SMTP connection")

        # Create and send the email
        email = EmailMessage(
            subject='Test Email with Debug Connection',
            body='This is a test email with debug enabled.',
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=['eugene.lo1030@gmail.com'],
            connection=connection,
        )

        print("Sending email...")
        result = email.send(fail_silently=False)
        print(f"SUCCESS: Email sent, result = {result}")

        # Close the connection
        connection.close()
        print("Connection closed")

    except Exception as e:
        print(f"FAILED: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()


def test_raw_smtp_send():
    """Test raw SMTP sending after CRAM-MD5 auth."""
    print("\n" + "=" * 60)
    print("Test 4: Raw SMTP send (like test_smtp_auth.py)")
    print("=" * 60)

    import hmac
    import hashlib
    import base64

    host = settings.EMAIL_HOST
    port = settings.EMAIL_PORT
    username = settings.EMAIL_HOST_USER
    password = settings.EMAIL_HOST_PASSWORD
    from_email = 'no-reply@acted.co.uk'
    to_email = 'eugene.lo1030@gmail.com'

    try:
        print(f"Connecting to {host}:{port}...")
        server = smtplib.SMTP(host, port, timeout=30)
        server.set_debuglevel(2)

        # EHLO
        print("Sending EHLO...")
        server.ehlo()

        # CRAM-MD5 Auth
        print("Authenticating with CRAM-MD5...")
        code, response = server.docmd("AUTH", "CRAM-MD5")
        if code == 334:
            challenge = base64.b64decode(response)
            digest = hmac.new(password.encode('utf-8'), challenge, hashlib.md5).hexdigest()
            response_str = f"{username} {digest}"
            response_b64 = base64.b64encode(response_str.encode('utf-8')).decode('utf-8')
            code, msg = server.docmd(response_b64)
            if code == 235:
                print("Authentication successful!")
            else:
                print(f"Auth failed: {code} {msg}")
                return

        # Now try to send an email
        print("\nSending email...")

        # MAIL FROM
        print("MAIL FROM...")
        code, msg = server.mail(from_email)
        print(f"  Response: {code} {msg}")

        # RCPT TO
        print("RCPT TO...")
        code, msg = server.rcpt(to_email)
        print(f"  Response: {code} {msg}")

        # DATA
        print("DATA...")
        code, msg = server.data(b"""From: no-reply@acted.co.uk
To: eugene.lo1030@gmail.com
Subject: Raw SMTP Test

This is a test email sent using raw SMTP commands after CRAM-MD5 auth.
""")
        print(f"  Response: {code} {msg}")

        print("SUCCESS: Email sent via raw SMTP!")

        server.quit()

    except Exception as e:
        print(f"FAILED: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    print("Django Email Settings:")
    print(f"  EMAIL_BACKEND: {settings.EMAIL_BACKEND}")
    print(f"  EMAIL_HOST: {settings.EMAIL_HOST}")
    print(f"  EMAIL_PORT: {settings.EMAIL_PORT}")
    print(f"  DEFAULT_FROM_EMAIL: {settings.DEFAULT_FROM_EMAIL}")
    print()

    # Run all tests
    test_raw_smtp_send()      # Test 4: Raw SMTP (already works)
    test_simple_send()        # Test 1: Django send_mail()
    test_email_message()      # Test 2: Django EmailMessage
    test_with_debug_connection()  # Test 3: Manual connection with debug

    print("\n" + "=" * 60)
    print("All tests completed!")
    print("=" * 60)
