"""
Coverage tests for rules_engine/custom_functions.py

Covers:
- apply_tutorial_booking_fee (no cart_id, cart not found, fee already exists, create fee, exception)
- lookup_region (success, no mapping, country not found)
- lookup_vat_rate (success, null vat_percent, country not found)
- calculate_vat_amount (standard, string inputs)
- add_decimals (standard)
- calculate_vat_for_context (no country_code, cart items, single amount, no amount, exception)
- FUNCTION_REGISTRY existence
"""

from decimal import Decimal
from unittest.mock import patch, MagicMock

from django.test import TestCase

from rules_engine.custom_functions import (
    apply_tutorial_booking_fee,
    lookup_region,
    lookup_vat_rate,
    calculate_vat_amount,
    add_decimals,
    calculate_vat_for_context,
    FUNCTION_REGISTRY,
)


# ===========================================================================
# apply_tutorial_booking_fee
# ===========================================================================

class TestApplyTutorialBookingFee(TestCase):
    """Tests for apply_tutorial_booking_fee function."""

    def test_no_cart_id_returns_test_mode(self):
        """When no cart_id, should return test mode success."""
        result = apply_tutorial_booking_fee([], {})
        self.assertTrue(result['success'])
        self.assertTrue(result['fee_applied'])
        self.assertEqual(result['fee_id'], 'test_fee_id')
        self.assertIn('TEST MODE', result['message'])

    def test_custom_params_test_mode(self):
        """Should use custom fee_amount and fee_description in test mode."""
        params = {
            'fee_amount': 5.00,
            'fee_description': 'RE Custom Fee',
        }
        result = apply_tutorial_booking_fee([], params)
        self.assertTrue(result['success'])
        self.assertEqual(result['fee_amount'], 5.00)
        self.assertEqual(result['fee_description'], 'RE Custom Fee')
        self.assertIn('RE Custom Fee', result['message'])

    @patch('cart.models.CartFee')
    @patch('cart.models.Cart')
    def test_cart_not_found(self, MockCart, MockCartFee):
        """When cart_id provided but cart not found, should return error."""
        MockCart.DoesNotExist = Exception
        MockCart.objects.get.side_effect = MockCart.DoesNotExist('Not found')
        params = {'cart_id': 999, 'rule_id': 1}
        result = apply_tutorial_booking_fee([], params)
        self.assertFalse(result['success'])
        self.assertIn('999', result.get('error', ''))

    @patch('cart.models.CartFee')
    @patch('cart.models.Cart')
    def test_fee_already_exists(self, MockCart, MockCartFee):
        """When fee already exists, should return existing fee info."""
        mock_cart = MagicMock()
        mock_cart.id = 1
        MockCart.objects.get.return_value = mock_cart
        MockCart.DoesNotExist = Exception

        mock_fee = MagicMock()
        mock_fee.id = 42
        mock_fee.amount = Decimal('1.00')
        MockCartFee.objects.filter.return_value.first.return_value = mock_fee

        params = {'cart_id': 1, 'rule_id': 10}
        result = apply_tutorial_booking_fee([], params)
        self.assertTrue(result['success'])
        self.assertFalse(result['fee_applied'])
        self.assertEqual(result['fee_id'], 42)
        self.assertIn('already exists', result['message'])

    @patch('cart.models.CartFee')
    @patch('cart.models.Cart')
    def test_create_fee_success(self, MockCart, MockCartFee):
        """When no existing fee, should create new fee."""
        mock_cart = MagicMock()
        mock_cart.id = 1
        MockCart.objects.get.return_value = mock_cart
        MockCart.DoesNotExist = Exception

        # No existing fee
        MockCartFee.objects.filter.return_value.first.return_value = None

        # New fee created
        mock_new_fee = MagicMock()
        mock_new_fee.id = 100
        mock_new_fee.description = 'One-time booking fee'
        MockCartFee.objects.create.return_value = mock_new_fee

        params = {
            'cart_id': 1,
            'rule_id': 10,
            'rule_name': 'RE Tutorial Fee',
            'payment_method': 'card',
            'timestamp': '2026-01-01T00:00:00',
        }
        result = apply_tutorial_booking_fee([], params)
        self.assertTrue(result['success'])
        self.assertTrue(result['fee_applied'])
        self.assertEqual(result['fee_id'], 100)
        self.assertIn('fee_details', result)

    @patch('cart.models.CartFee')
    @patch('cart.models.Cart')
    def test_exception_handling(self, MockCart, MockCartFee):
        """Should handle unexpected exceptions gracefully."""
        MockCart.DoesNotExist = Exception
        MockCart.objects.get.side_effect = RuntimeError('DB connection lost')
        params = {'cart_id': 1}
        result = apply_tutorial_booking_fee([], params)
        self.assertFalse(result['success'])
        self.assertIn('error', result)


# ===========================================================================
# lookup_region
# ===========================================================================

