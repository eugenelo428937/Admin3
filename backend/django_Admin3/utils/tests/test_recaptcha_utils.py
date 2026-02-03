"""Tests for utils/recaptcha_utils.py - reCAPTCHA verification utilities.

Covers:
- verify_recaptcha: empty response, no secret key, success, failure,
  network error, invalid JSON, unexpected error, IP address inclusion
- verify_recaptcha_v3: score validation, action validation, delegation
- is_recaptcha_enabled: configured / not configured
- get_client_ip: X-Forwarded-For, REMOTE_ADDR, multiple IPs
"""
from django.test import TestCase, RequestFactory, override_settings
from unittest.mock import patch, MagicMock

from utils.recaptcha_utils import (
    verify_recaptcha,
    verify_recaptcha_v3,
    is_recaptcha_enabled,
    get_client_ip,
)


class TestVerifyRecaptcha(TestCase):
    """Test verify_recaptcha function."""

    def test_UTL_empty_response_returns_failure(self):
        """Empty/None recaptcha_response should return immediate failure."""
        result = verify_recaptcha('')
        self.assertFalse(result['success'])
        self.assertIn('missing-input-response', result['error_codes'])

    def test_UTL_none_response_returns_failure(self):
        """None recaptcha_response should return failure."""
        result = verify_recaptcha(None)
        self.assertFalse(result['success'])
        self.assertIn('missing-input-response', result['error_codes'])

    @override_settings(RECAPTCHA_SECRET_KEY='')
    def test_UTL_no_secret_key_returns_failure(self):
        """Missing RECAPTCHA_SECRET_KEY should return configuration error."""
        result = verify_recaptcha('UTL_test_token')
        self.assertFalse(result['success'])
        self.assertIn('missing-secret-key', result['error_codes'])
        self.assertIn('not properly configured', result['error'])

    @override_settings(RECAPTCHA_SECRET_KEY='UTL_test_secret')
    @patch('utils.recaptcha_utils.requests.post')
    def test_UTL_successful_verification(self, mock_post):
        """Successful Google verification should return success with details."""
        mock_response = MagicMock()
        mock_response.raise_for_status = MagicMock()
        mock_response.json.return_value = {
            'success': True,
            'score': 0.9,
            'action': 'login',
            'challenge_ts': '2026-01-30T10:00:00Z',
            'hostname': 'example.com',
        }
        mock_post.return_value = mock_response

        result = verify_recaptcha('UTL_valid_token')
        self.assertTrue(result['success'])
        self.assertEqual(result['score'], 0.9)
        self.assertEqual(result['action'], 'login')
        self.assertEqual(result['challenge_ts'], '2026-01-30T10:00:00Z')
        self.assertEqual(result['hostname'], 'example.com')
        self.assertEqual(result['error_codes'], [])
        self.assertEqual(result['raw_response']['success'], True)

    @override_settings(RECAPTCHA_SECRET_KEY='UTL_test_secret')
    @patch('utils.recaptcha_utils.requests.post')
    def test_UTL_failed_verification(self, mock_post):
        """Failed Google verification should return failure with error codes."""
        mock_response = MagicMock()
        mock_response.raise_for_status = MagicMock()
        mock_response.json.return_value = {
            'success': False,
            'error-codes': ['invalid-input-response'],
        }
        mock_post.return_value = mock_response

        result = verify_recaptcha('UTL_invalid_token')
        self.assertFalse(result['success'])
        self.assertIn('invalid-input-response', result['error_codes'])

    @override_settings(RECAPTCHA_SECRET_KEY='UTL_test_secret')
    @patch('utils.recaptcha_utils.requests.post')
    def test_UTL_network_error(self, mock_post):
        """Network error should return failure with network-error code."""
        import requests
        mock_post.side_effect = requests.RequestException('Connection refused')

        result = verify_recaptcha('UTL_token')
        self.assertFalse(result['success'])
        self.assertIn('network-error', result['error_codes'])
        self.assertIn('Network error', result['error'])

    @override_settings(RECAPTCHA_SECRET_KEY='UTL_test_secret')
    @patch('utils.recaptcha_utils.requests.post')
    def test_UTL_invalid_json_response(self, mock_post):
        """Invalid JSON response should return failure."""
        mock_response = MagicMock()
        mock_response.raise_for_status = MagicMock()
        mock_response.json.side_effect = ValueError('No JSON')
        mock_post.return_value = mock_response

        result = verify_recaptcha('UTL_token')
        self.assertFalse(result['success'])
        self.assertIn('invalid-json-response', result['error_codes'])

    @override_settings(RECAPTCHA_SECRET_KEY='UTL_test_secret')
    @patch('utils.recaptcha_utils.requests.post')
    def test_UTL_unexpected_error(self, mock_post):
        """Unexpected error should return failure with unexpected-error code."""
        mock_post.side_effect = RuntimeError('Something unexpected')

        result = verify_recaptcha('UTL_token')
        self.assertFalse(result['success'])
        self.assertIn('unexpected-error', result['error_codes'])
        self.assertIn('Unexpected error', result['error'])

    @override_settings(RECAPTCHA_SECRET_KEY='UTL_test_secret')
    @patch('utils.recaptcha_utils.requests.post')
    def test_UTL_includes_ip_when_provided(self, mock_post):
        """User IP should be included in verification data when provided."""
        mock_response = MagicMock()
        mock_response.raise_for_status = MagicMock()
        mock_response.json.return_value = {'success': True}
        mock_post.return_value = mock_response

        verify_recaptcha('UTL_token', user_ip='192.168.1.100')

        call_data = mock_post.call_args
        self.assertEqual(call_data[1]['data']['remoteip'], '192.168.1.100')

    @override_settings(RECAPTCHA_SECRET_KEY='UTL_test_secret')
    @patch('utils.recaptcha_utils.requests.post')
    def test_UTL_no_ip_excludes_remoteip(self, mock_post):
        """When no IP provided, remoteip should not be in verification data."""
        mock_response = MagicMock()
        mock_response.raise_for_status = MagicMock()
        mock_response.json.return_value = {'success': True}
        mock_post.return_value = mock_response

        verify_recaptcha('UTL_token')

        call_data = mock_post.call_args
        self.assertNotIn('remoteip', call_data[1]['data'])

    @override_settings(
        RECAPTCHA_SECRET_KEY='UTL_test_secret',
        RECAPTCHA_VERIFY_URL='https://custom.recaptcha.verify/url'
    )
    @patch('utils.recaptcha_utils.requests.post')
    def test_UTL_uses_custom_verify_url(self, mock_post):
        """Should use custom verify URL from settings."""
        mock_response = MagicMock()
        mock_response.raise_for_status = MagicMock()
        mock_response.json.return_value = {'success': True}
        mock_post.return_value = mock_response

        verify_recaptcha('UTL_token')

        call_url = mock_post.call_args[0][0]
        self.assertEqual(call_url, 'https://custom.recaptcha.verify/url')

    @override_settings(RECAPTCHA_SECRET_KEY='UTL_test_secret')
    @patch('utils.recaptcha_utils.requests.post')
    def test_UTL_http_error_treated_as_request_exception(self, mock_post):
        """HTTP errors (4xx/5xx) should be caught as RequestException."""
        import requests
        mock_response = MagicMock()
        mock_response.raise_for_status.side_effect = requests.HTTPError('403 Forbidden')
        mock_post.return_value = mock_response

        result = verify_recaptcha('UTL_token')
        self.assertFalse(result['success'])
        self.assertIn('network-error', result['error_codes'])


