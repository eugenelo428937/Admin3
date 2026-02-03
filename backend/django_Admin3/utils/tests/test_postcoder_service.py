"""Tests for PostcoderService class (utils/services/postcoder_service.py).

Covers coverage gaps in the service class:
- __init__ with missing API key
- autocomplete_address: validation, error dict response, timeout, request exception
- retrieve_address: validation, error dict response, timeout, request exception
- lookup_address: validation, error dict, HTTPError 404, timeout, generic exception
- transform_to_getaddress_format: non-list response, item-level exception,
  address field combinations (organisation, sub_building, short postcode)
- execute_lookup: success with timing, error with timing
"""
from decimal import Decimal
from unittest.mock import patch, MagicMock, Mock
from django.test import TestCase, override_settings

import requests

from utils.services.postcoder_service import PostcoderService
from utils.models import UtilsCountrys


@override_settings(POSTCODER_API_KEY='UTL_TEST_KEY')
class TestPostcoderServiceInit(TestCase):
    """Test PostcoderService initialization."""

    def test_UTL_init_with_explicit_key(self):
        """Should use explicit API key when provided."""
        service = PostcoderService(api_key='UTL_EXPLICIT')
        self.assertEqual(service.api_key, 'UTL_EXPLICIT')

    def test_UTL_init_from_settings(self):
        """Should use settings key when no explicit key provided."""
        service = PostcoderService()
        self.assertEqual(service.api_key, 'UTL_TEST_KEY')

    @override_settings(POSTCODER_API_KEY='')
    def test_UTL_init_missing_key_logs_warning(self):
        """Should log warning when API key is empty."""
        with patch('utils.services.postcoder_service.logger') as mock_logger:
            service = PostcoderService()
            mock_logger.warning.assert_called_once()
            self.assertEqual(service.api_key, '')


@override_settings(POSTCODER_API_KEY='UTL_TEST_KEY')
class TestAutocompleteAddress(TestCase):
    """Test autocomplete_address method."""

    def setUp(self):
        self.service = PostcoderService()

    def test_UTL_empty_query_raises_value_error(self):
        """Empty search query should raise ValueError."""
        with self.assertRaises(ValueError) as ctx:
            self.service.autocomplete_address('')
        self.assertIn('required', str(ctx.exception))

    def test_UTL_whitespace_query_raises_value_error(self):
        """Whitespace-only search query should raise ValueError."""
        with self.assertRaises(ValueError):
            self.service.autocomplete_address('   ')

    @override_settings(POSTCODER_API_KEY='')
    def test_UTL_missing_api_key_raises_value_error(self):
        """Missing API key should raise ValueError."""
        service = PostcoderService()
        with self.assertRaises(ValueError) as ctx:
            service.autocomplete_address('UTL Test')
        self.assertIn('not configured', str(ctx.exception))

    @patch('utils.services.postcoder_service.requests.get')
    def test_UTL_successful_autocomplete(self, mock_get):
        """Successful autocomplete returns list of suggestions."""
        mock_response = Mock()
        mock_response.json.return_value = [
            {'id': 'UTL_1', 'summaryline': 'UTL Address 1'}
        ]
        mock_response.raise_for_status = Mock()
        mock_get.return_value = mock_response

        result = self.service.autocomplete_address('UTL Test', 'GB')
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]['id'], 'UTL_1')

    @patch('utils.services.postcoder_service.requests.get')
    def test_UTL_autocomplete_with_postcode_param(self, mock_get):
        """Postcode param should be included in API call."""
        mock_response = Mock()
        mock_response.json.return_value = []
        mock_response.raise_for_status = Mock()
        mock_get.return_value = mock_response

        self.service.autocomplete_address('UTL Test', 'GB', postcode='SW1A 1AA')
        call_kwargs = mock_get.call_args
        self.assertIn('postcode', call_kwargs[1]['params'])
        self.assertEqual(call_kwargs[1]['params']['postcode'], 'SW1A 1AA')

    @patch('utils.services.postcoder_service.requests.get')
    def test_UTL_autocomplete_error_dict_response(self, mock_get):
        """Error dict from API should raise RequestException."""
        mock_response = Mock()
        mock_response.json.return_value = {'error': 'UTL bad request'}
        mock_response.raise_for_status = Mock()
        mock_get.return_value = mock_response

        with self.assertRaises(requests.RequestException):
            self.service.autocomplete_address('UTL Test')

    @patch('utils.services.postcoder_service.requests.get')
    def test_UTL_autocomplete_timeout(self, mock_get):
        """Timeout should raise TimeoutError."""
        mock_get.side_effect = requests.Timeout('UTL timeout')

        with self.assertRaises(TimeoutError) as ctx:
            self.service.autocomplete_address('UTL Test')
        self.assertIn('timed out', str(ctx.exception))

    @patch('utils.services.postcoder_service.requests.get')
    def test_UTL_autocomplete_request_exception(self, mock_get):
        """RequestException should re-raise."""
        mock_get.side_effect = requests.ConnectionError('UTL connection error')

        with self.assertRaises(requests.ConnectionError):
            self.service.autocomplete_address('UTL Test')