class TestLookupRegion(TestCase):
    """Tests for lookup_region function."""

    @patch('utils.models.UtilsCountryRegion')
    @patch('utils.models.UtilsCountrys')
    def test_lookup_region_success(self, MockCountrys, MockCountryRegion):
        """Should return region code for valid country."""
        mock_country = MagicMock()
        MockCountrys.objects.get.return_value = mock_country
        MockCountrys.DoesNotExist = Exception

        mock_mapping = MagicMock()
        mock_mapping.region.code = 'UK'
        MockCountryRegion.objects.filter.return_value.filter.return_value\
            .select_related.return_value.first.return_value = mock_mapping

        result = lookup_region('gb')
        self.assertEqual(result, 'UK')

    @patch('utils.models.UtilsCountryRegion')
    @patch('utils.models.UtilsCountrys')
    def test_lookup_region_no_mapping(self, MockCountrys, MockCountryRegion):
        """Should return ROW when no region mapping found."""
        mock_country = MagicMock()
        MockCountrys.objects.get.return_value = mock_country
        MockCountrys.DoesNotExist = Exception

        MockCountryRegion.objects.filter.return_value.filter.return_value\
            .select_related.return_value.first.return_value = None

        result = lookup_region('XX')
        self.assertEqual(result, 'ROW')

    @patch('utils.models.UtilsCountrys')
    def test_lookup_region_country_not_found(self, MockCountrys):
        """Should return ROW when country not found."""
        MockCountrys.DoesNotExist = Exception
        MockCountrys.objects.get.side_effect = MockCountrys.DoesNotExist()

        result = lookup_region('ZZ')
        self.assertEqual(result, 'ROW')

    @patch('utils.models.UtilsCountryRegion')
    @patch('utils.models.UtilsCountrys')
    def test_lookup_region_with_effective_date(self, MockCountrys, MockCountryRegion):
        """Should pass effective_date through to query."""
        from datetime import date
        mock_country = MagicMock()
        MockCountrys.objects.get.return_value = mock_country
        MockCountrys.DoesNotExist = Exception

        mock_mapping = MagicMock()
        mock_mapping.region.code = 'EU'
        MockCountryRegion.objects.filter.return_value.filter.return_value\
            .select_related.return_value.first.return_value = mock_mapping

        result = lookup_region('DE', effective_date=date(2026, 1, 1))
        self.assertEqual(result, 'EU')


# ===========================================================================
# lookup_vat_rate
# ===========================================================================

class TestLookupVatRate(TestCase):
    """Tests for lookup_vat_rate function."""

    @patch('utils.models.UtilsCountrys')
    def test_lookup_vat_rate_success(self, MockCountrys):
        """Should return VAT rate as decimal."""
        mock_country = MagicMock()
        mock_country.vat_percent = Decimal('20.00')
        MockCountrys.objects.get.return_value = mock_country
        MockCountrys.DoesNotExist = Exception

        result = lookup_vat_rate('GB')
        self.assertEqual(result, Decimal('0.20'))

    @patch('utils.models.UtilsCountrys')
    def test_lookup_vat_rate_null_percent(self, MockCountrys):
        """Should return 0 when vat_percent is None."""
        mock_country = MagicMock()
        mock_country.vat_percent = None
        MockCountrys.objects.get.return_value = mock_country
        MockCountrys.DoesNotExist = Exception

        result = lookup_vat_rate('US')
        self.assertEqual(result, Decimal('0.00'))

    @patch('utils.models.UtilsCountrys')
    def test_lookup_vat_rate_country_not_found(self, MockCountrys):
        """Should return 0 when country not found."""
        MockCountrys.DoesNotExist = Exception
        MockCountrys.objects.get.side_effect = MockCountrys.DoesNotExist()

        result = lookup_vat_rate('ZZ')
        self.assertEqual(result, Decimal('0.00'))


# ===========================================================================
# calculate_vat_amount & add_decimals
# ===========================================================================

class TestCalculateVatAmount(TestCase):
    """Tests for calculate_vat_amount function."""

    def test_standard_calculation(self):
        """Standard VAT calculation."""
        result = calculate_vat_amount(Decimal('100.00'), Decimal('0.20'))
        self.assertEqual(result, Decimal('20.00'))

    def test_string_inputs(self):
        """Should handle string inputs."""
        result = calculate_vat_amount('50.555', '0.20')
        self.assertEqual(result, Decimal('10.11'))

    def test_zero_rate(self):
        """Zero rate should return zero."""
        result = calculate_vat_amount(Decimal('100.00'), Decimal('0.00'))
        self.assertEqual(result, Decimal('0.00'))

    def test_rounding(self):
        """Should use ROUND_HALF_UP."""
        result = calculate_vat_amount(Decimal('33.33'), Decimal('0.20'))
        self.assertEqual(result, Decimal('6.67'))


