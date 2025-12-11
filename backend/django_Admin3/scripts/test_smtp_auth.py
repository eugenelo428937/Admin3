#!/usr/bin/env python
"""
SMTP Authentication Test Script
Tests connection and authentication to the internal SMTP server.
"""

import smtplib
import base64
import hmac
import hashlib
import socket


def test_smtp_connection(host, port, username, password, use_tls=False, use_ssl=False):
    """Test SMTP connection and authentication with detailed output."""

    print("=" * 60)
    print("SMTP Authentication Test")
    print("=" * 60)
    print(f"\nServer: {host}:{port}")
    print(f"Username: {username}")
    print(f"Password: {'*' * len(password)}")
    print(f"TLS: {use_tls}, SSL: {use_ssl}")
    print()

    try:
        # Step 1: Connect to SMTP server
        print("[1] Connecting to SMTP server...")
        if use_ssl:
            server = smtplib.SMTP_SSL(host, port, timeout=30)
        else:
            server = smtplib.SMTP(host, port, timeout=30)

        server.set_debuglevel(2)  # Enable verbose output
        print(f"    SUCCESS: Connected to {host}:{port}")

        # Step 2: Send EHLO
        print("\n[2] Sending EHLO...")
        code, message = server.ehlo()
        print(f"    Response: {code} {message.decode()}")

        # Check supported auth methods
        if hasattr(server, 'esmtp_features'):
            auth_methods = server.esmtp_features.get('auth', '')
            print(f"    Supported AUTH methods: {auth_methods}")

        # Step 3: STARTTLS if requested
        if use_tls:
            print("\n[3] Starting TLS...")
            server.starttls()
            server.ehlo()
            print("    SUCCESS: TLS enabled")

        # Step 4: Test different authentication methods
        print("\n[4] Testing authentication methods...")

        auth_success = False

        # Try CRAM-MD5
        print("\n    [4a] Trying CRAM-MD5 authentication...")
        try:
            auth_success = try_cram_md5_auth(server, username, password)
            if auth_success:
                print("    SUCCESS: CRAM-MD5 authentication successful!")
        except Exception as e:
            print(f"    FAILED: CRAM-MD5 - {e}")

        # Try standard login if CRAM-MD5 failed
        if not auth_success:
            print("\n    [4b] Trying standard LOGIN authentication...")
            try:
                server.login(username, password)
                auth_success = True
                print("    SUCCESS: LOGIN authentication successful!")
            except smtplib.SMTPAuthenticationError as e:
                print(f"    FAILED: LOGIN - {e.smtp_code} {e.smtp_error}")
            except Exception as e:
                print(f"    FAILED: LOGIN - {e}")

        # Try PLAIN if others failed
        if not auth_success:
            print("\n    [4c] Trying PLAIN authentication...")
            try:
                auth_success = try_plain_auth(server, username, password)
                if auth_success:
                    print("    SUCCESS: PLAIN authentication successful!")
            except Exception as e:
                print(f"    FAILED: PLAIN - {e}")

        # Step 5: Summary
        print("\n" + "=" * 60)
        if auth_success:
            print("RESULT: Authentication SUCCESSFUL")
        else:
            print("RESULT: Authentication FAILED")
            print("\nPossible issues:")
            print("  - Incorrect username or password")
            print("  - Server doesn't support the authentication method")
            print("  - IP address not whitelisted on SMTP server")
            print("  - Firewall blocking connection")
        print("=" * 60)

        server.quit()
        return auth_success

    except socket.timeout:
        print(f"\n    ERROR: Connection timed out. Server may be unreachable.")
        return False
    except socket.gaierror as e:
        print(f"\n    ERROR: DNS resolution failed: {e}")
        return False
    except ConnectionRefusedError:
        print(f"\n    ERROR: Connection refused. Check host/port and firewall.")
        return False
    except smtplib.SMTPException as e:
        print(f"\n    ERROR: SMTP error: {e}")
        return False
    except Exception as e:
        print(f"\n    ERROR: Unexpected error: {type(e).__name__}: {e}")
        return False


