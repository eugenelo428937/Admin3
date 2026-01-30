"""
Tests for email_system custom email backends.
Covers: CramMD5EmailBackend, CustomSMTPEmailBackend
"""
import smtplib
import base64
from unittest.mock import patch, MagicMock, PropertyMock
from django.test import TestCase, override_settings

from email_system.backends.custom_backends import (
    CramMD5EmailBackend,
    CustomSMTPEmailBackend,
)


class CramMD5EmailBackendTest(TestCase):
    """Tests for CramMD5EmailBackend."""

    def _make_backend(self, **kwargs):
        defaults = {
            'host': 'smtp.example.com',
            'port': 587,
            'username': 'user@example.com',
            'password': 'secret',
            'use_tls': False,
            'use_ssl': False,
            'timeout': 30,
        }
        defaults.update(kwargs)
        return CramMD5EmailBackend(**defaults)

    @patch('email_system.backends.custom_backends.smtplib.SMTP')
    def test_open_plain_connection(self, mock_smtp_cls):
        """Test opening a plain SMTP connection."""
        mock_conn = MagicMock()
        mock_smtp_cls.return_value = mock_conn
        mock_conn.docmd.side_effect = [
            (334, base64.b64encode(b'challenge123')),
            (235, b'Authentication successful'),
        ]

        backend = self._make_backend()
        result = backend.open()

        self.assertTrue(result)
        mock_smtp_cls.assert_called_once()
        mock_conn.ehlo.assert_called_once()

    @patch('email_system.backends.custom_backends.ssl.create_default_context')
    @patch('email_system.backends.custom_backends.smtplib.SMTP_SSL')
    def test_open_ssl_connection(self, mock_smtp_ssl_cls, mock_ssl_ctx):
        """Test opening an SSL SMTP connection."""
        mock_conn = MagicMock()
        mock_smtp_ssl_cls.return_value = mock_conn
        mock_conn.docmd.side_effect = [
            (334, base64.b64encode(b'challenge456')),
            (235, b'OK'),
        ]

        backend = self._make_backend(use_ssl=True)
        result = backend.open()

        self.assertTrue(result)
        mock_smtp_ssl_cls.assert_called_once()

    @patch('email_system.backends.custom_backends.smtplib.SMTP')
    def test_open_tls_connection(self, mock_smtp_cls):
        """Test opening a TLS SMTP connection."""
        mock_conn = MagicMock()
        mock_smtp_cls.return_value = mock_conn
        mock_conn.docmd.side_effect = [
            (334, base64.b64encode(b'challenge789')),
            (235, b'OK'),
        ]

        backend = self._make_backend(use_tls=True)
        result = backend.open()

        self.assertTrue(result)
        # ehlo called twice: once before starttls, once after
        self.assertEqual(mock_conn.ehlo.call_count, 2)
        mock_conn.starttls.assert_called_once()

    @patch('email_system.backends.custom_backends.smtplib.SMTP')
    def test_open_returns_false_if_already_connected(self, mock_smtp_cls):
        """Test that open returns False if already connected."""
        backend = self._make_backend()
        backend.connection = MagicMock()  # Pre-set connection
        result = backend.open()
        self.assertFalse(result)

    @patch('email_system.backends.custom_backends.smtplib.SMTP')
    def test_open_no_auth_without_credentials(self, mock_smtp_cls):
        """Test opening without credentials does not authenticate."""
        mock_conn = MagicMock()
        mock_smtp_cls.return_value = mock_conn

        backend = self._make_backend(username='', password='')
        result = backend.open()

        self.assertTrue(result)
        mock_conn.docmd.assert_not_called()

    @patch('email_system.backends.custom_backends.smtplib.SMTP')
    def test_open_no_timeout(self, mock_smtp_cls):
        """Test opening without timeout set."""
        mock_conn = MagicMock()
        mock_smtp_cls.return_value = mock_conn
        mock_conn.docmd.side_effect = [
            (334, base64.b64encode(b'challenge')),
            (235, b'OK'),
        ]

        backend = self._make_backend(timeout=None)
        result = backend.open()
        self.assertTrue(result)

    @patch('email_system.backends.custom_backends.smtplib.SMTP')
    def test_cram_md5_auth_server_rejects_auth(self, mock_smtp_cls):
        """Test CRAM-MD5 auth when server rejects AUTH CRAM-MD5."""
        mock_conn = MagicMock()
        mock_smtp_cls.return_value = mock_conn
        # Server rejects AUTH CRAM-MD5 but fallback login works
        mock_conn.docmd.return_value = (500, b'Not supported')

        backend = self._make_backend()
        result = backend.open()
        self.assertTrue(result)
        mock_conn.login.assert_called_once()

    @patch('email_system.backends.custom_backends.smtplib.SMTP')
    def test_cram_md5_auth_response_rejected(self, mock_smtp_cls):
        """Test CRAM-MD5 auth when response is rejected (code != 235)."""
        mock_conn = MagicMock()
        mock_smtp_cls.return_value = mock_conn
        mock_conn.docmd.side_effect = [
            (334, base64.b64encode(b'challenge')),
            (535, b'Auth failed'),
        ]
        # Fallback login also fails
        mock_conn.login.side_effect = smtplib.SMTPAuthenticationError(535, 'Auth failed')

        backend = self._make_backend()
        with self.assertRaises(smtplib.SMTPAuthenticationError):
            backend.open()

    @patch('email_system.backends.custom_backends.smtplib.SMTP')
    def test_cram_md5_auth_smtp_exception_fallback_success(self, mock_smtp_cls):
        """Test CRAM-MD5 falls back to login on SMTP exception."""
        mock_conn = MagicMock()
        mock_smtp_cls.return_value = mock_conn
        mock_conn.docmd.side_effect = smtplib.SMTPException('CRAM-MD5 failed')

        backend = self._make_backend()
        result = backend.open()
        self.assertTrue(result)
        mock_conn.login.assert_called_once_with('user@example.com', 'secret')

    @patch('email_system.backends.custom_backends.smtplib.SMTP')
    def test_cram_md5_auth_all_methods_fail(self, mock_smtp_cls):
        """Test when all authentication methods fail."""
        mock_conn = MagicMock()
        mock_smtp_cls.return_value = mock_conn
        mock_conn.docmd.side_effect = smtplib.SMTPException('CRAM-MD5 not supported')
        mock_conn.login.side_effect = smtplib.SMTPException('Login failed')

        backend = self._make_backend()
        with self.assertRaises(smtplib.SMTPAuthenticationError):
            backend.open()

    @patch('email_system.backends.custom_backends.smtplib.SMTP')
    def test_open_smtp_exception_closes_connection(self, mock_smtp_cls):
        """Test that SMTP exception during open closes and clears connection."""
        mock_conn = MagicMock()
        mock_smtp_cls.return_value = mock_conn
        mock_conn.ehlo.side_effect = smtplib.SMTPException('Connection failed')

        backend = self._make_backend()
        with self.assertRaises(smtplib.SMTPException):
            backend.open()

        mock_conn.close.assert_called_once()
        self.assertIsNone(backend.connection)


