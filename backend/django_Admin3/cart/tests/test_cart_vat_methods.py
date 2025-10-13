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