class TestVerifyRecaptchaV3(TestCase):
    """Test verify_recaptcha_v3 function."""

    @override_settings(RECAPTCHA_SECRET_KEY='UTL_test_secret')
    @patch('utils.recaptcha_utils.requests.post')
    def test_UTL_v3_passes_base_verification(self, mock_post):
        """v3 should delegate to verify_recaptcha first."""
        mock_response = MagicMock()
        mock_response.raise_for_status = MagicMock()
        mock_response.json.return_value = {
            'success': True,
            'score': 0.9,
            'action': 'login',
        }
        mock_post.return_value = mock_response

        result = verify_recaptcha_v3('UTL_token', expected_action='login', min_score=0.5)
        self.assertTrue(result['success'])

    @override_settings(RECAPTCHA_SECRET_KEY='UTL_test_secret')
    @patch('utils.recaptcha_utils.requests.post')
    def test_UTL_v3_fails_on_low_score(self, mock_post):
        """Score below threshold should fail."""
        mock_response = MagicMock()
        mock_response.raise_for_status = MagicMock()
        mock_response.json.return_value = {
            'success': True,
            'score': 0.2,
            'action': 'login',
        }
        mock_post.return_value = mock_response

        result = verify_recaptcha_v3('UTL_token', min_score=0.5)
        self.assertFalse(result['success'])
        self.assertIn('score-too-low', result['error_codes'])
        self.assertEqual(result['score'], 0.2)
        self.assertEqual(result['min_score'], 0.5)

    @override_settings(RECAPTCHA_SECRET_KEY='UTL_test_secret')
    @patch('utils.recaptcha_utils.requests.post')
    def test_UTL_v3_fails_on_action_mismatch(self, mock_post):
        """Mismatched action should fail."""
        mock_response = MagicMock()
        mock_response.raise_for_status = MagicMock()
        mock_response.json.return_value = {
            'success': True,
            'score': 0.9,
            'action': 'register',
        }
        mock_post.return_value = mock_response

        result = verify_recaptcha_v3('UTL_token', expected_action='login', min_score=0.5)
        self.assertFalse(result['success'])
        self.assertIn('action-mismatch', result['error_codes'])
        self.assertEqual(result['action'], 'register')
        self.assertEqual(result['expected_action'], 'login')

    def test_UTL_v3_returns_base_failure(self):
        """If base verify_recaptcha fails, v3 should return that failure."""
        result = verify_recaptcha_v3('')
        self.assertFalse(result['success'])
        self.assertIn('missing-input-response', result['error_codes'])

    @override_settings(RECAPTCHA_SECRET_KEY='UTL_test_secret')
    @patch('utils.recaptcha_utils.requests.post')
    def test_UTL_v3_none_score_passes(self, mock_post):
        """If score is None (v2 response), score check should be skipped."""
        mock_response = MagicMock()
        mock_response.raise_for_status = MagicMock()
        mock_response.json.return_value = {
            'success': True,
            'score': None,
            'action': None,
        }
        mock_post.return_value = mock_response

        result = verify_recaptcha_v3('UTL_token', min_score=0.5)
        self.assertTrue(result['success'])

    @override_settings(RECAPTCHA_SECRET_KEY='UTL_test_secret')
    @patch('utils.recaptcha_utils.requests.post')
    def test_UTL_v3_no_expected_action_skips_check(self, mock_post):
        """If no expected_action specified, action check should be skipped."""
        mock_response = MagicMock()
        mock_response.raise_for_status = MagicMock()
        mock_response.json.return_value = {
            'success': True,
            'score': 0.9,
            'action': 'any_action',
        }
        mock_post.return_value = mock_response

        result = verify_recaptcha_v3('UTL_token', expected_action=None, min_score=0.5)
        self.assertTrue(result['success'])