class TestAddDecimals(TestCase):
    """Tests for add_decimals function."""

    def test_standard_addition(self):
        result = add_decimals(Decimal('100.00'), Decimal('20.00'))
        self.assertEqual(result, Decimal('120.00'))

    def test_string_inputs(self):
        result = add_decimals('50.00', '10.50')
        self.assertEqual(result, Decimal('60.50'))


# ===========================================================================
# calculate_vat_for_context
# ===========================================================================

class TestCalculateVatForContext(TestCase):
    """Tests for calculate_vat_for_context function."""

    def test_missing_country_code(self):
        """Should return error when country_code is missing."""
        result = calculate_vat_for_context({}, {})
        self.assertFalse(result['success'])
        self.assertIn('country_code', result['error'])

    @patch('utils.services.vat_service.VATCalculationService')
    def test_single_amount_success(self, MockVATService):
        """Should calculate VAT for single net_amount."""
        mock_instance = MockVATService.return_value
        mock_instance.calculate_vat.return_value = {
            'vat_amount': Decimal('20.00'),
            'net_amount': Decimal('100.00'),
        }
        context = {'country_code': 'GB', 'net_amount': Decimal('100.00')}
        result = calculate_vat_for_context(context, {})
        self.assertTrue(result['success'])
        self.assertEqual(result['vat_amount'], Decimal('20.00'))

    @patch('utils.services.vat_service.VATCalculationService')
    def test_cart_items_success(self, MockVATService):
        """Should calculate VAT for cart items."""
        mock_instance = MockVATService.return_value
        mock_instance.calculate_vat_for_cart.return_value = {
            'total_vat_amount': Decimal('30.00'),
        }
        context = {
            'country_code': 'GB',
            'cart_items': [{'net_price': '100.00', 'quantity': 1}],
        }
        result = calculate_vat_for_context(context, {})
        self.assertTrue(result['success'])

    def test_missing_net_amount_and_cart_items(self):
        """Should return error when both net_amount and cart_items missing."""
        context = {'country_code': 'GB'}
        result = calculate_vat_for_context(context, {})
        self.assertFalse(result['success'])
        self.assertIn('net_amount or cart_items', result['error'])

    @patch('utils.services.vat_service.VATCalculationService')
    def test_country_code_from_params(self, MockVATService):
        """Should prefer country_code from params over context."""
        mock_instance = MockVATService.return_value
        mock_instance.calculate_vat.return_value = {
            'vat_amount': Decimal('15.00'),
        }
        context = {'country_code': 'US', 'net_amount': '100.00'}
        params = {'country_code': 'GB'}
        result = calculate_vat_for_context(context, params)
        self.assertTrue(result['success'])
        # Verify GB was used (from params)
        mock_instance.calculate_vat.assert_called_once()
        call_kwargs = mock_instance.calculate_vat.call_args
        self.assertEqual(call_kwargs[1]['country_code'], 'GB')

    @patch('utils.services.vat_service.VATCalculationService')
    def test_exception_handling(self, MockVATService):
        """Should handle exceptions gracefully."""
        MockVATService.side_effect = RuntimeError('Service unavailable')
        context = {'country_code': 'GB', 'net_amount': '100.00'}
        result = calculate_vat_for_context(context, {})
        self.assertFalse(result['success'])
        self.assertIn('error', result)

    @patch('utils.services.vat_service.VATCalculationService')
    def test_cart_items_from_params(self, MockVATService):
        """Should accept cart_items from params."""
        mock_instance = MockVATService.return_value
        mock_instance.calculate_vat_for_cart.return_value = {
            'total_vat_amount': Decimal('10.00'),
        }
        context = {'country_code': 'GB'}
        params = {'cart_items': [{'net_price': '50.00', 'quantity': 1}]}
        result = calculate_vat_for_context(context, params)
        self.assertTrue(result['success'])

    @patch('utils.services.vat_service.VATCalculationService')
    def test_net_amount_from_params(self, MockVATService):
        """Should accept net_amount from params."""
        mock_instance = MockVATService.return_value
        mock_instance.calculate_vat.return_value = {
            'vat_amount': Decimal('10.00'),
        }
        context = {'country_code': 'GB'}
        params = {'net_amount': '50.00'}
        result = calculate_vat_for_context(context, params)
        self.assertTrue(result['success'])


# ===========================================================================
# FUNCTION_REGISTRY
# ===========================================================================

class TestFunctionRegistry(TestCase):
    """Tests for FUNCTION_REGISTRY completeness."""

    def test_registry_contains_expected_functions(self):
        """Should contain all expected function entries."""
        expected = [
            'lookup_region', 'lookup_vat_rate',
            'calculate_vat_amount', 'add_decimals',
        ]
        for name in expected:
            self.assertIn(name, FUNCTION_REGISTRY,
                          f"Missing function: {name}")
            self.assertTrue(callable(FUNCTION_REGISTRY[name]),
                            f"Not callable: {name}")
