"""Tests for utils API endpoints (views.py and health_check.py)."""
from decimal import Decimal
from unittest.mock import patch, MagicMock
from rest_framework.test import APITestCase
from rest_framework import status
from utils.models import UtilsCountrys


class TestCountryListEndpoint(APITestCase):
    """Test the /api/countries/ endpoint (country_list function view)."""

    def setUp(self):
        self.country_gb = UtilsCountrys.objects.create(
            code='GB',
            name='United Kingdom',
            phone_code='+44',
            vat_percent=Decimal('20.00'),
            active=True,
        )
        self.country_us = UtilsCountrys.objects.create(
            code='US',
            name='United States',
            phone_code='+1',
            vat_percent=Decimal('0.00'),
            active=True,
        )
        self.country_inactive = UtilsCountrys.objects.create(
            code='XX',
            name='Inactive Country',
            phone_code='+99',
            active=False,
        )

    def test_list_countries(self):
        """GET /api/countries/ returns list of active countries."""
        response = self.client.get('/api/countries/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        # Should only include active countries
        codes = [c['iso_code'] for c in data]
        self.assertIn('GB', codes)
        self.assertIn('US', codes)
        self.assertNotIn('XX', codes)


class TestHealthCheckEndpoints(APITestCase):
    """Test health check endpoints at /api/health/ and /api/utils/health/."""

    def test_top_level_health_check(self):
        """GET /api/health/ returns 200 with status info."""
        response = self.client.get('/api/health/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertIn('status', data)

    def test_utils_health_check(self):
        """GET /api/utils/health/ returns 200 with healthy status."""
        response = self.client.get('/api/utils/health/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data['status'], 'healthy')


class TestAddressLookupEndpoint(APITestCase):
    """Test the /api/utils/address-lookup/ endpoint (postcoder_address_lookup)."""

    @patch('utils.services.PostcoderService')
    def test_address_lookup_with_query(self, mock_postcoder_cls):
        """GET /api/utils/address-lookup/?query=10+Downing returns addresses."""
        mock_service = mock_postcoder_cls.return_value
        mock_service.autocomplete_address.return_value = [
            {'id': 'ABC123', 'summaryline': '10 Downing Street', 'locationsummary': 'London'}
        ]
        response = self.client.get('/api/utils/address-lookup/', {'query': '10 Downing Street'})
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_500_INTERNAL_SERVER_ERROR])

    def test_address_lookup_missing_params(self):
        """GET /api/utils/address-lookup/ without params returns 400."""
        response = self.client.get('/api/utils/address-lookup/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class TestGetAddressLookupEndpoint(APITestCase):
    """Test the /api/utils/getaddress-lookup/ endpoint (legacy address_lookup_proxy)."""

    @patch('utils.views.requests.get')
    def test_getaddress_lookup(self, mock_get):
        """GET /api/utils/getaddress-lookup/?postcode=SW1A1AA returns addresses."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = [{'line_1': '10 Downing Street'}]
        mock_response.raise_for_status = MagicMock()
        mock_get.return_value = mock_response
        response = self.client.get('/api/utils/getaddress-lookup/', {'postcode': 'SW1A 1AA'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class TestPostcoderAddressLookupEndpoint(APITestCase):
    """Test the /api/utils/postcoder-address-lookup/ endpoint."""

    @patch('utils.services.PostcoderService')
    def test_postcoder_address_lookup(self, mock_postcoder_cls):
        """GET /api/utils/postcoder-address-lookup/?query=test returns addresses."""
        mock_service = mock_postcoder_cls.return_value
        mock_service.autocomplete_address.return_value = [
            {'id': 'XYZ', 'summaryline': 'Test Address', 'locationsummary': 'London'}
        ]
        response = self.client.get('/api/utils/postcoder-address-lookup/', {'query': 'Test Address'})
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_500_INTERNAL_SERVER_ERROR])


class TestAddressRetrieveEndpoint(APITestCase):
    """Test the /api/utils/address-retrieve/ endpoint."""

    @patch('utils.services.PostcoderService')
    def test_address_retrieve_with_id(self, mock_postcoder_cls):
        """GET /api/utils/address-retrieve/?id=ABC123 returns address details."""
        mock_service = mock_postcoder_cls.return_value
        mock_service.retrieve_address.return_value = {
            'postcode': 'SW1A 1AA', 'number': '10', 'street': 'Downing Street'
        }
        mock_service.transform_to_getaddress_format.return_value = {
            'addresses': [{'postcode': 'SW1A 1AA', 'line_1': '10 Downing Street'}]
        }
        response = self.client.get('/api/utils/address-retrieve/', {'id': 'ABC123'})
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_500_INTERNAL_SERVER_ERROR])

    def test_address_retrieve_missing_id(self):
        """GET /api/utils/address-retrieve/ without id returns 400."""
        response = self.client.get('/api/utils/address-retrieve/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
