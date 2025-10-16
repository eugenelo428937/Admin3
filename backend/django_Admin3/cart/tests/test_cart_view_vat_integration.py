"""
TASK-504: Cart View VAT Integration Tests (RED Phase)

Integration tests for VAT orchestrator service integration into cart views.
These tests verify that the VAT orchestrator is properly called and integrated.
"""
from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from unittest.mock import patch, Mock

from cart.models import Cart, CartItem
from cart.views import CartViewSet

User = get_user_model()


class CartViewVATIntegrationTests(TestCase):
    """Test suite for Cart View VAT Integration with orchestrator service."""

    def setUp(self):
        """Set up test data."""
        # Create test user
        self.user = User.objects.create_user(
            username='test_user',
            email='test@example.com',
            password='testpass123'
        )

        # Create cart
        self.cart = Cart.objects.create(user=self.user)

        # Create view instance
        self.view = CartViewSet()

    @patch('cart.services.vat_orchestrator.VATAudit')
    @patch('cart.services.vat_orchestrator.rule_engine.execute')
    def test_trigger_vat_calculation_calls_orchestrator(self, mock_rule_engine, mock_vat_audit):
        """Test that _trigger_vat_calculation calls orchestrator and stores result."""
        # Arrange
        cart_item = CartItem.objects.create(
            cart=self.cart,
            quantity=1,
            actual_price=Decimal('50.00'),
            item_type='fee'
        )

        # Mock Rules Engine response
        mock_rule_engine.return_value = {
            'success': True,
            'cart': {
                'items': [{
                    'id': str(cart_item.id),
                    'actual_price': '50.00',
                    'quantity': 1,
                    'vat_amount': '10.00',
                    'vat_rate': '0.2000',
                    'vat_region': 'UK',
                    'gross_amount': '60.00'
                }]
            },
            'context': {'region': 'UK'},
            'rules_executed': ['calculate_vat_uk'],
            'execution_id': 'exec_123'
        }

        # Act
        self.view._trigger_vat_calculation(self.cart)

        # Assert
        # Verify cart has vat_result stored
        self.cart.refresh_from_db()
        self.assertIsNotNone(self.cart.vat_result)
        self.assertEqual(self.cart.vat_result['status'], 'calculated')
        self.assertEqual(self.cart.vat_result['region'], 'UK')
        self.assertFalse(self.cart.vat_calculation_error)

    @patch('cart.services.vat_orchestrator.vat_orchestrator.execute_vat_calculation')
    def test_vat_calculation_error_sets_flags(self, mock_execute_vat):
        """Test that VAT calculation errors set error flags."""
        # Arrange
        CartItem.objects.create(
            cart=self.cart,
            quantity=1,
            actual_price=Decimal('50.00'),
            item_type='fee'
        )

        # Mock orchestrator to raise exception
        mock_execute_vat.side_effect = Exception("Rules Engine connection failed")

        # Act
        self.view._trigger_vat_calculation(self.cart)

        # Assert
        self.cart.refresh_from_db()
        self.assertTrue(self.cart.vat_calculation_error)
        self.assertIsNotNone(self.cart.vat_calculation_error_message)
        self.assertIn("Rules Engine connection failed", self.cart.vat_calculation_error_message)

    @patch('cart.services.vat_orchestrator.VATAudit')
    @patch('cart.services.vat_orchestrator.rule_engine.execute')
    def test_cart_item_vat_fields_updated(self, mock_rule_engine, mock_vat_audit):
        """Test that CartItem VAT fields are updated from orchestrator result."""
        # Arrange
        cart_item = CartItem.objects.create(
            cart=self.cart,
            quantity=1,
            actual_price=Decimal('50.00'),
            item_type='fee'
        )

        mock_rule_engine.return_value = {
            'success': True,
            'cart': {
                'items': [{
                    'id': str(cart_item.id),
                    'actual_price': '50.00',
                    'quantity': 1,
                    'vat_amount': '10.00',
                    'vat_rate': '0.2000',
                    'vat_region': 'UK',
                    'gross_amount': '60.00'
                }]
            },
            'context': {'region': 'UK'},
            'rules_executed': ['calculate_vat_uk'],
            'execution_id': 'exec_item'
        }

        # Act
        self.view._trigger_vat_calculation(self.cart)

        # Assert
        cart_item.refresh_from_db()
        self.assertEqual(cart_item.vat_region, 'UK')
        self.assertEqual(cart_item.vat_rate, Decimal('0.2000'))
        self.assertEqual(cart_item.vat_amount, Decimal('10.00'))
        self.assertEqual(cart_item.gross_amount, Decimal('60.00'))

    @patch('cart.services.vat_orchestrator.VATAudit')
    @patch('cart.services.vat_orchestrator.rule_engine.execute')
    def test_multiple_items_aggregation(self, mock_rule_engine, mock_vat_audit):
        """Test VAT calculation with multiple cart items."""
        # Arrange
        item1 = CartItem.objects.create(
            cart=self.cart,
            quantity=1,
            actual_price=Decimal('50.00'),
            item_type='fee'
        )
        item2 = CartItem.objects.create(
            cart=self.cart,
            quantity=2,
            actual_price=Decimal('100.00'),
            item_type='fee'
        )

        mock_rule_engine.return_value = {
            'success': True,
            'cart': {
                'items': [
                    {
                        'id': str(item1.id),
                        'actual_price': '50.00',
                        'quantity': 1,
                        'vat_amount': '10.00',
                        'vat_rate': '0.2000',
                        'vat_region': 'UK',
                        'gross_amount': '60.00'
                    },
                    {
                        'id': str(item2.id),
                        'actual_price': '100.00',
                        'quantity': 2,
                        'vat_amount': '40.00',
                        'vat_rate': '0.2000',
                        'vat_region': 'UK',
                        'gross_amount': '240.00'
                    }
                ]
            },
            'context': {'region': 'UK'},
            'rules_executed': ['calculate_vat_uk'],
            'execution_id': 'exec_multi'
        }

        # Act
        self.view._trigger_vat_calculation(self.cart)

        # Assert
        self.cart.refresh_from_db()
        self.assertEqual(self.cart.vat_result['totals']['net'], '250.00')
        self.assertEqual(self.cart.vat_result['totals']['vat'], '50.00')
        self.assertEqual(self.cart.vat_result['totals']['gross'], '300.00')

    @patch('cart.services.vat_orchestrator.VATAudit')
    @patch('cart.services.vat_orchestrator.rule_engine.execute')
    def test_empty_cart_calculation(self, mock_rule_engine, mock_vat_audit):
        """Test VAT calculation for empty cart."""
        # Arrange - no items
        mock_rule_engine.return_value = {
            'success': True,
            'cart': {
                'items': []
            },
            'context': {'region': 'UK'},
            'rules_executed': [],
            'execution_id': 'exec_empty'
        }

        # Act
        self.view._trigger_vat_calculation(self.cart)

        # Assert
        self.cart.refresh_from_db()
        self.assertEqual(self.cart.vat_result['totals']['vat'], '0.00')
        self.assertFalse(self.cart.vat_calculation_error)
