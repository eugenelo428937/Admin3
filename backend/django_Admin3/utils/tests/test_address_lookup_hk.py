"""
Contract tests for Hong Kong Address Lookup Service endpoint

TDD Phase: RED - These tests MUST FAIL initially (endpoint not implemented yet)

Contract specification: specs/003-currently-the-backend/contracts/address-lookup-hk-api.md
"""

from django.test import TestCase, Client
from django.urls import reverse, NoReverseMatch
from unittest.mock import patch, Mock
import requests
import json

from .fixtures.hk_als_responses import (
    HK_ALS_SUCCESS_2D,
    HK_ALS_SUCCESS_3D,
    HK_ALS_ERROR_500,
    HK_ALS_NO_RESULTS,
    CONTRACT_RESPONSE_2D,
    CONTRACT_RESPONSE_3D,
)


class AddressLookupHKContractTest(TestCase):
    """
    Contract tests for /api/utils/address-lookup-hk/ endpoint

    These tests verify the API contract is met:
    - Request: GET with search_text parameter
    - Response: JSON with addresses array, total, search_text
    - Errors: 400 for missing params, 500 for service unavailable
    """

    def setUp(self):
        """Set up test client for API calls"""
        self.client = Client()
        # This will fail with NoReverseMatch until URL routing is configured
        try:
            self.url = reverse('address_lookup_hk')
        except NoReverseMatch:
            self.url = '/api/utils/address-lookup-hk/'  # Fallback URL

    # T003: Contract test - Successful address search returns 200 with addresses
    @patch('requests.get')
    def test_successful_search_returns_200_with_addresses(self, mock_get):
        """
        Contract: GET /api/utils/address-lookup-hk/?search_text=central
        Expected: HTTP 200 with {addresses: [...], total: int, search_text: str}

        TDD Stage: RED (endpoint doesn't exist yet - expect 404)
        """
        # Mock HK ALS API response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = HK_ALS_SUCCESS_2D
        mock_get.return_value = mock_response

        # Call our endpoint
        response = self.client.get(self.url, {'search_text': 'central'})

        # Contract assertions
        self.assertEqual(response.status_code, 200,
                        "Expected HTTP 200 for successful search")

        data = response.json()

        # Verify response structure matches contract
        self.assertIn('addresses', data,
                     "Response must contain 'addresses' field")
        self.assertIn('total', data,
                     "Response must contain 'total' field")
        self.assertIn('search_text', data,
                     "Response must contain 'search_text' field")

        # Verify data types
        self.assertIsInstance(data['addresses'], list,
                             "'addresses' must be a list")
        self.assertIsInstance(data['total'], int,
                             "'total' must be an integer")
        self.assertIsInstance(data['search_text'], str,
                             "'search_text' must be a string")

        # Verify addresses array is not empty
        self.assertGreater(len(data['addresses']), 0,
                          "Successful search should return at least one address")

        # Verify total matches array length
        self.assertEqual(data['total'], len(data['addresses']),
                        "'total' must match length of 'addresses' array")

    # T004: Contract test - Missing search_text parameter returns 400
    def test_missing_search_text_returns_400_with_allow_manual(self):
        """
        Contract: GET /api/utils/address-lookup-hk/ (no search_text)
        Expected: HTTP 400 with {error: str, allow_manual: true}

        TDD Stage: RED (endpoint doesn't exist yet - expect 404)
        """
        # Call endpoint without search_text parameter
        response = self.client.get(self.url)

        # Contract assertions
        self.assertEqual(response.status_code, 400,
                        "Expected HTTP 400 when search_text is missing")

        data = response.json()

        # Verify error response structure
        self.assertIn('error', data,
                     "Error response must contain 'error' field")
        self.assertIn('allow_manual', data,
                     "Error response must contain 'allow_manual' field")

        # Verify allow_manual is True (user should use manual entry)
        self.assertEqual(data['allow_manual'], True,
                        "'allow_manual' must be True when parameter missing")

        # Verify error message is informative
        self.assertIsInstance(data['error'], str,
                             "'error' must be a string")
        self.assertTrue(len(data['error']) > 0,
                       "'error' message must not be empty")

    # T005: Contract test - HK ALS service unavailable returns 500
    @patch('requests.get')
    def test_service_unavailable_returns_500_with_allow_manual(self, mock_get):
        """
        Contract: HK ALS API timeout/connection error
        Expected: HTTP 500 with {error: str, allow_manual: true, details: str}

        TDD Stage: RED (endpoint doesn't exist yet - expect 404)
        """
        # Mock HK ALS API to raise timeout exception
        mock_get.side_effect = requests.exceptions.Timeout("Connection timeout")

        # Call our endpoint
        response = self.client.get(self.url, {'search_text': 'test'})

        # Contract assertions
        self.assertEqual(response.status_code, 500,
                        "Expected HTTP 500 when external service unavailable")

        data = response.json()

        # Verify error response structure
        self.assertIn('error', data,
                     "Error response must contain 'error' field")
        self.assertIn('allow_manual', data,
                     "Error response must contain 'allow_manual' field")

        # Verify allow_manual is True (graceful degradation)
        self.assertEqual(data['allow_manual'], True,
                        "'allow_manual' must be True when service unavailable")

        # Verify error message indicates service unavailability
        self.assertIn('unavailable', data['error'].lower(),
                     "Error message should indicate service unavailability")

        # Optional: details field for debugging
        if 'details' in data:
            self.assertIsInstance(data['details'], str,
                                 "'details' must be a string if present")

    # T006: Contract test - Address object structure validation
    @patch('requests.get')
    def test_address_object_structure_validation(self, mock_get):
        """
        Contract: Each address object must have required fields
        Expected: building, street, district, region, formatted_address, is_3d

        TDD Stage: RED (endpoint doesn't exist yet - expect 404)
        """
        # Mock HK ALS API with both 2D and 3D addresses
        mock_response_2d = Mock()
        mock_response_2d.status_code = 200
        mock_response_2d.json.return_value = HK_ALS_SUCCESS_2D

        mock_response_3d = Mock()
        mock_response_3d.status_code = 200
        mock_response_3d.json.return_value = HK_ALS_SUCCESS_3D

        # Test 2D address structure
        mock_get.return_value = mock_response_2d
        response_2d = self.client.get(self.url, {'search_text': 'central'})
        self.assertEqual(response_2d.status_code, 200)

        data_2d = response_2d.json()
        if data_2d.get('addresses'):
            address_2d = data_2d['addresses'][0]

            # Verify all required fields present
            required_fields = ['building', 'street', 'district', 'region',
                              'formatted_address', 'is_3d']
            for field in required_fields:
                self.assertIn(field, address_2d,
                             f"Address object must contain '{field}' field")

            # Verify field types
            self.assertIsInstance(address_2d['building'], str,
                                 "'building' must be a string")
            self.assertIsInstance(address_2d['street'], str,
                                 "'street' must be a string")
            self.assertIsInstance(address_2d['district'], str,
                                 "'district' must be a string")
            self.assertIsInstance(address_2d['region'], str,
                                 "'region' must be a string")
            self.assertIsInstance(address_2d['formatted_address'], str,
                                 "'formatted_address' must be a string")
            self.assertIsInstance(address_2d['is_3d'], bool,
                                 "'is_3d' must be a boolean")

            # Verify 2D address has is_3d=False
            self.assertEqual(address_2d['is_3d'], False,
                           "Commercial building should have is_3d=False")

            # Verify formatted_address is not empty
            self.assertTrue(len(address_2d['formatted_address']) > 0,
                          "'formatted_address' must not be empty")

        # Test 3D address structure
        mock_get.return_value = mock_response_3d
        response_3d = self.client.get(self.url, {'search_text': 'mei foo'})
        self.assertEqual(response_3d.status_code, 200)

        data_3d = response_3d.json()
        if data_3d.get('addresses'):
            address_3d = data_3d['addresses'][0]

            # Verify 3D address has is_3d=True
            self.assertEqual(address_3d['is_3d'], True,
                           "Residential estate should have is_3d=True")

            # Verify 3D address has keywords indicating residential estate
            building = address_3d['building']
            street = address_3d['street']
            # Should contain keywords like BLOCK, PHASE, TOWER, ESTATE, FLAT, FLOOR
            combined = f"{building} {street}".upper()
            has_3d_keywords = any(keyword in combined for keyword in
                                 ['FLAT', 'FLOOR', 'BLOCK', 'PHASE', 'TOWER', 'ESTATE', 'BUILDING'])
            self.assertTrue(has_3d_keywords,
                          "3D address should contain keywords indicating residential estate structure")

    # Additional helper test: Verify empty results handled correctly
    @patch('requests.get')
    def test_no_results_returns_empty_array(self, mock_get):
        """
        Contract: No matching addresses should return empty array
        Expected: HTTP 200 with {addresses: [], total: 0, search_text: str}

        TDD Stage: RED (endpoint doesn't exist yet - expect 404)
        """
        # Mock HK ALS API with no results
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = HK_ALS_NO_RESULTS
        mock_get.return_value = mock_response

        # Call our endpoint
        response = self.client.get(self.url, {'search_text': 'nonexistent'})

        # Contract assertions
        self.assertEqual(response.status_code, 200,
                        "No results should still return HTTP 200")

        data = response.json()

        # Verify response structure
        self.assertEqual(data['addresses'], [],
                        "No results should return empty addresses array")
        self.assertEqual(data['total'], 0,
                        "No results should have total=0")
        self.assertEqual(data['search_text'], 'nonexistent',
                        "search_text should echo the query")
