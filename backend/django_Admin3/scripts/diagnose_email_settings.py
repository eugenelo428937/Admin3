#!/usr/bin/env python
"""
Diagnostic script to check Django email settings and test connection.
Run from the django_Admin3 directory with:
    python scripts/diagnose_email_settings.py
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
import smtplib
import socket


def print_section(title):
    print("\n" + "=" * 60)
    print(title)
    print("=" * 60)


def diagnose():
    print_section("Django Email Configuration")

    # Print all email-related settings
    email_settings = [
        'EMAIL_BACKEND',
        'EMAIL_HOST',
        'EMAIL_PORT',
        'EMAIL_USE_TLS',
        'EMAIL_USE_SSL',
        'EMAIL_HOST_USER',
        'EMAIL_HOST_PASSWORD',
        'DEFAULT_FROM_EMAIL',
        'SERVER_EMAIL',
    ]

    for setting in email_settings:
        value = getattr(settings, setting, 'NOT SET')
        if 'PASSWORD' in setting and value:
            value = '*' * len(str(value))
        print(f"  {setting}: {value}")

    # Check custom settings
    print("\n  Custom Settings:")
    custom_settings = [
        'USE_INTERNAL_SMTP',
        'USE_SENDGRID',
        'EMAIL_AUTH_METHOD',
        'EMAIL_FROM_NAME',
        'DEFAULT_REPLY_TO_EMAIL',
        'DEV_EMAIL_OVERRIDE',
        'EMAIL_BCC_MONITORING',
    ]

    for setting in custom_settings:
        value = getattr(settings, setting, 'NOT SET')
        print(f"  {setting}: {value}")

    print_section("Environment Variables")
    env_vars = [
        'DJANGO_SETTINGS_MODULE',
        'EMAIL_HOST',
        'EMAIL_PORT',
        'USE_INTERNAL_SMTP',
        'EMAIL_AUTH_METHOD',
    ]

    for var in env_vars:
        value = os.environ.get(var, 'NOT SET')
        print(f"  {var}: {value}")

    print_section("Connection Test")

    host = getattr(settings, 'EMAIL_HOST', None)
    port = getattr(settings, 'EMAIL_PORT', 25)

    if not host:
        print("  ERROR: EMAIL_HOST is not set!")
        return

    print(f"  Testing connection to {host}:{port}...")

    try:
        # Test basic socket connection first
        print(f"  [1] Testing socket connection...")
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(10)
        result = sock.connect_ex((host, port))
        sock.close()

        if result == 0:
            print(f"      SUCCESS: Port {port} is reachable")
        else:
            print(f"      FAILED: Cannot connect to {host}:{port} (error code: {result})")
            print(f"      This could be a firewall issue or wrong IP address")
            return

        # Test SMTP connection
        print(f"  [2] Testing SMTP connection...")
        server = smtplib.SMTP(host, port, timeout=30)
        server.set_debuglevel(1)
        code, msg = server.ehlo()
        print(f"      EHLO response: {code}")

        # Check auth methods
        if hasattr(server, 'esmtp_features'):
            auth = server.esmtp_features.get('auth', 'None')
            print(f"      Supported AUTH: {auth}")

        server.quit()
        print(f"      SUCCESS: SMTP connection works!")

    except socket.timeout:
        print(f"      FAILED: Connection timed out after 10 seconds")
        print(f"      The host {host} may be unreachable from this machine")
    except ConnectionRefusedError:
        print(f"      FAILED: Connection refused")
        print(f"      Check if the SMTP server is running on {host}:{port}")
    except Exception as e:
        print(f"      FAILED: {type(e).__name__}: {e}")

    print_section("Django Email Backend Test")

    try:
        from django.core.mail import get_connection

        backend = settings.EMAIL_BACKEND
        print(f"  Backend: {backend}")

        print(f"  Creating connection...")
        connection = get_connection(fail_silently=False)

        print(f"  Opening connection...")
        connection.open()

        print(f"  SUCCESS: Django email backend connection opened!")

        connection.close()
        print(f"  Connection closed.")

    except Exception as e:
        print(f"  FAILED: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()

    print_section("Direct SMTP Test (like test_smtp_auth.py)")

    try:
        print(f"  Testing direct SMTP connection to {host}:{port}...")
        server = smtplib.SMTP(host, port, timeout=30)
        server.set_debuglevel(1)
        code, msg = server.ehlo()
        print(f"  EHLO response: {code}")

        # Try CRAM-MD5 auth
        username = getattr(settings, 'EMAIL_HOST_USER', '')
        password = getattr(settings, 'EMAIL_HOST_PASSWORD', '')

        if username and password:
            print(f"  Attempting CRAM-MD5 auth as {username}...")
            code, response = server.docmd("AUTH", "CRAM-MD5")
            print(f"  AUTH response: {code}")

            if code == 334:
                import hmac
                import hashlib
                import base64

                challenge = base64.b64decode(response)
                digest = hmac.new(password.encode('utf-8'), challenge, hashlib.md5).hexdigest()
                response_str = f"{username} {digest}"
                response_b64 = base64.b64encode(response_str.encode('utf-8')).decode('utf-8')

                code, msg = server.docmd(response_b64)
                if code == 235:
                    print(f"  SUCCESS: CRAM-MD5 authentication worked!")
                else:
                    print(f"  FAILED: Auth response: {code} {msg}")

        server.quit()

    except Exception as e:
        print(f"  FAILED: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    diagnose()
