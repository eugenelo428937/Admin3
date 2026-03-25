import secrets
from unittest.mock import patch
from django.test import TestCase, override_settings
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from core_auth.models import MachineToken
from core_auth.utils import hash_token


@override_settings(MACHINE_LOGIN_TRUSTED_SUBNETS=['7.32.0.0/16'])
class MachineLoginEndpointTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = '/api/auth/machine-login/'
        self.user = User.objects.create_superuser(
            username='admin_ml',
            email='admin@bpp.com',
            password='testpass123'
        )
        # Create a valid machine token
        self.raw_token = secrets.token_hex(32)
        self.machine_token = MachineToken.objects.create(
            token_hash=hash_token(self.raw_token),
            user=self.user,
            machine_name='LAPTOP-TEST01'
        )

    @patch('core_auth.views.get_client_ip', return_value='7.32.3.4')
    def test_valid_token_returns_jwt(self, mock_ip):
        """Valid token + trusted IP returns JWT tokens and user data."""
        response = self.client.post(self.url, {
            'machine_token': self.raw_token
        }, format='json')

        self.assertEqual(response.status_code, 200)
        self.assertIn('token', response.data)
        self.assertIn('refresh', response.data)
        self.assertIn('user', response.data)
        self.assertEqual(response.data['user']['email'], 'admin@bpp.com')
        self.assertTrue(response.data['user']['is_superuser'])

    @patch('core_auth.views.get_client_ip', return_value='7.32.3.4')
    def test_valid_login_updates_last_used(self, mock_ip):
        """Successful login updates last_used_at."""
        self.assertIsNone(self.machine_token.last_used_at)
        self.client.post(self.url, {
            'machine_token': self.raw_token
        }, format='json')
        self.machine_token.refresh_from_db()
        self.assertIsNotNone(self.machine_token.last_used_at)

    @patch('core_auth.views.get_client_ip', return_value='7.32.3.4')
    def test_invalid_token_returns_403(self, mock_ip):
        """Invalid token returns 403 with generic message."""
        response = self.client.post(self.url, {
            'machine_token': 'invalid_token_value'
        }, format='json')
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.data['error'], 'Machine login failed')

    @patch('core_auth.views.get_client_ip', return_value='7.32.3.4')
    def test_missing_token_returns_403(self, mock_ip):
        """Missing token returns 403 with generic message."""
        response = self.client.post(self.url, {}, format='json')
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.data['error'], 'Machine login failed')

    @patch('core_auth.views.get_client_ip', return_value='7.32.3.4')
    def test_inactive_token_returns_403(self, mock_ip):
        """Inactive (revoked) token returns 403."""
        self.machine_token.is_active = False
        self.machine_token.save()
        response = self.client.post(self.url, {
            'machine_token': self.raw_token
        }, format='json')
        self.assertEqual(response.status_code, 403)

    @patch('core_auth.views.get_client_ip', return_value='192.168.1.1')
    def test_untrusted_ip_returns_403(self, mock_ip):
        """Request from untrusted IP returns 403."""
        response = self.client.post(self.url, {
            'machine_token': self.raw_token
        }, format='json')
        self.assertEqual(response.status_code, 403)

    @patch('core_auth.views.get_client_ip', return_value='7.32.3.4')
    def test_non_superuser_returns_403(self, mock_ip):
        """Token linked to non-superuser returns 403."""
        regular_user = User.objects.create_user(
            username='regular',
            email='regular@bpp.com',
            password='testpass123'
        )
        raw = secrets.token_hex(32)
        MachineToken.objects.create(
            token_hash=hash_token(raw),
            user=regular_user,
            machine_name='LAPTOP-REG'
        )
        response = self.client.post(self.url, {
            'machine_token': raw
        }, format='json')
        self.assertEqual(response.status_code, 403)

    @patch('core_auth.views.get_client_ip', return_value='7.32.3.4')
    def test_inactive_user_returns_403(self, mock_ip):
        """Token linked to inactive user returns 403."""
        self.user.is_active = False
        self.user.save()
        response = self.client.post(self.url, {
            'machine_token': self.raw_token
        }, format='json')
        self.assertEqual(response.status_code, 403)

    @patch('core_auth.views.get_client_ip', return_value='7.32.3.4')
    def test_all_failures_return_same_body(self, mock_ip):
        """All failure modes return identical response body."""
        r1 = self.client.post(self.url, {'machine_token': 'wrong'}, format='json')
        r2 = self.client.post(self.url, {}, format='json')
        self.assertEqual(r1.data, r2.data)
        self.assertEqual(r1.data, {'error': 'Machine login failed'})

    @patch('core_auth.views.get_client_ip', return_value='7.32.3.4')
    def test_response_shape_matches_login(self, mock_ip):
        """Response has same top-level keys as /api/auth/login/."""
        response = self.client.post(self.url, {
            'machine_token': self.raw_token
        }, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertIn('token', response.data)
        self.assertIn('refresh', response.data)
        self.assertIn('user', response.data)
        self.assertIn('is_superuser', response.data['user'])
