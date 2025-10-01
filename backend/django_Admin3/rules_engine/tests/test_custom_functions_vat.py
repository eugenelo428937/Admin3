"""
Tests for VAT custom functions in Rules Engine.

TDD Phase: RED - Write failing tests first
"""
from decimal import Decimal
from django.test import TestCase


class TestVATFunctionsRegistered(TestCase):
    """Test that VAT functions are registered in FUNCTION_REGISTRY."""

    def test_function_registry_exists(self):
        """Test that FUNCTION_REGISTRY exists."""
        from rules_engine.custom_functions import FUNCTION_REGISTRY
        self.assertIsNotNone(FUNCTION_REGISTRY)
        self.assertIsInstance(FUNCTION_REGISTRY, dict)

    def test_get_vat_rate_registered(self):
        """Test that get_vat_rate is registered."""
        from rules_engine.custom_functions import FUNCTION_REGISTRY
        self.assertIn('get_vat_rate', FUNCTION_REGISTRY)

    def test_map_country_to_region_registered(self):
        """Test that map_country_to_region is registered."""
        from rules_engine.custom_functions import FUNCTION_REGISTRY
        self.assertIn('map_country_to_region', FUNCTION_REGISTRY)

    def test_calculate_vat_amount_registered(self):
        """Test that calculate_vat_amount is registered."""
        from rules_engine.custom_functions import FUNCTION_REGISTRY
        self.assertIn('calculate_vat_amount', FUNCTION_REGISTRY)


class TestVATFunctionsCallable(TestCase):
    """Test that VAT functions are callable via registry."""

    def test_get_vat_rate_callable(self):
        """Test that get_vat_rate can be called via registry."""
        from rules_engine.custom_functions import FUNCTION_REGISTRY
        func = FUNCTION_REGISTRY['get_vat_rate']
        result = func('UK', {'is_ebook': True})
        self.assertEqual(result, Decimal('0.00'))

    def test_map_country_to_region_callable(self):
        """Test that map_country_to_region can be called via registry."""
        from rules_engine.custom_functions import FUNCTION_REGISTRY
        func = FUNCTION_REGISTRY['map_country_to_region']
        result = func('GB')
        self.assertEqual(result, 'UK')

    def test_calculate_vat_amount_callable(self):
        """Test that calculate_vat_amount can be called via registry."""
        from rules_engine.custom_functions import FUNCTION_REGISTRY
        func = FUNCTION_REGISTRY['calculate_vat_amount']
        result = func(Decimal('100.00'), Decimal('0.20'))
        self.assertEqual(result, Decimal('20.00'))


class TestCalculateVATAmount(TestCase):
    """Test calculate_vat_amount function implementation."""

    def test_calculate_vat_amount_basic(self):
        """Test basic VAT calculation."""
        from rules_engine.custom_functions import FUNCTION_REGISTRY
        calc = FUNCTION_REGISTRY['calculate_vat_amount']
        result = calc(Decimal('100.00'), Decimal('0.20'))
        self.assertEqual(result, Decimal('20.00'))
        self.assertIsInstance(result, Decimal)

    def test_calculate_vat_amount_rounding_up(self):
        """Test rounding up (ROUND_HALF_UP)."""
        from rules_engine.custom_functions import FUNCTION_REGISTRY
        calc = FUNCTION_REGISTRY['calculate_vat_amount']
        # 50.555 * 0.20 = 10.111 → rounds to 10.11
        result = calc(Decimal('50.555'), Decimal('0.20'))
        self.assertEqual(result, Decimal('10.11'))

    def test_calculate_vat_amount_rounding_down(self):
        """Test rounding down."""
        from rules_engine.custom_functions import FUNCTION_REGISTRY
        calc = FUNCTION_REGISTRY['calculate_vat_amount']
        # 50.554 * 0.20 = 10.1108 → rounds to 10.11
        result = calc(Decimal('50.554'), Decimal('0.20'))
        self.assertEqual(result, Decimal('10.11'))

    def test_calculate_vat_amount_zero_rate(self):
        """Test zero VAT rate."""
        from rules_engine.custom_functions import FUNCTION_REGISTRY
        calc = FUNCTION_REGISTRY['calculate_vat_amount']
        result = calc(Decimal('100.00'), Decimal('0.00'))
        self.assertEqual(result, Decimal('0.00'))

    def test_calculate_vat_amount_string_inputs(self):
        """Test with string inputs (should convert to Decimal)."""
        from rules_engine.custom_functions import FUNCTION_REGISTRY
        calc = FUNCTION_REGISTRY['calculate_vat_amount']
        result = calc('100.00', '0.20')
        self.assertEqual(result, Decimal('20.00'))

    def test_calculate_vat_amount_precision(self):
        """Test result has 2 decimal places."""
        from rules_engine.custom_functions import FUNCTION_REGISTRY
        calc = FUNCTION_REGISTRY['calculate_vat_amount']
        result = calc(Decimal('100.00'), Decimal('0.20'))
        # Check that result has exactly 2 decimal places
        result_str = str(result)
        self.assertIn('.', result_str)
        decimal_places = len(result_str.split('.')[1])
        self.assertEqual(decimal_places, 2)