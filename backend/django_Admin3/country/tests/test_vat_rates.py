"""
Tests for VAT rate registry and country-to-region mapping.

TDD Phase: RED - Write failing tests first
"""
from decimal import Decimal
from django.test import TestCase


class TestVATRates(TestCase):
    """Test VAT_RATES dictionary structure and values."""

    def test_vat_rates_exist(self):
        """Test that VAT_RATES dictionary exists."""
        from country.vat_rates import VAT_RATES
        self.assertIsNotNone(VAT_RATES)
        self.assertIsInstance(VAT_RATES, dict)

    def test_vat_rates_contains_required_regions(self):
        """Test that VAT_RATES contains all required regions."""
        from country.vat_rates import VAT_RATES
        required_regions = ['UK', 'IE', 'SA', 'ROW', 'CH', 'GG']
        for region in required_regions:
            self.assertIn(region, VAT_RATES, f"Missing region: {region}")

    def test_vat_rates_uk_is_decimal(self):
        """Test that UK VAT rate is Decimal type."""
        from country.vat_rates import VAT_RATES
        self.assertIsInstance(VAT_RATES['UK'], Decimal)

    def test_vat_rates_uk_value(self):
        """Test that UK VAT rate is 0.20 (20%)."""
        from country.vat_rates import VAT_RATES
        self.assertEqual(VAT_RATES['UK'], Decimal('0.20'))

    def test_vat_rates_ie_is_decimal(self):
        """Test that IE VAT rate is Decimal type."""
        from country.vat_rates import VAT_RATES
        self.assertIsInstance(VAT_RATES['IE'], Decimal)

    def test_vat_rates_ie_value(self):
        """Test that IE VAT rate is 0.23 (23%)."""
        from country.vat_rates import VAT_RATES
        self.assertEqual(VAT_RATES['IE'], Decimal('0.23'))

    def test_vat_rates_sa_is_decimal(self):
        """Test that SA VAT rate is Decimal type."""
        from country.vat_rates import VAT_RATES
        self.assertIsInstance(VAT_RATES['SA'], Decimal)

    def test_vat_rates_sa_value(self):
        """Test that SA VAT rate is 0.15 (15%)."""
        from country.vat_rates import VAT_RATES
        self.assertEqual(VAT_RATES['SA'], Decimal('0.15'))

    def test_vat_rates_row_is_decimal(self):
        """Test that ROW VAT rate is Decimal type."""
        from country.vat_rates import VAT_RATES
        self.assertIsInstance(VAT_RATES['ROW'], Decimal)

    def test_vat_rates_row_value(self):
        """Test that ROW VAT rate is 0.00 (0%)."""
        from country.vat_rates import VAT_RATES
        self.assertEqual(VAT_RATES['ROW'], Decimal('0.00'))

    def test_vat_rates_ch_is_decimal(self):
        """Test that CH VAT rate is Decimal type."""
        from country.vat_rates import VAT_RATES
        self.assertIsInstance(VAT_RATES['CH'], Decimal)

    def test_vat_rates_ch_value(self):
        """Test that CH VAT rate is 0.00 (0%)."""
        from country.vat_rates import VAT_RATES
        self.assertEqual(VAT_RATES['CH'], Decimal('0.00'))

    def test_vat_rates_gg_is_decimal(self):
        """Test that GG VAT rate is Decimal type."""
        from country.vat_rates import VAT_RATES
        self.assertIsInstance(VAT_RATES['GG'], Decimal)

    def test_vat_rates_gg_value(self):
        """Test that GG VAT rate is 0.00 (0%)."""
        from country.vat_rates import VAT_RATES
        self.assertEqual(VAT_RATES['GG'], Decimal('0.00'))

    def test_vat_rates_all_decimal_precision(self):
        """Test that all VAT rates have 2 decimal places precision."""
        from country.vat_rates import VAT_RATES
        for region, rate in VAT_RATES.items():
            # Check that rate has exactly 2 decimal places
            rate_str = str(rate)
            if '.' in rate_str:
                decimal_places = len(rate_str.split('.')[1])
                self.assertEqual(
                    decimal_places, 2,
                    f"Region {region} rate {rate} does not have 2 decimal places"
                )

    def test_vat_rates_no_float_values(self):
        """Test that no VAT rates are float (must be Decimal)."""
        from country.vat_rates import VAT_RATES
        for region, rate in VAT_RATES.items():
            self.assertNotIsInstance(
                rate, float,
                f"Region {region} rate is float, must be Decimal"
            )