class TestIsRecaptchaEnabled(TestCase):
    """Test is_recaptcha_enabled function."""

    @override_settings(RECAPTCHA_SITE_KEY='UTL_site_key', RECAPTCHA_SECRET_KEY='UTL_secret_key')
    def test_UTL_enabled_when_both_keys_set(self):
        """Should return True when both keys are configured."""
        self.assertTrue(is_recaptcha_enabled())

    @override_settings(RECAPTCHA_SITE_KEY='', RECAPTCHA_SECRET_KEY='UTL_secret_key')
    def test_UTL_disabled_when_site_key_missing(self):
        """Should return False when site key is missing."""
        self.assertFalse(is_recaptcha_enabled())

    @override_settings(RECAPTCHA_SITE_KEY='UTL_site_key', RECAPTCHA_SECRET_KEY='')
    def test_UTL_disabled_when_secret_key_missing(self):
        """Should return False when secret key is missing."""
        self.assertFalse(is_recaptcha_enabled())

    @override_settings(RECAPTCHA_SITE_KEY='', RECAPTCHA_SECRET_KEY='')
    def test_UTL_disabled_when_both_keys_missing(self):
        """Should return False when both keys are missing."""
        self.assertFalse(is_recaptcha_enabled())


class TestGetClientIP(TestCase):
    """Test get_client_ip function."""

    def setUp(self):
        self.factory = RequestFactory()

    def test_UTL_from_x_forwarded_for(self):
        """Should extract IP from X-Forwarded-For header."""
        request = self.factory.get('/')
        request.META['HTTP_X_FORWARDED_FOR'] = '192.168.1.1'
        ip = get_client_ip(request)
        self.assertEqual(ip, '192.168.1.1')

    def test_UTL_from_x_forwarded_for_multiple_ips(self):
        """Should return the first IP from X-Forwarded-For (client IP)."""
        request = self.factory.get('/')
        request.META['HTTP_X_FORWARDED_FOR'] = '10.0.0.1, 192.168.1.1, 172.16.0.1'
        ip = get_client_ip(request)
        self.assertEqual(ip, '10.0.0.1')

    def test_UTL_from_x_forwarded_for_strips_whitespace(self):
        """Should strip whitespace from extracted IP."""
        request = self.factory.get('/')
        request.META['HTTP_X_FORWARDED_FOR'] = '  10.0.0.1  , 192.168.1.1'
        ip = get_client_ip(request)
        self.assertEqual(ip, '10.0.0.1')

    def test_UTL_from_remote_addr_fallback(self):
        """Should fall back to REMOTE_ADDR when X-Forwarded-For is not set."""
        request = self.factory.get('/')
        request.META.pop('HTTP_X_FORWARDED_FOR', None)
        request.META['REMOTE_ADDR'] = '127.0.0.1'
        ip = get_client_ip(request)
        self.assertEqual(ip, '127.0.0.1')

    def test_UTL_returns_none_when_no_ip_available(self):
        """Should return None when neither header is available."""
        request = self.factory.get('/')
        request.META.pop('HTTP_X_FORWARDED_FOR', None)
        request.META.pop('REMOTE_ADDR', None)
        ip = get_client_ip(request)
        self.assertIsNone(ip)
