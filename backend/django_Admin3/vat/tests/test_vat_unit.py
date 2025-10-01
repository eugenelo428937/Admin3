"""
VAT Unit Tests - Epic 3 Phase 6
Test Matrix Stage 1: Unit Tests for VAT calculation functions

Tests Phase 1 functions in isolation:
- map_country_to_region()
- get_vat_rate()
- calculate_vat_amount()

Test IDs: UT01-UT15+
"""

from decimal import Decimal
from django.test import TestCase
from country.vat_rates import map_country_to_region, get_vat_rate, VAT_RATES, REGION_MAP
from rules_engine.custom_functions import calculate_vat_amount


class TestMapCountryToRegion(TestCase):
    """Test country to region mapping function."""

    def test_ut01_gb_maps_to_uk(self):
        """UT01: GB country code maps to UK region."""
        result = map_country_to_region('GB')
        self.assertEqual(result, 'UK')

    def test_ut01b_uk_maps_to_uk(self):
        """UT01b: UK country code maps to UK region."""
        result = map_country_to_region('UK')
        self.assertEqual(result, 'UK')

    def test_de_maps_to_eu(self):
        """DE country code maps to EU region."""
        result = map_country_to_region('DE')
        self.assertEqual(result, 'EU')

    def test_fr_maps_to_eu(self):
        """FR country code maps to EU region."""
        result = map_country_to_region('FR')
        self.assertEqual(result, 'EU')

    def test_au_maps_to_row(self):
        """AU country code maps to ROW region."""
        result = map_country_to_region('AU')
        self.assertEqual(result, 'ROW')

    def test_us_maps_to_row(self):
        """US country code maps to ROW region."""
        result = map_country_to_region('US')
        self.assertEqual(result, 'ROW')

    def test_za_maps_to_sa(self):
        """ZA country code maps to SA region."""
        result = map_country_to_region('ZA')
        self.assertEqual(result, 'SA')

    def test_ie_maps_to_ie(self):
        """IE country code maps to IE region."""
        result = map_country_to_region('IE')
        self.assertEqual(result, 'IE')

    def test_ch_maps_to_ch(self):
        """CH (Switzerland) maps to CH region."""
        result = map_country_to_region('CH')
        self.assertEqual(result, 'CH')

    def test_gg_maps_to_gg(self):
        """GG (Guernsey) maps to GG region."""
        result = map_country_to_region('GG')
        self.assertEqual(result, 'GG')

    def test_case_insensitive(self):
        """Country codes are case insensitive."""
        self.assertEqual(map_country_to_region('gb'), 'UK')
        self.assertEqual(map_country_to_region('Gb'), 'UK')
        self.assertEqual(map_country_to_region('GB'), 'UK')

    def test_unknown_country_maps_to_row(self):
        """Unknown country codes map to ROW."""
        result = map_country_to_region('XX')
        self.assertEqual(result, 'ROW')


