"""
Test cases for VAT calculation API endpoint.
Following TDD methodology: RED → GREEN → REFACTOR

Test Coverage:
- POST /api/rules/engine/calculate-vat/ endpoint
- Basic VAT calculation
- Cart items VAT calculation
- Error handling
- Authentication (AllowAny for now)
"""
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from decimal import Decimal
from datetime import date
from utils.models import UtilsRegion, UtilsCountrys, UtilsCountryRegion


class VATCalculationAPITestCase(TestCase):
    """Test cases for VAT calculation API endpoint (TDD RED Phase)."""

    def setUp(self):
        """Set up test data and API client."""
        # Get or create regions
        self.region_uk, _ = UtilsRegion.objects.get_or_create(
            code='UK',
            defaults={'name': 'United Kingdom'}
        )
        self.region_row, _ = UtilsRegion.objects.get_or_create(
            code='ROW',
            defaults={'name': 'Rest of World'}
        )

        # Get or create countries
        self.country_gb, _ = UtilsCountrys.objects.get_or_create(
            code='GB',
            defaults={
                'name': 'United Kingdom',
                'vat_percent': Decimal('20.00')
            }
        )
        self.country_ie, _ = UtilsCountrys.objects.get_or_create(
            code='IE',
            defaults={
                'name': 'Ireland',
                'vat_percent': Decimal('23.00')
            }
        )
        self.country_us, _ = UtilsCountrys.objects.get_or_create(
            code='US',
            defaults={
                'name': 'United States',
                'vat_percent': Decimal('0.00')
            }
        )

        # Get or create country-region mappings
        UtilsCountryRegion.objects.get_or_create(
            country=self.country_gb,
            effective_from=date(2020, 1, 1),
            defaults={'region': self.region_uk}
        )
        UtilsCountryRegion.objects.get_or_create(
            country=self.country_ie,
            effective_from=date(2020, 1, 1),
            defaults={'region': self.region_uk}
        )
        UtilsCountryRegion.objects.get_or_create(
            country=self.country_us,
            effective_from=date(2020, 1, 1),
            defaults={'region': self.region_row}
        )

        # Initialize API client
        self.client = APIClient()
        self.url = reverse('rules-engine-calculate-vat')

    def test_calculate_vat_endpoint_exists(self):
        """Test that the VAT calculation endpoint exists."""
        response = self.client.post(self.url, {})
        # Should not return 404
        self.assertNotEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_calculate_vat_basic_uk(self):
        """Test basic VAT calculation for UK customer."""
        data = {
            'country_code': 'GB',
            'net_amount': '100.00'
        }

        response = self.client.post(self.url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['country_code'], 'GB')
        self.assertEqual(Decimal(response.data['vat_rate']), Decimal('20.00'))
        self.assertEqual(Decimal(response.data['net_amount']), Decimal('100.00'))
        self.assertEqual(Decimal(response.data['vat_amount']), Decimal('20.00'))
        self.assertEqual(Decimal(response.data['gross_amount']), Decimal('120.00'))

    def test_calculate_vat_basic_ireland(self):
        """Test basic VAT calculation for Ireland customer."""
        data = {
            'country_code': 'IE',
            'net_amount': '100.00'
        }

        response = self.client.post(self.url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(response.data['vat_rate']), Decimal('23.00'))
        self.assertEqual(Decimal(response.data['vat_amount']), Decimal('23.00'))
        self.assertEqual(Decimal(response.data['gross_amount']), Decimal('123.00'))

    def test_calculate_vat_zero_vat_country(self):
        """Test VAT calculation for zero VAT country (ROW)."""
        data = {
            'country_code': 'US',
            'net_amount': '100.00'
        }

        response = self.client.post(self.url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(response.data['vat_rate']), Decimal('0.00'))
        self.assertEqual(Decimal(response.data['vat_amount']), Decimal('0.00'))
        self.assertEqual(Decimal(response.data['gross_amount']), Decimal('100.00'))

    def test_calculate_vat_with_cart_items(self):
        """Test VAT calculation with multiple cart items."""
        data = {
            'country_code': 'GB',
            'cart_items': [
                {'net_price': '50.00', 'quantity': 2},
                {'net_price': '30.00', 'quantity': 1}
            ]
        }

        response = self.client.post(self.url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['country_code'], 'GB')
        self.assertEqual(Decimal(response.data['total_net_amount']), Decimal('130.00'))
        self.assertEqual(Decimal(response.data['total_vat_amount']), Decimal('26.00'))
        self.assertEqual(Decimal(response.data['total_gross_amount']), Decimal('156.00'))
        self.assertEqual(len(response.data['items']), 2)

    def test_calculate_vat_missing_country_code(self):
        """Test error handling when country_code is missing."""
        data = {
            'net_amount': '100.00'
        }

        response = self.client.post(self.url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
        self.assertIn('country_code', response.data['error'].lower())

    def test_calculate_vat_missing_amount_and_items(self):
        """Test error handling when both net_amount and cart_items are missing."""
        data = {
            'country_code': 'GB'
        }

        response = self.client.post(self.url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_calculate_vat_invalid_country_code(self):
        """Test error handling with invalid country code."""
        data = {
            'country_code': 'XX',
            'net_amount': '100.00'
        }

        response = self.client.post(self.url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_calculate_vat_negative_amount(self):
        """Test error handling with negative amount."""
        data = {
            'country_code': 'GB',
            'net_amount': '-100.00'
        }

        response = self.client.post(self.url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_calculate_vat_method_not_allowed(self):
        """Test that only POST method is allowed."""
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_calculate_vat_decimal_precision(self):
        """Test VAT calculation with decimal precision."""
        data = {
            'country_code': 'GB',
            'net_amount': '99.99'
        }

        response = self.client.post(self.url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # 99.99 * 0.20 = 19.998, should round to 20.00
        self.assertEqual(Decimal(response.data['vat_amount']), Decimal('20.00'))
        self.assertEqual(Decimal(response.data['gross_amount']), Decimal('119.99'))

    def test_calculate_vat_with_empty_cart_items(self):
        """Test VAT calculation with empty cart items list."""
        data = {
            'country_code': 'GB',
            'cart_items': []
        }

        response = self.client.post(self.url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(response.data['total_net_amount']), Decimal('0.00'))
        self.assertEqual(Decimal(response.data['total_vat_amount']), Decimal('0.00'))
        self.assertEqual(Decimal(response.data['total_gross_amount']), Decimal('0.00'))
