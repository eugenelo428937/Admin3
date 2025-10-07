"""
Test cases for VAT calculation integration with rules engine.
Following TDD methodology: RED → GREEN → REFACTOR

Test Coverage:
- VAT calculation via rules engine entry point
- VAT custom function integration
- Cart VAT calculation through rules
- Order VAT calculation through rules
"""
from django.test import TestCase
from decimal import Decimal
from datetime import date
from utils.models import UtilsRegion, UtilsCountrys, UtilsCountryRegion
from rules_engine.custom_functions import calculate_vat_for_context
from rules_engine.services.rule_engine import rule_engine


class VATRulesEngineIntegrationTestCase(TestCase):
    """Test cases for VAT integration with rules engine (TDD RED Phase)."""

    def setUp(self):
        """Set up test data."""
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
            country=self.country_us,
            effective_from=date(2020, 1, 1),
            defaults={'region': self.region_row}
        )

    def test_calculate_vat_custom_function_basic(self):
        """Test calculate_vat_for_context custom function with basic input."""
        context = {
            'country_code': 'GB',
            'net_amount': Decimal('100.00')
        }

        result = calculate_vat_for_context(context, {})

        self.assertEqual(result['country_code'], 'GB')
        self.assertEqual(result['vat_rate'], Decimal('20.00'))
        self.assertEqual(result['net_amount'], Decimal('100.00'))
        self.assertEqual(result['vat_amount'], Decimal('20.00'))
        self.assertEqual(result['gross_amount'], Decimal('120.00'))

    def test_calculate_vat_custom_function_with_cart_items(self):
        """Test calculate_vat_for_context with cart items."""
        context = {
            'country_code': 'GB',
            'cart_items': [
                {'net_price': Decimal('50.00'), 'quantity': 2},
                {'net_price': Decimal('30.00'), 'quantity': 1}
            ]
        }

        result = calculate_vat_for_context(context, {})

        self.assertEqual(result['total_net_amount'], Decimal('130.00'))
        self.assertEqual(result['total_vat_amount'], Decimal('26.00'))
        self.assertEqual(result['total_gross_amount'], Decimal('156.00'))

    def test_calculate_vat_custom_function_zero_vat_country(self):
        """Test calculate_vat_for_context with zero VAT country."""
        context = {
            'country_code': 'US',
            'net_amount': Decimal('100.00')
        }

        result = calculate_vat_for_context(context, {})

        self.assertEqual(result['vat_rate'], Decimal('0.00'))
        self.assertEqual(result['vat_amount'], Decimal('0.00'))
        self.assertEqual(result['gross_amount'], Decimal('100.00'))

    def test_calculate_vat_custom_function_invalid_country(self):
        """Test calculate_vat_for_context with invalid country code."""
        context = {
            'country_code': 'XX',
            'net_amount': Decimal('100.00')
        }

        result = calculate_vat_for_context(context, {})

        # Should return error result
        self.assertIn('error', result)
        self.assertIn('Country not found', result['error'])

    def test_calculate_vat_custom_function_missing_country_code(self):
        """Test calculate_vat_for_context without country code."""
        context = {
            'net_amount': Decimal('100.00')
        }

        result = calculate_vat_for_context(context, {})

        # Should return error result
        self.assertIn('error', result)

    def test_calculate_vat_with_params_override(self):
        """Test calculate_vat_for_context with params override."""
        context = {
            'country_code': 'US',  # Context has US
            'net_amount': Decimal('100.00')
        }

        params = {
            'country_code': 'GB'  # Params override to GB
        }

        result = calculate_vat_for_context(context, params)

        # Should use GB from params
        self.assertEqual(result['country_code'], 'GB')
        self.assertEqual(result['vat_rate'], Decimal('20.00'))
        self.assertEqual(result['vat_amount'], Decimal('20.00'))