class CustomSMTPEmailBackendTest(TestCase):
    """Tests for CustomSMTPEmailBackend."""

    def _make_backend(self, auth_method='STANDARD', **kwargs):
        defaults = {
            'host': 'smtp.example.com',
            'port': 587,
            'username': 'user@example.com',
            'password': 'secret',
            'use_tls': False,
            'use_ssl': False,
            'timeout': 30,
        }
        defaults.update(kwargs)
        with override_settings(EMAIL_AUTH_METHOD=auth_method):
            return CustomSMTPEmailBackend(**defaults)

    @patch('email_system.backends.custom_backends.smtplib.SMTP')
    def test_open_standard_auth(self, mock_smtp_cls):
        """Test opening with standard (auto-detect) auth."""
        mock_conn = MagicMock()
        mock_smtp_cls.return_value = mock_conn

        backend = self._make_backend(auth_method='STANDARD')
        result = backend.open()

        self.assertTrue(result)
        mock_conn.login.assert_called_once_with('user@example.com', 'secret')

    @patch('email_system.backends.custom_backends.smtplib.SMTP')
    def test_open_cram_md5_auth(self, mock_smtp_cls):
        """Test opening with CRAM-MD5 auth."""
        mock_conn = MagicMock()
        mock_smtp_cls.return_value = mock_conn
        mock_conn.docmd.side_effect = [
            (334, base64.b64encode(b'challenge123')),
            (235, b'OK'),
        ]

        backend = self._make_backend(auth_method='CRAM-MD5')
        result = backend.open()

        self.assertTrue(result)

    @patch('email_system.backends.custom_backends.smtplib.SMTP')
    def test_open_plain_auth(self, mock_smtp_cls):
        """Test opening with PLAIN auth."""
        mock_conn = MagicMock()
        mock_smtp_cls.return_value = mock_conn
        mock_conn.docmd.return_value = (235, b'OK')

        backend = self._make_backend(auth_method='PLAIN')
        result = backend.open()

        self.assertTrue(result)

    @patch('email_system.backends.custom_backends.smtplib.SMTP')
    def test_open_login_auth(self, mock_smtp_cls):
        """Test opening with LOGIN auth."""
        mock_conn = MagicMock()
        mock_smtp_cls.return_value = mock_conn
        mock_conn.docmd.side_effect = [
            (334, b'Send username'),
            (334, b'Send password'),
            (235, b'OK'),
        ]

        backend = self._make_backend(auth_method='LOGIN')
        result = backend.open()

        self.assertTrue(result)

    @patch('email_system.backends.custom_backends.smtplib.SMTP')
    def test_open_returns_false_if_connected(self, mock_smtp_cls):
        """Test open returns False if already connected."""
        backend = self._make_backend()
        backend.connection = MagicMock()
        result = backend.open()
        self.assertFalse(result)

    @patch('email_system.backends.custom_backends.smtplib.SMTP')
    def test_open_no_auth_without_credentials(self, mock_smtp_cls):
        """Test no auth attempted without credentials."""
        mock_conn = MagicMock()
        mock_smtp_cls.return_value = mock_conn

        backend = self._make_backend(username='', password='')
        result = backend.open()

        self.assertTrue(result)
        mock_conn.login.assert_not_called()
        mock_conn.docmd.assert_not_called()

    @patch('email_system.backends.custom_backends.ssl.create_default_context')
    @patch('email_system.backends.custom_backends.smtplib.SMTP_SSL')
    def test_open_ssl(self, mock_smtp_ssl_cls, mock_ssl_ctx):
        """Test SSL connection."""
        mock_conn = MagicMock()
        mock_smtp_ssl_cls.return_value = mock_conn

        backend = self._make_backend(use_ssl=True)
        result = backend.open()

        self.assertTrue(result)
        mock_smtp_ssl_cls.assert_called_once()

    @patch('email_system.backends.custom_backends.smtplib.SMTP')
    def test_open_tls(self, mock_smtp_cls):
        """Test TLS connection."""
        mock_conn = MagicMock()
        mock_smtp_cls.return_value = mock_conn

        backend = self._make_backend(use_tls=True)
        result = backend.open()

        self.assertTrue(result)
        mock_conn.starttls.assert_called_once()
        self.assertEqual(mock_conn.ehlo.call_count, 2)

    @patch('email_system.backends.custom_backends.smtplib.SMTP')
    def test_open_no_timeout(self, mock_smtp_cls):
        """Test opening without timeout."""
        mock_conn = MagicMock()
        mock_smtp_cls.return_value = mock_conn

        backend = self._make_backend(timeout=None)
        result = backend.open()
        self.assertTrue(result)

    @patch('email_system.backends.custom_backends.smtplib.SMTP')
    def test_cram_md5_auth_reject(self, mock_smtp_cls):
        """Test CRAM-MD5 auth rejection."""
        mock_conn = MagicMock()
        mock_smtp_cls.return_value = mock_conn
        mock_conn.docmd.return_value = (500, b'Not supported')

        backend = self._make_backend(auth_method='CRAM-MD5')
        with self.assertRaises(smtplib.SMTPAuthenticationError):
            backend.open()

    @patch('email_system.backends.custom_backends.smtplib.SMTP')
    def test_cram_md5_auth_response_fail(self, mock_smtp_cls):
        """Test CRAM-MD5 auth response failure."""
        mock_conn = MagicMock()
        mock_smtp_cls.return_value = mock_conn
        mock_conn.docmd.side_effect = [
            (334, base64.b64encode(b'challenge')),
            (535, b'Bad credentials'),
        ]

        backend = self._make_backend(auth_method='CRAM-MD5')
        with self.assertRaises(smtplib.SMTPAuthenticationError):
            backend.open()

    @patch('email_system.backends.custom_backends.smtplib.SMTP')
    def test_plain_auth_fail(self, mock_smtp_cls):
        """Test PLAIN auth failure."""
        mock_conn = MagicMock()
        mock_smtp_cls.return_value = mock_conn
        mock_conn.docmd.return_value = (535, b'Auth failed')

        backend = self._make_backend(auth_method='PLAIN')
        with self.assertRaises(smtplib.SMTPAuthenticationError):
            backend.open()

    @patch('email_system.backends.custom_backends.smtplib.SMTP')
    def test_login_auth_initial_reject(self, mock_smtp_cls):
        """Test LOGIN auth initial rejection."""
        mock_conn = MagicMock()
        mock_smtp_cls.return_value = mock_conn
        mock_conn.docmd.return_value = (500, b'Not supported')

        backend = self._make_backend(auth_method='LOGIN')
        with self.assertRaises(smtplib.SMTPAuthenticationError):
            backend.open()

    @patch('email_system.backends.custom_backends.smtplib.SMTP')
    def test_login_auth_username_reject(self, mock_smtp_cls):
        """Test LOGIN auth username rejection."""
        mock_conn = MagicMock()
        mock_smtp_cls.return_value = mock_conn
        mock_conn.docmd.side_effect = [
            (334, b'Send username'),
            (535, b'Username rejected'),
        ]

        backend = self._make_backend(auth_method='LOGIN')
        with self.assertRaises(smtplib.SMTPAuthenticationError):
            backend.open()

    @patch('email_system.backends.custom_backends.smtplib.SMTP')
    def test_login_auth_password_reject(self, mock_smtp_cls):
        """Test LOGIN auth password rejection."""
        mock_conn = MagicMock()
        mock_smtp_cls.return_value = mock_conn
        mock_conn.docmd.side_effect = [
            (334, b'Send username'),
            (334, b'Send password'),
            (535, b'Password rejected'),
        ]

        backend = self._make_backend(auth_method='LOGIN')
        with self.assertRaises(smtplib.SMTPAuthenticationError):
            backend.open()

    @patch('email_system.backends.custom_backends.smtplib.SMTP')
    def test_unknown_auth_method_falls_back_to_standard(self, mock_smtp_cls):
        """Test that unknown auth method defaults to standard."""
        mock_conn = MagicMock()
        mock_smtp_cls.return_value = mock_conn

        backend = self._make_backend(auth_method='UNKNOWN')
        result = backend.open()

        self.assertTrue(result)
        mock_conn.login.assert_called_once()

    def test_auth_methods_dict(self):
        """Test that AUTH_METHODS contains expected methods."""
        self.assertIn('CRAM-MD5', CustomSMTPEmailBackend.AUTH_METHODS)
        self.assertIn('PLAIN', CustomSMTPEmailBackend.AUTH_METHODS)
        self.assertIn('LOGIN', CustomSMTPEmailBackend.AUTH_METHODS)
        self.assertIn('STANDARD', CustomSMTPEmailBackend.AUTH_METHODS)