class TestGetVATRate(TestCase):
    """Test VAT rate retrieval function."""

    def test_ut02_uk_ebook_zero_rate(self):
        """UT02: UK eBook has 0% VAT rate."""
        classification = {'is_ebook': True}
        result = get_vat_rate('UK', classification)
        self.assertEqual(result, Decimal('0.00'))

    def test_uk_material_standard_rate(self):
        """UK material (non-ebook) has 20% VAT."""
        classification = {'is_ebook': False, 'is_material': True}
        result = get_vat_rate('UK', classification)
        self.assertEqual(result, Decimal('0.20'))

    def test_uk_marking_standard_rate(self):
        """UK marking product has 20% VAT."""
        classification = {'is_marking': True}
        result = get_vat_rate('UK', classification)
        self.assertEqual(result, Decimal('0.20'))

    def test_ut03_row_digital_zero_rate(self):
        """UT03: ROW digital product has 0% VAT."""
        classification = {'is_digital': True}
        result = get_vat_rate('ROW', classification)
        self.assertEqual(result, Decimal('0.00'))

    def test_row_material_zero_rate(self):
        """ROW material (non-digital) has 0% VAT."""
        classification = {'is_digital': False, 'is_material': True}
        result = get_vat_rate('ROW', classification)
        self.assertEqual(result, Decimal('0.00'))

    def test_ut04_sa_tutorial_15_rate(self):
        """UT04: SA tutorial has 15% VAT."""
        classification = {'is_live_tutorial': True}
        result = get_vat_rate('SA', classification)
        self.assertEqual(result, Decimal('0.15'))

    def test_sa_material_15_rate(self):
        """SA material has 15% VAT."""
        classification = {'is_material': True}
        result = get_vat_rate('SA', classification)
        self.assertEqual(result, Decimal('0.15'))

    def test_eu_material_zero_rate(self):
        """EU material has 0% VAT (ROW treatment)."""
        classification = {'is_material': True}
        result = get_vat_rate('EU', classification)
        self.assertEqual(result, Decimal('0.00'))

    def test_ie_material_standard_rate(self):
        """IE material has 23% VAT."""
        classification = {'is_material': True}
        result = get_vat_rate('IE', classification)
        self.assertEqual(result, Decimal('0.23'))

    def test_ch_zero_rate(self):
        """Switzerland has 0% VAT (treated as ROW)."""
        classification = {'is_material': True}
        result = get_vat_rate('CH', classification)
        self.assertEqual(result, Decimal('0.00'))

    def test_gg_zero_rate(self):
        """Guernsey has 0% VAT (treated as ROW)."""
        classification = {'is_material': True}
        result = get_vat_rate('GG', classification)
        self.assertEqual(result, Decimal('0.00'))

    def test_empty_classification(self):
        """Empty classification returns default rate for region."""
        classification = {}
        uk_result = get_vat_rate('UK', classification)
        self.assertEqual(uk_result, Decimal('0.20'))

    def test_none_classification(self):
        """None classification returns default rate for region."""
        uk_result = get_vat_rate('UK', None)
        self.assertEqual(uk_result, Decimal('0.20'))


class TestCalculateVATAmount(TestCase):
    """Test VAT amount calculation with rounding."""

    def test_ut05_rounding_half_up(self):
        """UT05: VAT amount rounds correctly using ROUND_HALF_UP."""
        result = calculate_vat_amount(Decimal('50.555'), Decimal('0.20'))
        self.assertEqual(result, Decimal('10.11'))

    def test_standard_calculation(self):
        """Standard VAT calculation: 100 * 0.20 = 20.00."""
        result = calculate_vat_amount(Decimal('100.00'), Decimal('0.20'))
        self.assertEqual(result, Decimal('20.00'))

    def test_zero_vat_rate(self):
        """Zero VAT rate returns zero amount."""
        result = calculate_vat_amount(Decimal('100.00'), Decimal('0.00'))
        self.assertEqual(result, Decimal('0.00'))

    def test_sa_15_percent_vat(self):
        """SA 15% VAT calculation."""
        result = calculate_vat_amount(Decimal('100.00'), Decimal('0.15'))
        self.assertEqual(result, Decimal('15.00'))

    def test_ie_23_percent_vat(self):
        """IE 23% VAT calculation."""
        result = calculate_vat_amount(Decimal('100.00'), Decimal('0.23'))
        self.assertEqual(result, Decimal('23.00'))

    def test_decimal_precision_maintained(self):
        """Decimal precision is maintained to 2 places."""
        result = calculate_vat_amount(Decimal('33.33'), Decimal('0.20'))
        self.assertEqual(result, Decimal('6.67'))
        self.assertEqual(result.as_tuple().exponent, -2)

    def test_rounding_up_case(self):
        """Test rounding up when needed."""
        # 10.005 should round to 10.01
        result = calculate_vat_amount(Decimal('50.025'), Decimal('0.20'))
        self.assertEqual(result, Decimal('10.01'))

    def test_rounding_down_case(self):
        """Test rounding down when needed."""
        # 10.004 should round to 10.00
        result = calculate_vat_amount(Decimal('50.020'), Decimal('0.20'))
        self.assertEqual(result, Decimal('10.00'))

    def test_string_input_conversion(self):
        """Function handles string inputs by converting to Decimal."""
        result = calculate_vat_amount('100.00', '0.20')
        self.assertEqual(result, Decimal('20.00'))
        self.assertIsInstance(result, Decimal)

    def test_small_amounts(self):
        """Test calculation with small amounts."""
        result = calculate_vat_amount(Decimal('1.00'), Decimal('0.20'))
        self.assertEqual(result, Decimal('0.20'))

    def test_large_amounts(self):
        """Test calculation with large amounts."""
        result = calculate_vat_amount(Decimal('10000.00'), Decimal('0.20'))
        self.assertEqual(result, Decimal('2000.00'))

    def test_fractional_net_amount(self):
        """Test with fractional net amounts."""
        result = calculate_vat_amount(Decimal('12.34'), Decimal('0.20'))
        self.assertEqual(result, Decimal('2.47'))

    def test_result_type_is_decimal(self):
        """Result is always Decimal type."""
        result = calculate_vat_amount(Decimal('100.00'), Decimal('0.20'))
        self.assertIsInstance(result, Decimal)

    def test_exact_half_rounding(self):
        """Test rounding when exactly at .5 (should round up)."""
        # 50.025 * 0.20 = 10.005 → rounds to 10.01
        result = calculate_vat_amount(Decimal('50.025'), Decimal('0.20'))
        self.assertEqual(result, Decimal('10.01'))


