"""
TASK-501: VAT Orchestrator Tests (RED Phase)

Tests for VAT orchestrator service that coordinates VAT calculation
through Rules Engine. These tests should FAIL until TASK-502 implementation.
"""
from decimal import Decimal
from datetime import datetime, date
from django.test import TestCase
from django.contrib.auth import get_user_model
from cart.models import Cart, CartItem
from exam_sessions_subjects_products.models import ExamSessionSubjectProduct
from vat.models import VATAudit
from unittest.mock import Mock, patch, MagicMock

User = get_user_model()


class VATOrchestratorTests(TestCase):
    """Test suite for VAT Orchestrator service."""

    def setUp(self):
        """Set up test data."""
        # Create test user with GB country
        self.user = User.objects.create_user(
            username='test_user',
            email='test@example.com',
            password='testpass123'
        )

        # Create cart
        self.cart = Cart.objects.create(user=self.user)

        # Create a real product for testing
        # Note: ExamSessionSubjectProduct requires exam_session and subject
        # For simplicity, we'll mock it or create a minimal one
        self.mock_product = Mock(spec=ExamSessionSubjectProduct)
        self.mock_product.id = 1
        self.mock_product.fullname = "Test Product"
        self.mock_product.pk = 1

        # Mock the variations relationship
        mock_variation = Mock()
        mock_product_product_variation = Mock()
        mock_product_variation = Mock()
        mock_product_variation.variation_type = 'eBook'
        mock_product_product_variation.product_variation = mock_product_variation
        mock_variation.product_product_variation = mock_product_product_variation

        self.mock_product.variations.first = Mock(return_value=mock_variation)

    def test_build_context_from_cart_single_item(self):
        """Test context building with 1 cart item."""
        # Arrange
        cart_item = CartItem.objects.create(
            cart=self.cart,
            product=None,  # Will use mock
            quantity=1,
            actual_price=Decimal('50.00'),
            item_type='fee'
        )

        # Import orchestrator (will fail until implemented)
        from cart.services.vat_orchestrator import vat_orchestrator

        # Act
        context = vat_orchestrator._build_context(self.cart)

        # Assert
        self.assertIsNotNone(context)
        self.assertIn('user', context)
        self.assertIn('cart', context)
        self.assertIn('settings', context)

        # Verify user context
        self.assertEqual(context['user']['id'], str(self.user.id))
        self.assertIn('country', context['user'])

        # Verify cart context
        self.assertEqual(context['cart']['id'], str(self.cart.id))
        self.assertIn('items', context['cart'])
        self.assertEqual(len(context['cart']['items']), 1)

        # Verify item structure
        item_context = context['cart']['items'][0]
        self.assertEqual(item_context['id'], str(cart_item.id))
        self.assertIn('product_type', item_context)
        self.assertEqual(item_context['actual_price'], '50.00')
        self.assertEqual(item_context['quantity'], 1)

    def test_build_context_from_cart_multiple_items(self):
        """Test context building with multiple items."""
        # Arrange
        CartItem.objects.create(
            cart=self.cart,
            product=None,
            quantity=1,
            actual_price=Decimal('50.00'),
            item_type='fee'
        )
        CartItem.objects.create(
            cart=self.cart,
            product=None,
            quantity=2,
            actual_price=Decimal('100.00'),
            item_type='fee'
        )

        from cart.services.vat_orchestrator import vat_orchestrator

        # Act
        context = vat_orchestrator._build_context(self.cart)

        # Assert
        self.assertEqual(len(context['cart']['items']), 2)
        self.assertEqual(context['cart']['items'][0]['actual_price'], '50.00')
        self.assertEqual(context['cart']['items'][1]['actual_price'], '100.00')

    @patch('cart.services.vat_orchestrator.rule_engine')
    def test_execute_vat_calculation_uk_customer(self, mock_rule_engine):
        """Test UK customer VAT calculation."""
        # Arrange
        CartItem.objects.create(
            cart=self.cart,
            product=None,
            quantity=1,
            actual_price=Decimal('50.00'),
            item_type='fee'
        )

        # Mock rules engine response
        mock_rule_engine.execute.return_value = {
            'success': True,
            'cart': {
                'items': [{
                    'id': '1',
                    'vat_amount': '10.00',
                    'vat_rate': '0.2000'
                }]
            },
            'context': {'region': 'UK'},
            'rules_executed': ['calculate_vat_uk'],
            'execution_id': 'exec_123'
        }

        from cart.services.vat_orchestrator import vat_orchestrator

        # Act
        result = vat_orchestrator.execute_vat_calculation(self.cart)

        # Assert
        self.assertIsNotNone(result)
        self.assertEqual(result['status'], 'calculated')
        self.assertEqual(result['region'], 'UK')
        self.assertIn('totals', result)
        self.assertEqual(result['totals']['vat'], '10.00')

    @patch('cart.services.vat_orchestrator.rule_engine')
    def test_execute_vat_calculation_eu_customer(self, mock_rule_engine):
        """Test EU customer VAT calculation (reverse charge)."""
        # Arrange
        CartItem.objects.create(
            cart=self.cart,
            product=None,
            quantity=1,
            actual_price=Decimal('100.00'),
            item_type='fee'
        )

        # Mock rules engine response for EU (0% reverse charge)
        mock_rule_engine.execute.return_value = {
            'success': True,
            'cart': {
                'items': [{
                    'id': '1',
                    'vat_amount': '0.00',
                    'vat_rate': '0.0000'
                }]
            },
            'context': {'region': 'EU'},
            'rules_executed': ['calculate_vat_eu'],
            'execution_id': 'exec_456'
        }

        from cart.services.vat_orchestrator import vat_orchestrator

        # Act
        result = vat_orchestrator.execute_vat_calculation(self.cart)

        # Assert
        self.assertEqual(result['region'], 'EU')
        self.assertEqual(result['totals']['vat'], '0.00')

    @patch('cart.services.vat_orchestrator.rule_engine')
    def test_execute_vat_calculation_sa_customer(self, mock_rule_engine):
        """Test SA customer 15% VAT."""
        # Arrange
        CartItem.objects.create(
            cart=self.cart,
            product=None,
            quantity=1,
            actual_price=Decimal('100.00'),
            item_type='fee'
        )

        # Mock rules engine response for SA (15%)
        mock_rule_engine.execute.return_value = {
            'success': True,
            'cart': {
                'items': [{
                    'id': '1',
                    'vat_amount': '15.00',
                    'vat_rate': '0.1500'
                }]
            },
            'context': {'region': 'SA'},
            'rules_executed': ['calculate_vat_sa'],
            'execution_id': 'exec_789'
        }

        from cart.services.vat_orchestrator import vat_orchestrator

        # Act
        result = vat_orchestrator.execute_vat_calculation(self.cart)

        # Assert
        self.assertEqual(result['region'], 'SA')
        self.assertEqual(result['totals']['vat'], '15.00')

    @patch('cart.services.vat_orchestrator.rule_engine')
    def test_execute_vat_calculation_row_customer(self, mock_rule_engine):
        """Test ROW customer 0% VAT."""
        # Arrange
        CartItem.objects.create(
            cart=self.cart,
            product=None,
            quantity=1,
            actual_price=Decimal('100.00'),
            item_type='fee'
        )

        # Mock rules engine response for ROW (0%)
        mock_rule_engine.execute.return_value = {
            'success': True,
            'cart': {
                'items': [{
                    'id': '1',
                    'vat_amount': '0.00',
                    'vat_rate': '0.0000'
                }]
            },
            'context': {'region': 'ROW'},
            'rules_executed': ['calculate_vat_row'],
            'execution_id': 'exec_101'
        }

        from cart.services.vat_orchestrator import vat_orchestrator

        # Act
        result = vat_orchestrator.execute_vat_calculation(self.cart)

        # Assert
        self.assertEqual(result['region'], 'ROW')
        self.assertEqual(result['totals']['vat'], '0.00')

    @patch('cart.services.vat_orchestrator.rule_engine')
    def test_aggregate_vat_totals_single_item(self, mock_rule_engine):
        """Test aggregation with 1 item."""
        # Arrange
        CartItem.objects.create(
            cart=self.cart,
            product=None,
            quantity=1,
            actual_price=Decimal('50.00'),
            item_type='fee'
        )

        mock_rule_engine.execute.return_value = {
            'success': True,
            'cart': {
                'items': [{
                    'id': '1',
                    'actual_price': '50.00',
                    'quantity': 1,
                    'vat_amount': '10.00',
                    'vat_rate': '0.2000'
                }]
            },
            'context': {'region': 'UK'},
            'rules_executed': ['calculate_vat_uk'],
            'execution_id': 'exec_123'
        }

        from cart.services.vat_orchestrator import vat_orchestrator

        # Act
        result = vat_orchestrator.execute_vat_calculation(self.cart)

        # Assert
        self.assertEqual(Decimal(result['totals']['net']), Decimal('50.00'))
        self.assertEqual(Decimal(result['totals']['vat']), Decimal('10.00'))
        self.assertEqual(Decimal(result['totals']['gross']), Decimal('60.00'))

    @patch('cart.services.vat_orchestrator.rule_engine')
    def test_aggregate_vat_totals_multiple_items_mixed_rates(self, mock_rule_engine):
        """Test aggregation with mixed VAT rates."""
        # Arrange
        CartItem.objects.create(
            cart=self.cart,
            product=None,
            quantity=1,
            actual_price=Decimal('50.00'),
            item_type='fee'
        )
        CartItem.objects.create(
            cart=self.cart,
            product=None,
            quantity=1,
            actual_price=Decimal('100.00'),
            item_type='fee'
        )

        # Mock mixed VAT: item1 @ 20%, item2 @ 0%
        mock_rule_engine.execute.return_value = {
            'success': True,
            'cart': {
                'items': [
                    {
                        'id': '1',
                        'actual_price': '50.00',
                        'quantity': 1,
                        'vat_amount': '10.00',  # 20% VAT
                        'vat_rate': '0.2000'
                    },
                    {
                        'id': '2',
                        'actual_price': '100.00',
                        'quantity': 1,
                        'vat_amount': '0.00',  # 0% VAT
                        'vat_rate': '0.0000'
                    }
                ]
            },
            'context': {'region': 'UK'},
            'rules_executed': ['calculate_vat_uk'],
            'execution_id': 'exec_456'
        }

        from cart.services.vat_orchestrator import vat_orchestrator

        # Act
        result = vat_orchestrator.execute_vat_calculation(self.cart)

        # Assert
        self.assertEqual(Decimal(result['totals']['net']), Decimal('150.00'))
        self.assertEqual(Decimal(result['totals']['vat']), Decimal('10.00'))
        self.assertEqual(Decimal(result['totals']['gross']), Decimal('160.00'))

    @patch('cart.services.vat_orchestrator.rule_engine')
    @patch('cart.services.vat_orchestrator.VATAudit')
    def test_store_vat_result_in_cart_jsonb(self, mock_vat_audit, mock_rule_engine):
        """Test cart.vat_result JSONB structure."""
        # Arrange
        CartItem.objects.create(
            cart=self.cart,
            product=None,
            quantity=1,
            actual_price=Decimal('50.00'),
            item_type='fee'
        )

        mock_rule_engine.execute.return_value = {
            'success': True,
            'cart': {
                'items': [{
                    'id': '1',
                    'actual_price': '50.00',
                    'quantity': 1,
                    'vat_amount': '10.00',
                    'vat_rate': '0.2000'
                }]
            },
            'context': {'region': 'UK'},
            'rules_executed': ['calculate_vat_uk'],
            'execution_id': 'exec_789'
        }

        from cart.services.vat_orchestrator import vat_orchestrator

        # Act
        vat_orchestrator.execute_vat_calculation(self.cart)

        # Assert
        self.cart.refresh_from_db()
        self.assertIsNotNone(self.cart.vat_result)
        self.assertEqual(self.cart.vat_result['status'], 'calculated')
        self.assertIn('totals', self.cart.vat_result)
        self.assertIn('region', self.cart.vat_result)
        self.assertIn('items', self.cart.vat_result)
        self.assertIn('execution_id', self.cart.vat_result)
        self.assertIn('timestamp', self.cart.vat_result)

    @patch('cart.services.vat_orchestrator.rule_engine')
    @patch('cart.services.vat_orchestrator.VATAudit')
    def test_create_vat_audit_record(self, mock_vat_audit, mock_rule_engine):
        """Test VATAudit record creation."""
        # Arrange
        CartItem.objects.create(
            cart=self.cart,
            product=None,
            quantity=1,
            actual_price=Decimal('50.00'),
            item_type='fee'
        )

        mock_rule_engine.execute.return_value = {
            'success': True,
            'cart': {
                'items': [{
                    'id': '1',
                    'vat_amount': '10.00',
                    'vat_rate': '0.2000'
                }]
            },
            'context': {'region': 'UK'},
            'rules_executed': ['calculate_vat_uk'],
            'execution_id': 'exec_999'
        }

        from cart.services.vat_orchestrator import vat_orchestrator

        # Act
        vat_orchestrator.execute_vat_calculation(self.cart)

        # Assert
        mock_vat_audit.objects.create.assert_called_once()
        call_kwargs = mock_vat_audit.objects.create.call_args[1]
        self.assertEqual(call_kwargs['cart'], self.cart)
        self.assertIsNone(call_kwargs['order'])
        self.assertIn('input_context', call_kwargs)
        self.assertIn('output_data', call_kwargs)

    @patch('cart.services.vat_orchestrator.rule_engine')
    def test_handle_rules_engine_failure_gracefully(self, mock_rule_engine):
        """Test error handling when Rules Engine fails."""
        # Arrange
        CartItem.objects.create(
            cart=self.cart,
            product=None,
            quantity=1,
            actual_price=Decimal('50.00'),
            item_type='fee'
        )

        # Mock Rules Engine failure
        mock_rule_engine.execute.side_effect = Exception("Rules Engine connection failed")

        from cart.services.vat_orchestrator import vat_orchestrator

        # Act & Assert
        with self.assertRaises(Exception) as context:
            vat_orchestrator.execute_vat_calculation(self.cart)

        self.assertIn("Rules Engine connection failed", str(context.exception))