@override_settings(POSTCODER_API_KEY='UTL_TEST_KEY')
class TestRetrieveAddress(TestCase):
    """Test retrieve_address method."""

    def setUp(self):
        self.service = PostcoderService()

    def test_UTL_empty_id_raises_value_error(self):
        """Empty address ID should raise ValueError."""
        with self.assertRaises(ValueError) as ctx:
            self.service.retrieve_address('')
        self.assertIn('required', str(ctx.exception))

    def test_UTL_whitespace_id_raises_value_error(self):
        """Whitespace-only address ID should raise ValueError."""
        with self.assertRaises(ValueError):
            self.service.retrieve_address('   ')

    @override_settings(POSTCODER_API_KEY='')
    def test_UTL_missing_api_key_raises_value_error(self):
        """Missing API key should raise ValueError."""
        service = PostcoderService()
        with self.assertRaises(ValueError) as ctx:
            service.retrieve_address('UTL_ID')
        self.assertIn('not configured', str(ctx.exception))

    @patch('utils.services.postcoder_service.requests.get')
    def test_UTL_successful_retrieve(self, mock_get):
        """Successful retrieve returns address data."""
        mock_response = Mock()
        mock_response.json.return_value = [
            {'postcode': 'SW1A1AA', 'number': '10', 'street': 'Downing Street'}
        ]
        mock_response.raise_for_status = Mock()
        mock_get.return_value = mock_response

        result = self.service.retrieve_address('UTL_ID1', 'GB')
        self.assertIsInstance(result, list)
        self.assertEqual(result[0]['postcode'], 'SW1A1AA')

    @patch('utils.services.postcoder_service.requests.get')
    def test_UTL_retrieve_error_dict_response(self, mock_get):
        """Error dict from API should raise RequestException."""
        mock_response = Mock()
        mock_response.json.return_value = {'error': 'UTL invalid ID'}
        mock_response.raise_for_status = Mock()
        mock_get.return_value = mock_response

        with self.assertRaises(requests.RequestException):
            self.service.retrieve_address('UTL_BAD_ID')

    @patch('utils.services.postcoder_service.requests.get')
    def test_UTL_retrieve_timeout(self, mock_get):
        """Timeout should raise TimeoutError."""
        mock_get.side_effect = requests.Timeout('UTL timeout')

        with self.assertRaises(TimeoutError):
            self.service.retrieve_address('UTL_ID2')

    @patch('utils.services.postcoder_service.requests.get')
    def test_UTL_retrieve_request_exception(self, mock_get):
        """RequestException should re-raise."""
        mock_get.side_effect = requests.ConnectionError('UTL connection failed')

        with self.assertRaises(requests.ConnectionError):
            self.service.retrieve_address('UTL_ID3')