class TestREGIONMAP(TestCase):
    """Test REGION_MAP dictionary structure and country mappings."""

    def test_region_map_exists(self):
        """Test that REGION_MAP dictionary exists."""
        from country.vat_rates import REGION_MAP
        self.assertIsNotNone(REGION_MAP)
        self.assertIsInstance(REGION_MAP, dict)

    def test_region_map_contains_required_regions(self):
        """Test that REGION_MAP contains all required regions."""
        from country.vat_rates import REGION_MAP
        required_regions = ['UK', 'IE', 'EC', 'SA', 'CH', 'GG']
        for region in required_regions:
            self.assertIn(region, REGION_MAP, f"Missing region: {region}")

    def test_region_map_uk_contains_gb(self):
        """Test that UK region contains GB country code."""
        from country.vat_rates import REGION_MAP
        self.assertIn('GB', REGION_MAP['UK'])

    def test_region_map_uk_contains_uk(self):
        """Test that UK region contains UK country code."""
        from country.vat_rates import REGION_MAP
        self.assertIn('UK', REGION_MAP['UK'])

    def test_region_map_ie_contains_ie(self):
        """Test that IE region contains IE country code."""
        from country.vat_rates import REGION_MAP
        self.assertIn('IE', REGION_MAP['IE'])

    def test_region_map_sa_contains_za(self):
        """Test that SA region contains ZA country code."""
        from country.vat_rates import REGION_MAP
        self.assertIn('ZA', REGION_MAP['SA'])

    def test_region_map_ch_contains_ch(self):
        """Test that CH region contains CH country code."""
        from country.vat_rates import REGION_MAP
        self.assertIn('CH', REGION_MAP['CH'])

    def test_region_map_gg_contains_gg(self):
        """Test that GG region contains GG country code."""
        from country.vat_rates import REGION_MAP
        self.assertIn('GG', REGION_MAP['GG'])

    def test_region_map_ec_contains_27_countries(self):
        """Test that EC region contains all 27 EU country codes."""
        from country.vat_rates import REGION_MAP
        expected_ec_countries = {
            'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
            'DE', 'GR', 'HU', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL',
            'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'IE'  # IE included in EC
        }
        self.assertEqual(REGION_MAP['EC'], expected_ec_countries)

    def test_region_map_values_are_sets(self):
        """Test that all REGION_MAP values are sets."""
        from country.vat_rates import REGION_MAP
        for region, country_codes in REGION_MAP.items():
            self.assertIsInstance(
                country_codes, set,
                f"Region {region} country codes must be a set"
            )


class TestMapCountryToRegion(TestCase):
    """Test map_country_to_region() function."""

    def test_map_country_to_region_uk_gb(self):
        """Test GB maps to UK region."""
        from country.vat_rates import map_country_to_region
        self.assertEqual(map_country_to_region('GB'), 'UK')

    def test_map_country_to_region_uk_uk(self):
        """Test UK maps to UK region."""
        from country.vat_rates import map_country_to_region
        self.assertEqual(map_country_to_region('UK'), 'UK')

    def test_map_country_to_region_uk_lowercase(self):
        """Test lowercase gb maps to UK region (case insensitive)."""
        from country.vat_rates import map_country_to_region
        self.assertEqual(map_country_to_region('gb'), 'UK')

    def test_map_country_to_region_ie(self):
        """Test IE maps to IE region."""
        from country.vat_rates import map_country_to_region
        self.assertEqual(map_country_to_region('IE'), 'IE')

    def test_map_country_to_region_ec_germany(self):
        """Test DE (Germany) maps to EC region."""
        from country.vat_rates import map_country_to_region
        self.assertEqual(map_country_to_region('DE'), 'EC')

    def test_map_country_to_region_ec_france(self):
        """Test FR (France) maps to EC region."""
        from country.vat_rates import map_country_to_region
        self.assertEqual(map_country_to_region('FR'), 'EC')

    def test_map_country_to_region_sa(self):
        """Test ZA (South Africa) maps to SA region."""
        from country.vat_rates import map_country_to_region
        self.assertEqual(map_country_to_region('ZA'), 'SA')

    def test_map_country_to_region_ch(self):
        """Test CH (Switzerland) maps to CH region."""
        from country.vat_rates import map_country_to_region
        self.assertEqual(map_country_to_region('CH'), 'CH')

    def test_map_country_to_region_gg(self):
        """Test GG (Guernsey) maps to GG region."""
        from country.vat_rates import map_country_to_region
        self.assertEqual(map_country_to_region('GG'), 'GG')

    def test_map_country_to_region_row_us(self):
        """Test US maps to ROW region (fallback)."""
        from country.vat_rates import map_country_to_region
        self.assertEqual(map_country_to_region('US'), 'ROW')

    def test_map_country_to_region_row_ca(self):
        """Test CA maps to ROW region (fallback)."""
        from country.vat_rates import map_country_to_region
        self.assertEqual(map_country_to_region('CA'), 'ROW')

    def test_map_country_to_region_row_unknown(self):
        """Test unknown country code maps to ROW region (fallback)."""
        from country.vat_rates import map_country_to_region
        self.assertEqual(map_country_to_region('UNKNOWN'), 'ROW')

    def test_map_country_to_region_case_insensitive(self):
        """Test case insensitivity."""
        from country.vat_rates import map_country_to_region
        self.assertEqual(map_country_to_region('de'), 'EC')
        self.assertEqual(map_country_to_region('za'), 'SA')