def try_cram_md5_auth(server, username, password):
    """Manually perform CRAM-MD5 authentication."""
    try:
        # Send AUTH CRAM-MD5 command
        code, response = server.docmd("AUTH", "CRAM-MD5")
        print(f"        AUTH CRAM-MD5 response: {code} {response}")

        if code != 334:
            raise Exception(f"Server returned {code} instead of 334")

        # Decode the challenge
        challenge = base64.b64decode(response)
        print(f"        Challenge (decoded): {challenge}")

        # Create HMAC-MD5 digest
        digest = hmac.new(
            password.encode('utf-8'),
            challenge,
            hashlib.md5
        ).hexdigest()

        # Create response: "username digest"
        response_str = f"{username} {digest}"
        response_b64 = base64.b64encode(response_str.encode('utf-8')).decode('utf-8')
        print(f"        Response (before b64): {response_str}")
        print(f"        Response (b64): {response_b64}")

        # Send the response
        code, message = server.docmd(response_b64)
        print(f"        Final response: {code} {message}")

        if code == 235:
            return True
        else:
            raise Exception(f"Authentication failed: {code} {message}")

    except smtplib.SMTPException as e:
        raise Exception(f"SMTP error: {e}")


def try_plain_auth(server, username, password):
    """Manually perform PLAIN authentication."""
    try:
        # PLAIN auth format: \0username\0password
        auth_string = f"\0{username}\0{password}"
        auth_b64 = base64.b64encode(auth_string.encode('utf-8')).decode('utf-8')

        code, response = server.docmd("AUTH", f"PLAIN {auth_b64}")
        print(f"        AUTH PLAIN response: {code} {response}")

        if code == 235:
            return True
        else:
            raise Exception(f"Authentication failed: {code} {response}")

    except smtplib.SMTPException as e:
        raise Exception(f"SMTP error: {e}")


def test_send_email(host, port, username, password, from_email, to_email, use_tls=False):
    """Test sending an actual email after authentication."""
    print("\n" + "=" * 60)
    print("Testing Email Send")
    print("=" * 60)

    try:
        server = smtplib.SMTP(host, port, timeout=30)
        server.set_debuglevel(2)
        server.ehlo()

        if use_tls:
            server.starttls()
            server.ehlo()

        # Try CRAM-MD5 first
        try:
            try_cram_md5_auth(server, username, password)
        except:
            server.login(username, password)

        # Compose simple test message
        message = f"""From: {from_email}
To: {to_email}
Subject: SMTP Test Email

This is a test email sent from the SMTP authentication test script.
If you received this, the SMTP configuration is working correctly.
"""

        print(f"\nSending test email from {from_email} to {to_email}...")
        server.sendmail(from_email, [to_email], message)
        print("SUCCESS: Test email sent!")

        server.quit()
        return True

    except Exception as e:
        print(f"FAILED: Could not send email - {e}")
        return False


if __name__ == "__main__":
    # Configuration from .env.development
    # Note: FoxPro uses 10.20.3.4 (internal) or 20.49.225.55 (Azure)
    # SMTP_HOST = "20.49.225.55"  # Azure mail server (use from external/Railway)
    SMTP_HOST = "20.49.225.55"  # Internal server (use from local dev machine)
    SMTP_PORT = 25
    SMTP_USERNAME = "acted@acted.co.uk"
    SMTP_PASSWORD = "Em*!1.$eNd-p@$$"  # Note: double $$ at the end
    USE_TLS = False
    USE_SSL = False

    FROM_EMAIL = "no-reply@acted.co.uk"
    TEST_TO_EMAIL = "eugene.lo1030@gmail.com"  # Change this for actual testing

    # Run connection and authentication test
    auth_success = test_smtp_connection(
        host=SMTP_HOST,
        port=SMTP_PORT,
        username=SMTP_USERNAME,
        password=SMTP_PASSWORD,
        use_tls=USE_TLS,
        use_ssl=USE_SSL
    )

    # Optionally test sending an email
    if auth_success:
        print("\nWould you like to send a test email? (The script will attempt this)")
        # Uncomment the line below to actually send a test email
        # test_send_email(SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD, FROM_EMAIL, TEST_TO_EMAIL, USE_TLS)
