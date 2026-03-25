import hashlib
import secrets
from django.test import TestCase, RequestFactory
from rest_framework.exceptions import AuthenticationFailed
from email_system.authentication import ExternalApiKeyAuthentication
from email_system.models import ExternalApiKey


class ExternalApiKeyAuthenticationTest(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.auth = ExternalApiKeyAuthentication()
        self.raw_key = secrets.token_urlsafe(32)
        self.key_hash = hashlib.sha256(self.raw_key.encode()).hexdigest()
        self.api_key = ExternalApiKey.objects.create(
            key_hash=self.key_hash,
            key_prefix=self.raw_key[:8],
            name='Test System',
        )

    def test_valid_key_authenticates(self):
        request = self.factory.get('/', HTTP_X_API_KEY=self.raw_key)
        result = self.auth.authenticate(request)
        self.assertIsNotNone(result)
        self.assertEqual(result[1], self.api_key)

    def test_missing_header_returns_none(self):
        request = self.factory.get('/')
        result = self.auth.authenticate(request)
        self.assertIsNone(result)

    def test_invalid_key_raises(self):
        request = self.factory.get('/', HTTP_X_API_KEY='invalid-key')
        with self.assertRaises(AuthenticationFailed):
            self.auth.authenticate(request)

    def test_inactive_key_raises(self):
        self.api_key.is_active = False
        self.api_key.save()
        request = self.factory.get('/', HTTP_X_API_KEY=self.raw_key)
        with self.assertRaises(AuthenticationFailed):
            self.auth.authenticate(request)

    def test_updates_last_used_at(self):
        request = self.factory.get('/', HTTP_X_API_KEY=self.raw_key)
        self.auth.authenticate(request)
        self.api_key.refresh_from_db()
        self.assertIsNotNone(self.api_key.last_used_at)