@override_settings(POSTCODER_API_KEY='UTL_TEST_KEY')
class TestLookupAddress(TestCase):
    """Test lookup_address method."""

    def setUp(self):
        self.service = PostcoderService()

    def test_UTL_empty_postcode_raises_value_error(self):
        """Empty postcode should raise ValueError."""
        with self.assertRaises(ValueError):
            self.service.lookup_address('')

    def test_UTL_none_postcode_raises_value_error(self):
        """None postcode should raise ValueError."""
        with self.assertRaises(ValueError):
            self.service.lookup_address(None)

    @override_settings(POSTCODER_API_KEY='')
    def test_UTL_missing_api_key_raises_value_error(self):
        """Missing API key should raise ValueError."""
        service = PostcoderService()
        with self.assertRaises(ValueError):
            service.lookup_address('SW1A1AA')

    @patch('utils.services.postcoder_service.requests.get')
    def test_UTL_successful_lookup(self, mock_get):
        """Successful lookup returns address list."""
        mock_response = Mock()
        mock_response.json.return_value = [
            {'postcode': 'SW1A1AA', 'street': 'Downing Street'}
        ]
        mock_response.raise_for_status = Mock()
        mock_get.return_value = mock_response

        result = self.service.lookup_address('SW1A 1AA', 'GB')
        self.assertIsInstance(result, list)
        self.assertEqual(len(result), 1)

        # Verify URL includes cleaned postcode (no spaces, uppercase)
        call_args = mock_get.call_args
        url = call_args[0][0]
        self.assertIn('SW1A1AA', url)
        self.assertIn('/gb/', url)  # lowercase country code in URL

    @patch('utils.services.postcoder_service.requests.get')
    def test_UTL_lookup_error_dict_response(self, mock_get):
        """Error dict from API should raise RequestException."""
        mock_response = Mock()
        mock_response.json.return_value = {'error': 'UTL invalid postcode'}
        mock_response.raise_for_status = Mock()
        mock_get.return_value = mock_response

        with self.assertRaises(requests.RequestException):
            self.service.lookup_address('UTLBAD')

    @patch('utils.services.postcoder_service.requests.get')
    def test_UTL_lookup_http_error_404_returns_empty(self, mock_get):
        """404 HTTPError should return empty list (no addresses found)."""
        mock_http_response = Mock()
        mock_http_response.status_code = 404
        http_error = requests.HTTPError(response=mock_http_response)
        mock_get.side_effect = http_error

        result = self.service.lookup_address('UTLNONE')
        self.assertEqual(result, [])

    @patch('utils.services.postcoder_service.requests.get')
    def test_UTL_lookup_http_error_500_reraises(self, mock_get):
        """Non-404 HTTPError should re-raise."""
        mock_http_response = Mock()
        mock_http_response.status_code = 500
        http_error = requests.HTTPError(response=mock_http_response)
        mock_get.side_effect = http_error

        with self.assertRaises(requests.HTTPError):
            self.service.lookup_address('UTLERR')

    @patch('utils.services.postcoder_service.requests.get')
    def test_UTL_lookup_timeout(self, mock_get):
        """Timeout should raise TimeoutError."""
        mock_get.side_effect = requests.Timeout('UTL lookup timeout')

        with self.assertRaises(TimeoutError) as ctx:
            self.service.lookup_address('UTL123')
        self.assertIn('timed out', str(ctx.exception))

    @patch('utils.services.postcoder_service.requests.get')
    def test_UTL_lookup_request_exception(self, mock_get):
        """Generic RequestException should re-raise."""
        mock_get.side_effect = requests.ConnectionError('UTL lookup conn error')

        with self.assertRaises(requests.ConnectionError):
            self.service.lookup_address('UTL456')


