"""
Unit Tests for PostcoderService

Tests the Postcoder.com API integration service including:
- Address lookup functionality
- Response transformation to getaddress.io format
- Error handling (timeouts, invalid postcodes, API errors)
- Response time tracking
"""

import unittest
from unittest.mock import patch, Mock, MagicMock
import requests
from django.test import TestCase
from django.conf import settings

from utils.services.postcoder_service import PostcoderService


class PostcoderServiceTestCase(TestCase):
    """Test cases for PostcoderService class"""

    def setUp(self):
        """Set up test fixtures"""
        self.api_key = "test_api_key"
        self.service = PostcoderService(api_key=self.api_key)
        self.test_postcode = "SW1A 1AA"
        self.test_postcode_clean = "SW1A1AA"

    # ==================== lookup_address Tests ====================

    @patch('utils.services.postcoder_service.requests.get')
    def test_lookup_address_success(self, mock_get):
        """Test successful address lookup returns addresses"""
        # Mock successful API response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = [
            {
                "postcode": "SW1A1AA",
                "summaryline": "10 Downing Street, Westminster, London",
                "organisation": "",
                "buildingname": "",
                "number": "10",
                "premise": "10",
                "street": "Downing Street",
                "dependentlocality": "",
                "posttown": "LONDON",
                "county": "Greater London",
                "latitude": 51.503396,
                "longitude": -0.127784
            }
        ]
        mock_get.return_value = mock_response

        # Execute
        result = self.service.lookup_address(self.test_postcode)

        # Verify
        self.assertIsInstance(result, list)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]['postcode'], 'SW1A1AA')
        self.assertEqual(result[0]['street'], 'Downing Street')

        # Verify API call
        mock_get.assert_called_once()
        call_url = mock_get.call_args[0][0]
        self.assertIn(self.test_postcode_clean, call_url)

    @patch('utils.services.postcoder_service.requests.get')
    def test_lookup_address_empty_postcode(self, mock_get):
        """Test empty postcode raises ValueError"""
        with self.assertRaises(ValueError) as context:
            self.service.lookup_address("")

        self.assertIn("Postcode is required", str(context.exception))
        mock_get.assert_not_called()

    @patch('utils.services.postcoder_service.requests.get')
    def test_lookup_address_none_postcode(self, mock_get):
        """Test None postcode raises ValueError"""
        with self.assertRaises(ValueError) as context:
            self.service.lookup_address(None)

        self.assertIn("Postcode is required", str(context.exception))
        mock_get.assert_not_called()

    @patch.object(settings, 'POSTCODER_API_KEY', '')
    def test_lookup_address_missing_api_key(self):
        """Test missing API key raises ValueError"""
        service_no_key = PostcoderService(api_key="")

        with self.assertRaises(ValueError) as context:
            service_no_key.lookup_address(self.test_postcode)

        self.assertIn("POSTCODER_API_KEY not configured", str(context.exception))

    @patch('utils.services.postcoder_service.requests.get')
    def test_lookup_address_timeout(self, mock_get):
        """Test API timeout raises TimeoutError"""
        mock_get.side_effect = requests.Timeout("Request timed out")

        with self.assertRaises(TimeoutError) as context:
            self.service.lookup_address(self.test_postcode)

        self.assertIn("timed out", str(context.exception))

    @patch('utils.services.postcoder_service.requests.get')
    def test_lookup_address_404_returns_empty_list(self, mock_get):
        """Test HTTP 404 returns empty list (no addresses found)"""
        mock_response = Mock()
        mock_response.status_code = 404
        mock_response.raise_for_status.side_effect = requests.HTTPError(response=mock_response)
        mock_get.return_value = mock_response

        result = self.service.lookup_address(self.test_postcode)

        self.assertIsInstance(result, list)
        self.assertEqual(len(result), 0)

    @patch('utils.services.postcoder_service.requests.get')
    def test_lookup_address_http_error_non_404(self, mock_get):
        """Test HTTP error (non-404) raises exception"""
        mock_response = Mock()
        mock_response.status_code = 500
        mock_response.raise_for_status.side_effect = requests.HTTPError(response=mock_response)
        mock_get.return_value = mock_response

        with self.assertRaises(requests.HTTPError):
            self.service.lookup_address(self.test_postcode)

    @patch('utils.services.postcoder_service.requests.get')
    def test_lookup_address_api_error_response(self, mock_get):
        """Test API returns error dict raises RequestException"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"error": "Invalid API key"}
        mock_get.return_value = mock_response

        with self.assertRaises(requests.RequestException) as context:
            self.service.lookup_address(self.test_postcode)

        self.assertIn("Invalid API key", str(context.exception))

    @patch('utils.services.postcoder_service.requests.get')
    def test_lookup_address_cleans_postcode(self, mock_get):
        """Test postcode is cleaned (spaces removed, uppercase)"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = []
        mock_get.return_value = mock_response

        # Test with spaces and lowercase
        self.service.lookup_address("sw1a 1aa")

        # Verify cleaned postcode in URL
        call_url = mock_get.call_args[0][0]
        self.assertIn("SW1A1AA", call_url)
        self.assertNotIn(" ", call_url.split('/')[-1])

    # ==================== transform_to_getaddress_format Tests ====================

    def test_transform_valid_response(self):
        """Test transformation of valid Postcoder response"""
        postcoder_response = [
            {
                "postcode": "SW1A1AA",
                "summaryline": "10 Downing Street, Westminster, London",
                "organisation": "",
                "buildingname": "",
                "number": "10",
                "premise": "10",
                "street": "Downing Street",
                "dependentlocality": "Westminster",
                "posttown": "LONDON",
                "county": "Greater London",
                "latitude": 51.503396,
                "longitude": -0.127784
            }
        ]

        result = self.service.transform_to_getaddress_format(postcoder_response)

        # Verify structure
        self.assertIn("addresses", result)
        self.assertIsInstance(result["addresses"], list)
        self.assertEqual(len(result["addresses"]), 1)

        # Verify transformed address
        address = result["addresses"][0]
        self.assertEqual(address["postcode"], "SW1A 1AA")  # Formatted with space
        self.assertEqual(address["line_1"], "10 Downing Street")
        self.assertEqual(address["line_3"], "Westminster")
        self.assertEqual(address["town_or_city"], "London")  # Title case
        self.assertEqual(address["county"], "Greater London")
        self.assertEqual(address["country"], "England")
        self.assertEqual(address["latitude"], 51.503396)
        self.assertEqual(address["longitude"], -0.127784)

    def test_transform_empty_list(self):
        """Test transformation of empty list returns empty addresses"""
        result = self.service.transform_to_getaddress_format([])

        self.assertEqual(result, {"addresses": []})

    def test_transform_non_list_input(self):
        """Test non-list input returns empty addresses"""
        # Test with dict
        result = self.service.transform_to_getaddress_format({"error": "Invalid"})
        self.assertEqual(result, {"addresses": []})

        # Test with None
        result = self.service.transform_to_getaddress_format(None)
        self.assertEqual(result, {"addresses": []})

        # Test with string
        result = self.service.transform_to_getaddress_format("invalid")
        self.assertEqual(result, {"addresses": []})

    def test_transform_postcode_formatting(self):
        """Test postcode formatting adds space correctly"""
        postcoder_response = [
            {
                "postcode": "OX449EL",
                "number": "1",
                "street": "Test Street",
                "posttown": "OXFORD",
                "county": "Oxfordshire",
                "latitude": 51.7,
                "longitude": -1.2
            }
        ]

        result = self.service.transform_to_getaddress_format(postcoder_response)
        address = result["addresses"][0]

        # Verify space added: "OX449EL" -> "OX44 9EL"
        self.assertEqual(address["postcode"], "OX44 9EL")

    def test_transform_short_postcode_no_formatting(self):
        """Test short postcode (< 3 chars) not formatted"""
        postcoder_response = [
            {
                "postcode": "AB",
                "number": "1",
                "street": "Test Street",
                "posttown": "TOWN",
                "county": "County",
                "latitude": 50.0,
                "longitude": -1.0
            }
        ]

        result = self.service.transform_to_getaddress_format(postcoder_response)
        address = result["addresses"][0]

        # Verify no space added to short postcode
        self.assertEqual(address["postcode"], "AB")

    def test_transform_building_name_priority(self):
        """Test building name takes priority over number"""
        # With building name
        postcoder_response = [
            {
                "postcode": "SW1A1AA",
                "buildingname": "Big Ben House",
                "number": "10",
                "street": "Parliament Square",
                "posttown": "LONDON",
                "county": "Greater London",
                "latitude": 51.5,
                "longitude": -0.1
            }
        ]

        result = self.service.transform_to_getaddress_format(postcoder_response)
        address = result["addresses"][0]

        # Building name should be in line_1, not number
        self.assertEqual(address["line_1"], "Big Ben House Parliament Square")

    def test_transform_number_when_no_building_name(self):
        """Test number used when no building name"""
        postcoder_response = [
            {
                "postcode": "SW1A1AA",
                "buildingname": "",
                "number": "10",
                "street": "Downing Street",
                "posttown": "LONDON",
                "county": "Greater London",
                "latitude": 51.5,
                "longitude": -0.1
            }
        ]

        result = self.service.transform_to_getaddress_format(postcoder_response)
        address = result["addresses"][0]

        self.assertEqual(address["line_1"], "10 Downing Street")

    def test_transform_premise_fallback(self):
        """Test premise used when no number or building name"""
        postcoder_response = [
            {
                "postcode": "SW1A1AA",
                "buildingname": "",
                "number": "",
                "premise": "Unit A",
                "street": "High Street",
                "posttown": "LONDON",
                "county": "Greater London",
                "latitude": 51.5,
                "longitude": -0.1
            }
        ]

        result = self.service.transform_to_getaddress_format(postcoder_response)
        address = result["addresses"][0]

        self.assertEqual(address["line_1"], "Unit A High Street")

    def test_transform_town_title_case(self):
        """Test post_town converted to title case"""
        postcoder_response = [
            {
                "postcode": "OX449EL",
                "number": "1",
                "street": "Street",
                "posttown": "OXFORD",
                "county": "Oxfordshire",
                "latitude": 51.7,
                "longitude": -1.2
            }
        ]

        result = self.service.transform_to_getaddress_format(postcoder_response)
        address = result["addresses"][0]

        # OXFORD -> Oxford
        self.assertEqual(address["town_or_city"], "Oxford")

    def test_transform_multiple_addresses(self):
        """Test transformation of multiple addresses"""
        postcoder_response = [
            {
                "postcode": "SW1A1AA",
                "number": "10",
                "street": "Downing Street",
                "posttown": "LONDON",
                "county": "Greater London",
                "latitude": 51.5,
                "longitude": -0.1
            },
            {
                "postcode": "SW1A1AA",
                "number": "11",
                "street": "Downing Street",
                "posttown": "LONDON",
                "county": "Greater London",
                "latitude": 51.5,
                "longitude": -0.1
            }
        ]

        result = self.service.transform_to_getaddress_format(postcoder_response)

        self.assertEqual(len(result["addresses"]), 2)
        self.assertEqual(result["addresses"][0]["line_1"], "10 Downing Street")
        self.assertEqual(result["addresses"][1]["line_1"], "11 Downing Street")

    def test_transform_malformed_item_skipped(self):
        """Test malformed address item is skipped gracefully"""
        postcoder_response = [
            {
                "postcode": "SW1A1AA",
                "number": "10",
                "street": "Downing Street",
                "posttown": "LONDON",
                "county": "Greater London",
                "latitude": 51.5,
                "longitude": -0.1
            },
            None,  # Malformed item
            {
                "postcode": "SW1A1AA",
                "number": "11",
                "street": "Downing Street",
                "posttown": "LONDON",
                "county": "Greater London",
                "latitude": 51.5,
                "longitude": -0.1
            }
        ]

        result = self.service.transform_to_getaddress_format(postcoder_response)

        # Only 2 valid addresses (None skipped)
        self.assertEqual(len(result["addresses"]), 2)

    def test_transform_missing_optional_fields(self):
        """Test transformation works with missing optional fields"""
        postcoder_response = [
            {
                "postcode": "TEST123",
                "street": "Main Street",
                # Missing: number, premise, buildingname, dependentlocality, posttown, county
            }
        ]

        result = self.service.transform_to_getaddress_format(postcoder_response)

        # Should still transform successfully with defaults
        self.assertEqual(len(result["addresses"]), 1)
        address = result["addresses"][0]
        self.assertEqual(address["line_1"], "Main Street")
        self.assertEqual(address["line_3"], "")
        self.assertEqual(address["town_or_city"], "")
        self.assertEqual(address["county"], "")

    # ==================== execute_lookup Tests ====================

    @patch('utils.services.postcoder_service.requests.get')
    def test_execute_lookup_success(self, mock_get):
        """Test successful execute_lookup returns addresses and timing"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = [
            {
                "postcode": "SW1A1AA",
                "number": "10",
                "street": "Downing Street",
                "posttown": "LONDON",
                "county": "Greater London",
                "latitude": 51.5,
                "longitude": -0.1
            }
        ]
        mock_get.return_value = mock_response

        # Execute
        addresses, response_time_ms = self.service.execute_lookup(self.test_postcode)

        # Verify addresses
        self.assertIn("addresses", addresses)
        self.assertEqual(len(addresses["addresses"]), 1)

        # Verify timing (allow 0 for fast mocked calls)
        self.assertIsInstance(response_time_ms, int)
        self.assertGreaterEqual(response_time_ms, 0)

    @patch('utils.services.postcoder_service.requests.get')
    def test_execute_lookup_error_returns_timing(self, mock_get):
        """Test execute_lookup returns timing even on error"""
        mock_get.side_effect = requests.RequestException("API error")

        # Execute and expect error
        with self.assertRaises(requests.RequestException):
            addresses, response_time_ms = self.service.execute_lookup(self.test_postcode)

    @patch('utils.services.postcoder_service.requests.get')
    def test_execute_lookup_integrates_lookup_and_transform(self, mock_get):
        """Test execute_lookup integrates lookup_address and transform methods"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = [
            {
                "postcode": "OX449EL",
                "number": "1",
                "street": "Test Street",
                "posttown": "OXFORD",
                "county": "Oxfordshire",
                "latitude": 51.7,
                "longitude": -1.2
            }
        ]
        mock_get.return_value = mock_response

        # Execute
        addresses, response_time_ms = self.service.execute_lookup("OX44 9EL")

        # Verify transformation applied
        self.assertEqual(addresses["addresses"][0]["postcode"], "OX44 9EL")
        self.assertEqual(addresses["addresses"][0]["town_or_city"], "Oxford")  # Title case

    # ==================== Edge Cases & Integration ====================

    def test_service_initialization_with_settings(self):
        """Test service uses settings.POSTCODER_API_KEY when no key provided"""
        with patch.object(settings, 'POSTCODER_API_KEY', 'settings_key'):
            service = PostcoderService()
            self.assertEqual(service.api_key, 'settings_key')

    def test_service_initialization_explicit_key_overrides_settings(self):
        """Test explicit API key overrides settings"""
        with patch.object(settings, 'POSTCODER_API_KEY', 'settings_key'):
            service = PostcoderService(api_key='explicit_key')
            self.assertEqual(service.api_key, 'explicit_key')

    def test_service_warns_on_missing_api_key(self):
        """Test service logs warning when API key not configured"""
        with patch.object(settings, 'POSTCODER_API_KEY', ''):
            with self.assertLogs('utils.services.postcoder_service', level='WARNING') as cm:
                service = PostcoderService()
                self.assertTrue(any('not configured' in msg for msg in cm.output))


if __name__ == '__main__':
    unittest.main()
