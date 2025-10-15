"""
Phase 4: Cart VAT calculation method tests
TDD Phase: RED - Tests for Cart.calculate_vat_for_all_items() and related methods

These tests will fail initially because the methods don't exist yet.
This follows TDD RED → GREEN → REFACTOR workflow.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from decimal import Decimal
from datetime import datetime
from unittest.mock import patch, MagicMock

from cart.models import Cart, CartItem

User = get_user_model()


class CartVATCalculationMethodsTestCase(TestCase):
    """Test Cart methods for calculating VAT for all items"""

    def setUp(self):
        """Set up test data"""
        # Create test user
        self.user = User.objects.create_user(
            username='test_user',
            email='test@test.com',
            password='testpass123'
        )

        # Create cart
        self.cart = Cart.objects.create(user=self.user)

    def test_cart_has_calculate_vat_for_all_items_method(self):
        """Test that Cart model has calculate_vat_for_all_items method"""
        self.assertTrue(hasattr(self.cart, 'calculate_vat_for_all_items'))
        self.assertTrue(callable(getattr(self.cart, 'calculate_vat_for_all_items')))

    @patch('rules_engine.services.rule_engine.rule_engine')
    def test_calculate_vat_for_all_items_empty_cart(self, mock_rule_engine):
        """Test VAT calculation for empty cart returns no items"""
        result = self.cart.calculate_vat_for_all_items('GB')

        # Should return success with empty items
        self.assertTrue(result.get('success'))
        self.assertEqual(len(result.get('items', [])), 0)
        self.assertEqual(result.get('total_net_amount'), Decimal('0.00'))
        self.assertEqual(result.get('total_vat_amount'), Decimal('0.00'))
        self.assertEqual(result.get('total_gross_amount'), Decimal('0.00'))

        # Should not call rules engine for empty cart
        mock_rule_engine.execute.assert_not_called()

    @patch('rules_engine.services.rule_engine.rule_engine')
    def test_calculate_vat_for_all_items_single_item(self, mock_rule_engine):
        """Test VAT calculation for cart with single item"""
        # Mock rules engine response
        mock_rule_engine.execute.return_value = {
            'cart_item': {
                'vat_amount': Decimal('10.00'),
                'gross_amount': Decimal('60.00')
            },
            'vat': {
                'region': 'UK',
                'rate': Decimal('0.2000')
            }
        }

        # Add item to cart (using fee type for simplicity)
        cart_item = CartItem.objects.create(
            cart=self.cart,
            item_type='fee',
            quantity=1,
            actual_price=Decimal('50.00')
        )

        result = self.cart.calculate_vat_for_all_items('GB')

        # Verify result structure
        self.assertTrue(result.get('success'))
        self.assertEqual(len(result.get('items')), 1)

        # Verify item VAT calculation
        item_result = result['items'][0]
        self.assertEqual(item_result['cart_item_id'], cart_item.id)
        self.assertEqual(item_result['net_amount'], Decimal('50.00'))
        self.assertEqual(item_result['vat_amount'], Decimal('10.00'))
        self.assertEqual(item_result['gross_amount'], Decimal('60.00'))
        self.assertEqual(item_result['vat_region'], 'UK')
        self.assertEqual(item_result['vat_rate'], Decimal('0.2000'))

        # Verify totals
        self.assertEqual(result['total_net_amount'], Decimal('50.00'))
        self.assertEqual(result['total_vat_amount'], Decimal('10.00'))
        self.assertEqual(result['total_gross_amount'], Decimal('60.00'))

        # Verify rules engine called correctly
        mock_rule_engine.execute.assert_called_once()
        call_args = mock_rule_engine.execute.call_args
        self.assertEqual(call_args[0][0], 'cart_calculate_vat')
        self.assertIn('cart_item', call_args[0][1])
        self.assertIn('user', call_args[0][1])

    def test_calculate_vat_for_all_items_requires_country_code(self):
        """Test that country_code parameter is required"""
        CartItem.objects.create(
            cart=self.cart,
            item_type='fee',
            quantity=1,
            actual_price=Decimal('50.00')
        )

        with self.assertRaises(TypeError):
            self.cart.calculate_vat_for_all_items()  # Missing country_code

    @patch('rules_engine.services.rule_engine.rule_engine')
    def test_calculate_vat_for_all_items_error_fallback(self, mock_rule_engine):
        """Test VAT calculation falls back to 0% VAT when rules engine fails"""
        # Mock rules engine to raise exception
        mock_rule_engine.execute.side_effect = Exception("Rules engine error")

        # Add item to cart
        cart_item = CartItem.objects.create(
            cart=self.cart,
            item_type='fee',
            quantity=1,
            actual_price=Decimal('100.00')
        )

        # Calculate VAT with update_items=True to trigger fallback
        result = self.cart.calculate_vat_for_all_items('GB', update_items=True)

        # Result should indicate failure
        self.assertFalse(result.get('success'))
        self.assertIn('error', result)
        self.assertEqual(result['error'], "Rules engine error")

        # Verify item fallback to 0% VAT (ROW)
        cart_item.refresh_from_db()
        self.assertEqual(cart_item.vat_region, 'ROW')
        self.assertEqual(cart_item.vat_rate, Decimal('0.0000'))
        self.assertEqual(cart_item.vat_amount, Decimal('0.00'))
        self.assertEqual(cart_item.gross_amount, Decimal('100.00'))  # Net only
        self.assertIsNotNone(cart_item.vat_calculated_at)

    @patch('rules_engine.services.rule_engine.rule_engine')
    def test_vat_error_tracking(self, mock_rule_engine):
        """Test that Cart error tracking fields are set correctly on error"""
        # Mock rules engine to raise exception
        error_message = "Rules engine connection failed"
        mock_rule_engine.execute.side_effect = Exception(error_message)

        # Add item to cart
        CartItem.objects.create(
            cart=self.cart,
            item_type='fee',
            quantity=1,
            actual_price=Decimal('100.00')
        )

        # Calculate VAT with update_items=True to trigger error tracking
        result = self.cart.calculate_vat_for_all_items('GB', update_items=True)

        # Verify result indicates failure
        self.assertFalse(result.get('success'))

        # Verify Cart error flags are set
        self.cart.refresh_from_db()
        self.assertTrue(self.cart.vat_calculation_error)
        self.assertEqual(self.cart.vat_calculation_error_message, error_message)
        self.assertIsNotNone(self.cart.vat_last_calculated_at)

    @patch('rules_engine.services.rule_engine.rule_engine')
    def test_vat_error_tracking_clears_on_success(self, mock_rule_engine):
        """Test that Cart error tracking flags are cleared on successful calculation"""
        # First: Set error state manually
        self.cart.vat_calculation_error = True
        self.cart.vat_calculation_error_message = "Previous error"
        self.cart.save()

        # Mock successful rules engine response
        mock_rule_engine.execute.return_value = {
            'cart_item': {
                'vat_amount': Decimal('20.00'),
                'gross_amount': Decimal('120.00')
            },
            'vat': {
                'region': 'UK',
                'rate': Decimal('0.2000')
            }
        }

        # Add item to cart
        CartItem.objects.create(
            cart=self.cart,
            item_type='fee',
            quantity=1,
            actual_price=Decimal('100.00')
        )

        # Calculate VAT with update_items=True
        result = self.cart.calculate_vat_for_all_items('GB', update_items=True)

        # Verify success
        self.assertTrue(result.get('success'))

        # Verify error flags cleared
        self.cart.refresh_from_db()
        self.assertFalse(self.cart.vat_calculation_error)
        self.assertIsNone(self.cart.vat_calculation_error_message)
        self.assertIsNotNone(self.cart.vat_last_calculated_at)

    @patch('rules_engine.services.rule_engine.rule_engine')
    def test_calculate_vat_for_all_items_multiple_items(self, mock_rule_engine):
        """Test VAT calculation for cart with multiple items"""
        # Mock rules engine to return different VAT for each call
        mock_rule_engine.execute.side_effect = [
            {
                'cart_item': {'vat_amount': Decimal('10.00'), 'gross_amount': Decimal('60.00')},
                'vat': {'region': 'UK', 'rate': Decimal('0.2000')}
            },
            {
                'cart_item': {'vat_amount': Decimal('3.75'), 'gross_amount': Decimal('28.75')},
                'vat': {'region': 'SA', 'rate': Decimal('0.1500')}
            }
        ]

        # Add multiple items to cart
        CartItem.objects.create(cart=self.cart, item_type='fee', quantity=1, actual_price=Decimal('50.00'))
        CartItem.objects.create(cart=self.cart, item_type='fee', quantity=1, actual_price=Decimal('25.00'))

        result = self.cart.calculate_vat_for_all_items('GB')

        # Verify result structure
        self.assertTrue(result.get('success'))
        self.assertEqual(len(result.get('items')), 2)

        # Verify totals
        self.assertEqual(result['total_net_amount'], Decimal('75.00'))
        self.assertEqual(result['total_vat_amount'], Decimal('13.75'))
        self.assertEqual(result['total_gross_amount'], Decimal('88.75'))

        # Verify VAT breakdown by region
        vat_breakdown = result.get('vat_breakdown', [])
        self.assertEqual(len(vat_breakdown), 2)  # UK and SA regions

        # Verify rules engine called twice (once per item)
        self.assertEqual(mock_rule_engine.execute.call_count, 2)