@override_settings(POSTCODER_API_KEY='UTL_TEST_KEY')
class TestTransformToGetaddressFormat(TestCase):
    """Test transform_to_getaddress_format method."""

    def setUp(self):
        self.service = PostcoderService()
        self.country = UtilsCountrys.objects.create(
            code='U4',
            name='UTL Transform Country',
            vat_percent=Decimal('10.00'),
            active=True,
        )

    def test_UTL_non_list_response_returns_empty(self):
        """Non-list response should return empty addresses."""
        result = self.service.transform_to_getaddress_format(
            {'error': 'bad data'}, 'U4'
        )
        self.assertEqual(result, {'addresses': []})

    def test_UTL_none_response_returns_empty(self):
        """None response should return empty addresses."""
        result = self.service.transform_to_getaddress_format(None, 'U4')
        self.assertEqual(result, {'addresses': []})

    def test_UTL_empty_list_returns_empty(self):
        """Empty list should return empty addresses."""
        result = self.service.transform_to_getaddress_format([], 'U4')
        self.assertEqual(result['addresses'], [])

    def test_UTL_basic_address_transform(self):
        """Should transform a basic address with number and street."""
        postcoder_data = [{
            'postcode': 'SW1A1AA',
            'number': '10',
            'street': 'Downing Street',
            'posttown': 'LONDON',
            'county': 'Greater London',
            'latitude': 51.5,
            'longitude': -0.12,
        }]
        result = self.service.transform_to_getaddress_format(postcoder_data, 'U4')
        self.assertEqual(len(result['addresses']), 1)
        addr = result['addresses'][0]
        self.assertIn('10', addr['line_1'])
        self.assertIn('Downing Street', addr['line_1'])
        self.assertEqual(addr['town_or_city'], 'London')  # title case
        self.assertEqual(addr['county'], 'Greater London')
        self.assertEqual(addr['country'], 'UTL Transform Country')
        # Postcode should be formatted with space
        self.assertIn('SW1A', addr['postcode'])
        self.assertIn('1AA', addr['postcode'])

    def test_UTL_address_with_organisation(self):
        """Organisation should appear in line_1 with comma-separated parts."""
        postcoder_data = [{
            'postcode': 'EC1A1BB',
            'organisation': 'UTL Corp Ltd',
            'number': '5',
            'street': 'High Street',
            'posttown': 'LONDON',
            'county': '',
        }]
        result = self.service.transform_to_getaddress_format(postcoder_data, 'U4')
        addr = result['addresses'][0]
        self.assertIn('UTL Corp Ltd', addr['line_1'])
        self.assertIn(', ', addr['line_1'])  # comma-separated when org present
        self.assertEqual(addr['building_name'], 'UTL Corp Ltd')

    def test_UTL_address_with_sub_building_name(self):
        """Sub-building name (flat/unit) should appear in line_1."""
        postcoder_data = [{
            'postcode': 'W1A1AA',
            'subbuildingname': 'Flat 3',
            'buildingname': 'UTL House',
            'street': 'Park Lane',
            'posttown': 'LONDON',
            'county': '',
        }]
        result = self.service.transform_to_getaddress_format(postcoder_data, 'U4')
        addr = result['addresses'][0]
        self.assertIn('Flat 3', addr['line_1'])
        self.assertIn('UTL House', addr['line_1'])
        self.assertEqual(addr['sub_building_name'], 'Flat 3')

    def test_UTL_address_with_dependent_locality(self):
        """Dependent locality should appear in line_3 and formatted_address."""
        postcoder_data = [{
            'postcode': 'OX11AA',
            'number': '1',
            'street': 'UTL Road',
            'dependentlocality': 'UTL Village',
            'posttown': 'OXFORD',
            'county': 'Oxfordshire',
        }]
        result = self.service.transform_to_getaddress_format(postcoder_data, 'U4')
        addr = result['addresses'][0]
        self.assertEqual(addr['line_3'], 'UTL Village')
        self.assertIn('UTL Village', addr['formatted_address'])

    def test_UTL_short_postcode_no_space(self):
        """Short postcode (<3 chars) should not be formatted with space."""
        postcoder_data = [{
            'postcode': 'AB',
            'street': 'UTL Short',
            'posttown': 'CITY',
            'county': '',
        }]
        result = self.service.transform_to_getaddress_format(postcoder_data, 'U4')
        addr = result['addresses'][0]
        self.assertEqual(addr['postcode'], 'AB')

    def test_UTL_empty_postcode(self):
        """Empty postcode should remain empty."""
        postcoder_data = [{
            'postcode': '',
            'street': 'UTL NoPost',
            'posttown': 'TOWN',
            'county': '',
        }]
        result = self.service.transform_to_getaddress_format(postcoder_data, 'U4')
        addr = result['addresses'][0]
        self.assertEqual(addr['postcode'], '')

    def test_UTL_unknown_country_code_fallback(self):
        """Unknown country code should use code as fallback name."""
        postcoder_data = [{
            'postcode': 'ZZ11AA',
            'street': 'UTL Unknown',
            'posttown': 'NOWHERE',
            'county': '',
        }]
        result = self.service.transform_to_getaddress_format(postcoder_data, 'ZZ')
        addr = result['addresses'][0]
        self.assertEqual(addr['country'], 'ZZ')

    def test_UTL_item_exception_skips_bad_item(self):
        """Exception transforming one item should skip it and continue."""
        # First item will raise by having a non-dict that causes .get() to fail
        postcoder_data = [
            'UTL_bad_item_not_a_dict',  # This should raise AttributeError
            {
                'postcode': 'OK11AA',
                'number': '1',
                'street': 'UTL Good Street',
                'posttown': 'TOWN',
                'county': '',
            },
        ]
        result = self.service.transform_to_getaddress_format(postcoder_data, 'U4')
        # Should have 1 address (bad item skipped)
        self.assertEqual(len(result['addresses']), 1)
        self.assertIn('UTL Good Street', result['addresses'][0]['line_1'])

    def test_UTL_address_with_premise_fallback(self):
        """When number is empty, premise should be used as building_number."""
        postcoder_data = [{
            'postcode': 'N11AA',
            'number': '',
            'premise': '10A',
            'street': 'UTL Premise St',
            'posttown': 'LONDON',
            'county': '',
        }]
        result = self.service.transform_to_getaddress_format(postcoder_data, 'U4')
        addr = result['addresses'][0]
        self.assertEqual(addr['building_number'], '10A')
        self.assertIn('10A', addr['line_1'])

    def test_UTL_address_building_name_without_org(self):
        """Building name should appear when no organisation is set."""
        postcoder_data = [{
            'postcode': 'E11AA',
            'buildingname': 'UTL Tower',
            'street': 'High Street',
            'posttown': 'LONDON',
            'county': '',
        }]
        result = self.service.transform_to_getaddress_format(postcoder_data, 'U4')
        addr = result['addresses'][0]
        self.assertIn('UTL Tower', addr['line_1'])
        self.assertEqual(addr['building_name'], 'UTL Tower')

    def test_UTL_address_building_name_hidden_with_org(self):
        """Building name should NOT appear in line_1 when organisation is present."""
        postcoder_data = [{
            'postcode': 'E21AA',
            'organisation': 'UTL Org',
            'buildingname': 'UTL Hidden Building',
            'street': 'Main Street',
            'posttown': 'LONDON',
            'county': '',
        }]
        result = self.service.transform_to_getaddress_format(postcoder_data, 'U4')
        addr = result['addresses'][0]
        self.assertIn('UTL Org', addr['line_1'])
        self.assertNotIn('UTL Hidden Building', addr['line_1'])
        # building_name should be the org when org is present
        self.assertEqual(addr['building_name'], 'UTL Org')