class TestGetVATRate(TestCase):
    """Test get_vat_rate() function with product classification."""

    def test_get_vat_rate_uk_standard(self):
        """Test UK standard rate (20%) for non-eBook products."""
        from country.vat_rates import get_vat_rate
        classification = {'is_ebook': False}
        rate = get_vat_rate('UK', classification)
        self.assertEqual(rate, Decimal('0.20'))
        self.assertIsInstance(rate, Decimal)

    def test_get_vat_rate_uk_ebook_zero(self):
        """Test UK eBook gets 0% VAT (post-2020 rule)."""
        from country.vat_rates import get_vat_rate
        classification = {'is_ebook': True}
        rate = get_vat_rate('UK', classification)
        self.assertEqual(rate, Decimal('0.00'))
        self.assertIsInstance(rate, Decimal)

    def test_get_vat_rate_ie_standard(self):
        """Test IE standard rate (23%)."""
        from country.vat_rates import get_vat_rate
        classification = {}
        rate = get_vat_rate('IE', classification)
        self.assertEqual(rate, Decimal('0.23'))

    def test_get_vat_rate_row_digital_zero(self):
        """Test ROW digital products get 0% VAT."""
        from country.vat_rates import get_vat_rate
        classification = {'is_digital': True}
        rate = get_vat_rate('ROW', classification)
        self.assertEqual(rate, Decimal('0.00'))

    def test_get_vat_rate_row_physical(self):
        """Test ROW physical products get 0% VAT (ROW default)."""
        from country.vat_rates import get_vat_rate
        classification = {'is_digital': False}
        rate = get_vat_rate('ROW', classification)
        self.assertEqual(rate, Decimal('0.00'))

    def test_get_vat_rate_sa_standard(self):
        """Test SA standard rate (15%)."""
        from country.vat_rates import get_vat_rate
        classification = {}
        rate = get_vat_rate('SA', classification)
        self.assertEqual(rate, Decimal('0.15'))

    def test_get_vat_rate_sa_live_tutorial(self):
        """Test SA live tutorial gets 15% VAT."""
        from country.vat_rates import get_vat_rate
        classification = {'is_live_tutorial': True}
        rate = get_vat_rate('SA', classification)
        self.assertEqual(rate, Decimal('0.15'))

    def test_get_vat_rate_ch_zero(self):
        """Test CH gets 0% VAT."""
        from country.vat_rates import get_vat_rate
        classification = {}
        rate = get_vat_rate('CH', classification)
        self.assertEqual(rate, Decimal('0.00'))

    def test_get_vat_rate_gg_zero(self):
        """Test GG gets 0% VAT."""
        from country.vat_rates import get_vat_rate
        classification = {}
        rate = get_vat_rate('GG', classification)
        self.assertEqual(rate, Decimal('0.00'))

    def test_get_vat_rate_returns_decimal(self):
        """Test all return values are Decimal type."""
        from country.vat_rates import get_vat_rate
        test_cases = [
            ('UK', {}),
            ('IE', {}),
            ('SA', {}),
            ('ROW', {'is_digital': True}),
            ('EC', {}),  # EC not yet implemented, should return default
        ]
        for region, classification in test_cases:
            rate = get_vat_rate(region, classification)
            self.assertIsInstance(rate, Decimal, f"Rate for {region} must be Decimal")

    def test_get_vat_rate_empty_classification(self):
        """Test with empty classification dict returns region default."""
        from country.vat_rates import get_vat_rate
        rate = get_vat_rate('UK', {})
        self.assertEqual(rate, Decimal('0.20'))

    def test_get_vat_rate_none_classification_values(self):
        """Test with None values in classification dict."""
        from country.vat_rates import get_vat_rate
        classification = {'is_ebook': None, 'is_digital': None}
        rate = get_vat_rate('UK', classification)
        # Should treat None as False and return standard UK rate
        self.assertEqual(rate, Decimal('0.20'))