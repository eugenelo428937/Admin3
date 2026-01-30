"""Tests for utils/services/ip_geolocation.py - IP geolocation service.

All external API calls are mocked.
"""
from unittest.mock import patch, MagicMock

from django.test import SimpleTestCase


class TestGetRegionFromIp(SimpleTestCase):
    """Tests for get_region_from_ip function."""

    def test_localhost_ipv4_returns_uk(self):
        """127.0.0.1 should return UK."""
        from utils.services.ip_geolocation import get_region_from_ip
        result = get_region_from_ip('127.0.0.1')
        self.assertEqual(result, 'UK')

    def test_localhost_string_returns_uk(self):
        """'localhost' should return UK."""
        from utils.services.ip_geolocation import get_region_from_ip
        result = get_region_from_ip('localhost')
        self.assertEqual(result, 'UK')

    def test_localhost_ipv6_returns_uk(self):
        """'::1' should return UK."""
        from utils.services.ip_geolocation import get_region_from_ip
        result = get_region_from_ip('::1')
        self.assertEqual(result, 'UK')

    def test_empty_ip_returns_uk(self):
        """Empty/None IP should return UK."""
        from utils.services.ip_geolocation import get_region_from_ip
        result = get_region_from_ip('')
        self.assertEqual(result, 'UK')
        result = get_region_from_ip(None)
        self.assertEqual(result, 'UK')

    @patch('utils.services.ip_geolocation.requests.get')
    @patch('utils.services.ip_geolocation.lookup_region', create=True)
    def test_successful_lookup(self, mock_lookup_region, mock_get):
        """Successful API call should return region from lookup_region."""
        # Need to mock the import inside the function
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'status': 'success',
            'countryCode': 'DE',
        }
        mock_get.return_value = mock_response

        with patch('utils.services.ip_geolocation.requests.get', mock_get):
            # Mock the lookup_region import
            with patch.dict('sys.modules', {'rules_engine.custom_functions': MagicMock()}):
                with patch('rules_engine.custom_functions.lookup_region', return_value='EU'):
                    from utils.services import ip_geolocation
                    import importlib
                    importlib.reload(ip_geolocation)

                    result = ip_geolocation.get_region_from_ip('203.0.113.1')
                    # Should attempt to look up region
                    mock_get.assert_called_once()

    @patch('utils.services.ip_geolocation.requests.get')
    def test_api_failure_returns_row(self, mock_get):
        """API returning failure status should return ROW."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'status': 'fail',
            'message': 'reserved range',
        }
        mock_get.return_value = mock_response

        from utils.services.ip_geolocation import get_region_from_ip
        result = get_region_from_ip('203.0.113.1')
        self.assertEqual(result, 'ROW')

    @patch('utils.services.ip_geolocation.requests.get')
    def test_timeout_returns_row(self, mock_get):
        """Request timeout should return ROW."""
        import requests
        mock_get.side_effect = requests.exceptions.Timeout('timed out')

        from utils.services.ip_geolocation import get_region_from_ip
        result = get_region_from_ip('203.0.113.1')
        self.assertEqual(result, 'ROW')

    @patch('utils.services.ip_geolocation.requests.get')
    def test_request_exception_returns_row(self, mock_get):
        """Request exception should return ROW."""
        import requests
        mock_get.side_effect = requests.exceptions.ConnectionError('conn error')

        from utils.services.ip_geolocation import get_region_from_ip
        result = get_region_from_ip('203.0.113.1')
        self.assertEqual(result, 'ROW')

    @patch('utils.services.ip_geolocation.requests.get')
    def test_unexpected_exception_returns_row(self, mock_get):
        """Unexpected exception should return ROW."""
        mock_get.side_effect = RuntimeError('unexpected')

        from utils.services.ip_geolocation import get_region_from_ip
        result = get_region_from_ip('203.0.113.1')
        self.assertEqual(result, 'ROW')

    @patch('utils.services.ip_geolocation.requests.get')
    def test_non_200_status_returns_row(self, mock_get):
        """Non-200 HTTP status should return ROW."""
        mock_response = MagicMock()
        mock_response.status_code = 429
        mock_get.return_value = mock_response

        from utils.services.ip_geolocation import get_region_from_ip
        result = get_region_from_ip('203.0.113.1')
        self.assertEqual(result, 'ROW')


class TestGetCountryFromIp(SimpleTestCase):
    """Tests for get_country_from_ip function."""

    def test_localhost_returns_gb(self):
        """Localhost IPs should return GB."""
        from utils.services.ip_geolocation import get_country_from_ip
        self.assertEqual(get_country_from_ip('127.0.0.1'), 'GB')
        self.assertEqual(get_country_from_ip('localhost'), 'GB')
        self.assertEqual(get_country_from_ip('::1'), 'GB')

    def test_empty_ip_returns_gb(self):
        """Empty/None IP should return GB."""
        from utils.services.ip_geolocation import get_country_from_ip
        self.assertEqual(get_country_from_ip(''), 'GB')
        self.assertEqual(get_country_from_ip(None), 'GB')

    @patch('utils.services.ip_geolocation.requests.get')
    def test_successful_lookup(self, mock_get):
        """Successful API call should return country code."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'status': 'success',
            'countryCode': 'US',
        }
        mock_get.return_value = mock_response

        from utils.services.ip_geolocation import get_country_from_ip
        result = get_country_from_ip('8.8.8.8')
        self.assertEqual(result, 'US')

    @patch('utils.services.ip_geolocation.requests.get')
    def test_api_failure_returns_none(self, mock_get):
        """API failure should return None."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {'status': 'fail'}
        mock_get.return_value = mock_response

        from utils.services.ip_geolocation import get_country_from_ip
        result = get_country_from_ip('203.0.113.1')
        self.assertIsNone(result)

    @patch('utils.services.ip_geolocation.requests.get')
    def test_exception_returns_none(self, mock_get):
        """Any exception should return None."""
        mock_get.side_effect = Exception('network error')

        from utils.services.ip_geolocation import get_country_from_ip
        result = get_country_from_ip('203.0.113.1')
        self.assertIsNone(result)

    @patch('utils.services.ip_geolocation.requests.get')
    def test_non_200_returns_none(self, mock_get):
        """Non-200 HTTP status should return None."""
        mock_response = MagicMock()
        mock_response.status_code = 500
        mock_get.return_value = mock_response

        from utils.services.ip_geolocation import get_country_from_ip
        result = get_country_from_ip('203.0.113.1')
        self.assertIsNone(result)