@override_settings(POSTCODER_API_KEY='UTL_TEST_KEY')
class TestExecuteLookup(TestCase):
    """Test execute_lookup method."""

    def setUp(self):
        self.service = PostcoderService()
        UtilsCountrys.objects.create(
            code='U5',
            name='UTL Execute Country',
            vat_percent=Decimal('5.00'),
            active=True,
        )

    @patch('utils.services.postcoder_service.requests.get')
    def test_UTL_execute_success_returns_tuple(self, mock_get):
        """Successful execute_lookup returns (addresses_dict, response_time_ms)."""
        mock_response = Mock()
        mock_response.json.return_value = [{
            'postcode': 'UTL11AA',
            'number': '1',
            'street': 'UTL Execute St',
            'posttown': 'TOWN',
            'county': '',
        }]
        mock_response.raise_for_status = Mock()
        mock_get.return_value = mock_response

        addresses, response_time = self.service.execute_lookup('UTL11AA', 'U5')
        self.assertIn('addresses', addresses)
        self.assertEqual(len(addresses['addresses']), 1)
        self.assertIsInstance(response_time, int)
        self.assertGreaterEqual(response_time, 0)

    @patch('utils.services.postcoder_service.requests.get')
    def test_UTL_execute_error_reraises_with_timing(self, mock_get):
        """Error in execute_lookup should re-raise after calculating timing."""
        mock_get.side_effect = requests.ConnectionError('UTL execute error')

        with self.assertRaises(requests.ConnectionError):
            self.service.execute_lookup('UTLERR', 'U5')

    @patch('utils.services.postcoder_service.requests.get')
    def test_UTL_execute_timeout_reraises(self, mock_get):
        """Timeout in execute_lookup should re-raise."""
        mock_get.side_effect = requests.Timeout('UTL execute timeout')

        with self.assertRaises(TimeoutError):
            self.service.execute_lookup('UTLTMO', 'U5')