class TestVATRatesConfiguration(TestCase):
    """Test VAT_RATES configuration dictionary."""

    def test_vat_rates_contains_uk(self):
        """VAT_RATES contains UK entry."""
        self.assertIn('UK', VAT_RATES)
        self.assertEqual(VAT_RATES['UK'], Decimal('0.20'))

    def test_vat_rates_contains_ie(self):
        """VAT_RATES contains IE entry."""
        self.assertIn('IE', VAT_RATES)
        self.assertEqual(VAT_RATES['IE'], Decimal('0.23'))

    def test_vat_rates_contains_sa(self):
        """VAT_RATES contains SA entry."""
        self.assertIn('SA', VAT_RATES)
        self.assertEqual(VAT_RATES['SA'], Decimal('0.15'))

    def test_vat_rates_contains_row(self):
        """VAT_RATES contains ROW entry."""
        self.assertIn('ROW', VAT_RATES)
        self.assertEqual(VAT_RATES['ROW'], Decimal('0.00'))

    def test_vat_rates_contains_ch(self):
        """VAT_RATES contains CH entry."""
        self.assertIn('CH', VAT_RATES)
        self.assertEqual(VAT_RATES['CH'], Decimal('0.00'))

    def test_vat_rates_contains_gg(self):
        """VAT_RATES contains GG entry."""
        self.assertIn('GG', VAT_RATES)
        self.assertEqual(VAT_RATES['GG'], Decimal('0.00'))

    def test_all_rates_are_decimal(self):
        """All VAT rates are Decimal type."""
        for region, rate in VAT_RATES.items():
            self.assertIsInstance(rate, Decimal, f"Rate for {region} is not Decimal")

    def test_all_rates_non_negative(self):
        """All VAT rates are non-negative."""
        for region, rate in VAT_RATES.items():
            self.assertGreaterEqual(rate, Decimal('0.00'), f"Rate for {region} is negative")


class TestRegionMapConfiguration(TestCase):
    """Test REGION_MAP configuration dictionary."""

    def test_region_map_contains_uk(self):
        """REGION_MAP contains UK entry."""
        self.assertIn('UK', REGION_MAP)
        self.assertIn('GB', REGION_MAP['UK'])
        self.assertIn('UK', REGION_MAP['UK'])

    def test_region_map_contains_eu(self):
        """REGION_MAP contains EU entry."""
        self.assertIn('EU', REGION_MAP)
        self.assertIn('DE', REGION_MAP['EU'])
        self.assertIn('FR', REGION_MAP['EU'])

    def test_region_map_contains_sa(self):
        """REGION_MAP contains SA entry."""
        self.assertIn('SA', REGION_MAP)
        self.assertIn('ZA', REGION_MAP['SA'])

    def test_region_map_contains_ie(self):
        """REGION_MAP contains IE entry."""
        self.assertIn('IE', REGION_MAP)
        self.assertIn('IE', REGION_MAP['IE'])

    def test_region_map_all_values_are_sets(self):
        """All REGION_MAP values are sets."""
        for region, codes in REGION_MAP.items():
            self.assertIsInstance(codes, set, f"REGION_MAP[{region}] is not a set")

    def test_no_duplicate_country_codes(self):
        """No country code appears in multiple regions."""
        all_codes = []
        for codes in REGION_MAP.values():
            all_codes.extend(codes)

        self.assertEqual(len(all_codes), len(set(all_codes)), "Duplicate country codes found")
