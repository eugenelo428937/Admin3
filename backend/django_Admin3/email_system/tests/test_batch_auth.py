import hashlib
import secrets
from django.contrib.auth.models import User
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
        self.user = User.objects.create_user(
            username='authuser', email='authuser@example.com',
        )
        self.api_key = ExternalApiKey.objects.create(
            key_hash=self.key_hash,
            key_prefix=self.raw_key[:8],
            name='Test System',
            user=self.user,
        )

    def test_valid_key_authenticates(self):
        request = self.factory.get('/', HTTP_X_API_KEY=self.raw_key)
        result = self.auth.authenticate(request)
        self.assertIsNotNone(result)
        self.assertEqual(result[1], self.api_key)

    def test_valid_key_returns_user(self):
        """Authentication returns the linked user as request.user."""
        request = self.factory.get('/', HTTP_X_API_KEY=self.raw_key)
        result = self.auth.authenticate(request)
        self.assertEqual(result[0], self.user)

    def test_valid_key_no_user_returns_none_user(self):
        """Authentication returns None as user when API key has no linked user."""
        self.api_key.user = None
        self.api_key.save()
        request = self.factory.get('/', HTTP_X_API_KEY=self.raw_key)
        result = self.auth.authenticate(request)
        self.assertIsNone(result[0])
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
