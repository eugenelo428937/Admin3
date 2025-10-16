"""
Test cases for VAT calculation service.
Following TDD methodology: RED → GREEN → REFACTOR

Test Coverage:
- Calculate VAT for different countries (UK, IE, EU, SA, ROW)
- Handle invalid/missing countries
- Calculate VAT for cart items
- Calculate VAT for order totals
- Edge cases (zero amounts, negative amounts, etc.)
"""
from django.test import TestCase
from django.core.exceptions import ValidationError
from decimal import Decimal
from datetime import date
from utils.models import UtilsRegion, UtilsCountrys, UtilsCountryRegion
from utils.services.vat_service import VATCalculationService


class VATCalculationServiceTestCase(TestCase):
    """Test cases for VATCalculationService (TDD RED Phase)."""

    def setUp(self):
        """Set up test data with VAT regions and countries."""
        # Get or create regions (may already exist from migrations)
        self.region_uk, _ = UtilsRegion.objects.get_or_create(
            code='UK',
            defaults={'name': 'United Kingdom'}
        )
        self.region_ie, _ = UtilsRegion.objects.get_or_create(
            code='IE',
            defaults={'name': 'Ireland'}
        )
        self.region_eu, _ = UtilsRegion.objects.get_or_create(
            code='EU',
            defaults={'name': 'European Union'}
        )
        self.region_sa, _ = UtilsRegion.objects.get_or_create(
            code='SA',
            defaults={'name': 'South Africa'}
        )
        self.region_row, _ = UtilsRegion.objects.get_or_create(
            code='ROW',
            defaults={'name': 'Rest of World'}
        )

        # Get or create countries with VAT rates
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
        self.country_de, _ = UtilsCountrys.objects.get_or_create(
            code='DE',
            defaults={
                'name': 'Germany',
                'vat_percent': Decimal('19.00')
            }
        )
        self.country_za, _ = UtilsCountrys.objects.get_or_create(
            code='ZA',
            defaults={
                'name': 'South Africa',
                'vat_percent': Decimal('15.00')
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
            defaults={'region': self.region_ie}
        )
        UtilsCountryRegion.objects.get_or_create(
            country=self.country_de,
            effective_from=date(2020, 1, 1),
            defaults={'region': self.region_eu}
        )
        UtilsCountryRegion.objects.get_or_create(
            country=self.country_za,
            effective_from=date(2020, 1, 1),
            defaults={'region': self.region_sa}
        )
        UtilsCountryRegion.objects.get_or_create(
            country=self.country_us,
            effective_from=date(2020, 1, 1),
            defaults={'region': self.region_row}
        )

        # Initialize service
        self.vat_service = VATCalculationService()

    def test_calculate_vat_for_uk_customer(self):
        """Test VAT calculation for UK customer (20%)."""
        net_amount = Decimal('100.00')
        result = self.vat_service.calculate_vat(
            country_code='GB',
            net_amount=net_amount
        )

        self.assertEqual(result['country_code'], 'GB')
        self.assertEqual(result['vat_rate'], Decimal('20.00'))
        self.assertEqual(result['net_amount'], Decimal('100.00'))
        self.assertEqual(result['vat_amount'], Decimal('20.00'))
        self.assertEqual(result['gross_amount'], Decimal('120.00'))

    def test_calculate_vat_for_ie_customer(self):
        """Test VAT calculation for Ireland customer (23%)."""
        net_amount = Decimal('100.00')
        result = self.vat_service.calculate_vat(
            country_code='IE',
            net_amount=net_amount
        )

        self.assertEqual(result['vat_rate'], Decimal('23.00'))
        self.assertEqual(result['vat_amount'], Decimal('23.00'))
        self.assertEqual(result['gross_amount'], Decimal('123.00'))

    def test_calculate_vat_for_eu_customer(self):
        """Test VAT calculation for EU customer (Germany, 19%)."""
        net_amount = Decimal('100.00')
        result = self.vat_service.calculate_vat(
            country_code='DE',
            net_amount=net_amount
        )

        self.assertEqual(result['vat_rate'], Decimal('19.00'))
        self.assertEqual(result['vat_amount'], Decimal('19.00'))
        self.assertEqual(result['gross_amount'], Decimal('119.00'))

    def test_calculate_vat_for_sa_customer(self):
        """Test VAT calculation for South Africa customer (15%)."""
        net_amount = Decimal('100.00')
        result = self.vat_service.calculate_vat(
            country_code='ZA',
            net_amount=net_amount
        )

        self.assertEqual(result['vat_rate'], Decimal('15.00'))
        self.assertEqual(result['vat_amount'], Decimal('15.00'))
        self.assertEqual(result['gross_amount'], Decimal('115.00'))

    def test_calculate_vat_for_row_customer(self):
        """Test VAT calculation for Rest of World customer (0%)."""
        net_amount = Decimal('100.00')
        result = self.vat_service.calculate_vat(
            country_code='US',
            net_amount=net_amount
        )

        self.assertEqual(result['vat_rate'], Decimal('0.00'))
        self.assertEqual(result['vat_amount'], Decimal('0.00'))
        self.assertEqual(result['gross_amount'], Decimal('100.00'))

    def test_calculate_vat_with_invalid_country_code(self):
        """Test VAT calculation with invalid country code."""
        with self.assertRaises(ValidationError) as context:
            self.vat_service.calculate_vat(
                country_code='XX',
                net_amount=Decimal('100.00')
            )

        self.assertIn('Country not found', str(context.exception))

    def test_calculate_vat_with_zero_amount(self):
        """Test VAT calculation with zero net amount."""
        result = self.vat_service.calculate_vat(
            country_code='GB',
            net_amount=Decimal('0.00')
        )

        self.assertEqual(result['vat_amount'], Decimal('0.00'))
        self.assertEqual(result['gross_amount'], Decimal('0.00'))

    def test_calculate_vat_with_negative_amount_raises_error(self):
        """Test VAT calculation with negative amount raises validation error."""
        with self.assertRaises(ValidationError) as context:
            self.vat_service.calculate_vat(
                country_code='GB',
                net_amount=Decimal('-100.00')
            )

        self.assertIn('negative', str(context.exception).lower())

    def test_calculate_vat_with_decimal_precision(self):
        """Test VAT calculation maintains decimal precision."""
        net_amount = Decimal('99.99')
        result = self.vat_service.calculate_vat(
            country_code='GB',
            net_amount=net_amount
        )

        # 99.99 * 0.20 = 19.998, should round to 20.00
        self.assertEqual(result['vat_amount'], Decimal('20.00'))
        self.assertEqual(result['gross_amount'], Decimal('119.99'))

    def test_get_vat_rate_by_country_code(self):
        """Test getting VAT rate by country code."""
        rate = self.vat_service.get_vat_rate('GB')
        self.assertEqual(rate, Decimal('20.00'))

        rate = self.vat_service.get_vat_rate('IE')
        self.assertEqual(rate, Decimal('23.00'))

    def test_get_vat_rate_invalid_country_returns_none(self):
        """Test getting VAT rate for invalid country returns None."""
        rate = self.vat_service.get_vat_rate('XX')
        self.assertIsNone(rate)

    def test_calculate_vat_for_cart_items(self):
        """Test VAT calculation for multiple cart items."""
        cart_items = [
            {'net_price': Decimal('50.00'), 'quantity': 2},  # 100.00
            {'net_price': Decimal('30.00'), 'quantity': 1},  # 30.00
        ]

        result = self.vat_service.calculate_vat_for_cart(
            country_code='GB',
            cart_items=cart_items
        )

        total_net = Decimal('130.00')
        expected_vat = Decimal('26.00')  # 130.00 * 0.20

        self.assertEqual(result['total_net_amount'], total_net)
        self.assertEqual(result['total_vat_amount'], expected_vat)
        self.assertEqual(result['total_gross_amount'], Decimal('156.00'))
        self.assertEqual(len(result['items']), 2)

    def test_get_region_by_country_code(self):
        """Test getting region by country code."""
        region = self.vat_service.get_region_by_country('GB')
        self.assertEqual(region, 'UK')

        region = self.vat_service.get_region_by_country('DE')
        self.assertEqual(region, 'EU')

        region = self.vat_service.get_region_by_country('US')
        self.assertEqual(region, 'ROW')

    def test_get_region_invalid_country_returns_none(self):
        """Test getting region for invalid country returns None."""
        region = self.vat_service.get_region_by_country('XX')
        self.assertIsNone(region)

    def test_reverse_vat_calculation(self):
        """Test reverse VAT calculation (from gross to net)."""
        gross_amount = Decimal('120.00')
        result = self.vat_service.reverse_calculate_vat(
            country_code='GB',
            gross_amount=gross_amount
        )

        # gross / (1 + rate) = 120 / 1.20 = 100.00
        self.assertEqual(result['net_amount'], Decimal('100.00'))
        self.assertEqual(result['vat_amount'], Decimal('20.00'))
        self.assertEqual(result['gross_amount'], Decimal('120.00'))
