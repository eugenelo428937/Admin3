"""
Custom Email Backends for Django

This module provides custom SMTP email backends with specific authentication methods.
"""

import smtplib
import ssl
import hmac
import hashlib
import base64
from django.core.mail.backends.smtp import EmailBackend
from django.conf import settings


class CramMD5EmailBackend(EmailBackend):
    """
    Custom SMTP email backend that forces CRAM-MD5 authentication.

    CRAM-MD5 is a challenge-response authentication mechanism that avoids
    sending the password in plain text over the network.

    Usage:
        Set in settings.py:
        EMAIL_BACKEND = 'utils.email_backends.CramMD5EmailBackend'
    """

    def open(self):
        """
        Opens a connection to the mail server with CRAM-MD5 authentication.
        """
        if self.connection:
            return False

        connection_params = {}

        if self.timeout is not None:
            connection_params['timeout'] = self.timeout

        try:
            if self.use_ssl:
                connection_params['context'] = ssl.create_default_context()
                self.connection = smtplib.SMTP_SSL(
                    self.host,
                    self.port,
                    **connection_params
                )
            else:
                self.connection = smtplib.SMTP(
                    self.host,
                    self.port,
                    **connection_params
                )

            # Enable debugging - uncomment to see SMTP conversation
            # self.connection.set_debuglevel(2)

            # Send EHLO to get capabilities
            self.connection.ehlo()

            # Use STARTTLS if configured
            if self.use_tls:
                context = ssl.create_default_context()
                self.connection.starttls(context=context)
                self.connection.ehlo()

            # Authenticate using CRAM-MD5
            if self.username and self.password:
                self._cram_md5_auth(self.username, self.password)

            return True

        except smtplib.SMTPException:
            if self.connection:
                self.connection.close()
            self.connection = None
            raise

    def _cram_md5_auth(self, username, password):
        """
        Perform CRAM-MD5 authentication manually.

        CRAM-MD5 works as follows:
        1. Client sends AUTH CRAM-MD5
        2. Server responds with a base64-encoded challenge
        3. Client computes HMAC-MD5(password, challenge)
        4. Client sends base64(username + space + hex_digest)
        """
        try:
            # Start CRAM-MD5 authentication
            code, response = self.connection.docmd("AUTH", "CRAM-MD5")

            if code != 334:
                raise smtplib.SMTPAuthenticationError(
                    code,
                    f"Server did not accept AUTH CRAM-MD5: {response}"
                )

            # Decode the challenge from base64
            challenge = base64.b64decode(response)

            # Compute HMAC-MD5 digest
            digest = hmac.new(
                password.encode('utf-8'),
                challenge,
                hashlib.md5
            ).hexdigest()

            # Construct the response: username + space + hex_digest
            response_str = f"{username} {digest}"
            response_b64 = base64.b64encode(response_str.encode('utf-8')).decode('ascii')

            # Send the response
            code, msg = self.connection.docmd(response_b64)

            if code != 235:
                raise smtplib.SMTPAuthenticationError(
                    code,
                    f"CRAM-MD5 authentication failed: {msg}"
                )

        except smtplib.SMTPException as e:
            # If CRAM-MD5 fails, try standard login as fallback
            try:
                self.connection.login(username, password)
            except smtplib.SMTPException:
                raise smtplib.SMTPAuthenticationError(
                    -1,
                    f"All authentication methods failed. Original error: {e}"
                )


class CustomSMTPEmailBackend(EmailBackend):
    """
    Enhanced SMTP email backend with configurable authentication methods.

    Supports:
    - CRAM-MD5
    - PLAIN
    - LOGIN
    - Standard (auto-detect)

    Usage:
        Set in settings.py:
        EMAIL_BACKEND = 'utils.email_backends.CustomSMTPEmailBackend'
        EMAIL_AUTH_METHOD = 'CRAM-MD5'  # or 'PLAIN', 'LOGIN', 'STANDARD'
    """

    AUTH_METHODS = {
        'CRAM-MD5': '_auth_cram_md5',
        'PLAIN': '_auth_plain',
        'LOGIN': '_auth_login',
        'STANDARD': '_auth_standard',
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.auth_method = getattr(settings, 'EMAIL_AUTH_METHOD', 'STANDARD').upper()

    def open(self):
        """
        Opens a connection with the specified authentication method.
        """
        if self.connection:
            return False

        connection_params = {}

        if self.timeout is not None:
            connection_params['timeout'] = self.timeout

        if self.use_ssl:
            connection_params['context'] = ssl.create_default_context()
            self.connection = smtplib.SMTP_SSL(
                self.host,
                self.port,
                **connection_params
            )
        else:
            self.connection = smtplib.SMTP(
                self.host,
                self.port,
                **connection_params
            )

        self.connection.ehlo()

        if self.use_tls:
            context = ssl.create_default_context()
            self.connection.starttls(context=context)
            self.connection.ehlo()

        if self.username and self.password:
            auth_method = self.AUTH_METHODS.get(self.auth_method, '_auth_standard')
            getattr(self, auth_method)()

        return True

    def _auth_cram_md5(self):
        """CRAM-MD5 authentication."""
        code, response = self.connection.docmd("AUTH", "CRAM-MD5")

        if code != 334:
            raise smtplib.SMTPAuthenticationError(code, response)

        challenge = base64.b64decode(response)
        digest = hmac.new(
            self.password.encode('utf-8'),
            challenge,
            hashlib.md5
        ).hexdigest()

        response_str = f"{self.username} {digest}"
        response_b64 = base64.b64encode(response_str.encode('utf-8')).decode('ascii')

        code, msg = self.connection.docmd(response_b64)

        if code != 235:
            raise smtplib.SMTPAuthenticationError(code, msg)

    def _auth_plain(self):
        """PLAIN authentication."""
        auth_string = f"\x00{self.username}\x00{self.password}"
        auth_b64 = base64.b64encode(auth_string.encode('utf-8')).decode('ascii')

        code, msg = self.connection.docmd("AUTH", f"PLAIN {auth_b64}")

        if code != 235:
            raise smtplib.SMTPAuthenticationError(code, msg)

    def _auth_login(self):
        """LOGIN authentication."""
        code, _ = self.connection.docmd("AUTH", "LOGIN")

        if code != 334:
            raise smtplib.SMTPAuthenticationError(code, "AUTH LOGIN not supported")

        username_b64 = base64.b64encode(self.username.encode('utf-8')).decode('ascii')
        code, _ = self.connection.docmd(username_b64)

        if code != 334:
            raise smtplib.SMTPAuthenticationError(code, "Username rejected")

        password_b64 = base64.b64encode(self.password.encode('utf-8')).decode('ascii')
        code, msg = self.connection.docmd(password_b64)

        if code != 235:
            raise smtplib.SMTPAuthenticationError(code, msg)

    def _auth_standard(self):
        """Standard authentication (auto-detect method)."""
        self.connection.login(self.username, self.password)
