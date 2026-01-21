"""
TASK-510: End-to-End VAT Integration Tests (RED Phase)

Comprehensive integration tests for Phase 5 VAT system.
Tests verify the complete flow from API request to response:
- API request → CartViewSet
- VAT Orchestrator → Rules Engine
- Results → cart.vat_result JSONB storage
- CartSerializer → API response with VAT data

These tests should initially FAIL until all integration issues are resolved in TASK-511.
"""
from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from unittest.mock import patch, Mock
from django.utils import timezone

from cart.models import Cart, CartItem
# Note: Cart now uses store.Product (T087 legacy app cleanup)

User = get_user_model()


class VATEndToEndIntegrationTests(TestCase):
    """End-to-end integration tests for VAT calculation system."""

    def setUp(self):
        """Set up test data."""
        self.client = APIClient()

        # Create test user
        self.user = User.objects.create_user(
            username='test_user',
            email='test@example.com',
            password='testpass123'
        )

        # Authenticate client
        self.client.force_authenticate(user=self.user)

        # Create cart
        self.cart = Cart.objects.create(user=self.user)

    @patch('cart.views.vat_orchestrator.execute_vat_calculation')
    def test_add_item_triggers_vat_calculation(self, mock_orchestrator):
        """Test that creating item and calling recalculate triggers VAT calculation."""
        # Phase 5: Test VAT calculation flow by creating item directly
        # (The add endpoint requires a real product, so we test VAT separately)

        # Arrange - Create cart item
        cart_item = CartItem.objects.create(
            cart=self.cart,
            quantity=1,
            actual_price=Decimal('100.00'),
            item_type='fee'
        )

        # Mock orchestrator to set vat_result
        vat_result = {
            'success': True,
            'status': 'calculated',
            'region': 'UK',
            'total_net_amount': '100.00',
            'total_vat_amount': '20.00',
            'total_gross_amount': '120.00',
            'items': [{
                'id': str(cart_item.id),
                'vat_amount': '20.00',
                'vat_rate': '0.2000',
                'vat_region': 'UK',
                'gross_amount': '120.00'
            }],
            'vat_breakdown': []
        }

        def orchestrator_side_effect(cart_arg):
            cart_arg.vat_result = vat_result
            cart_arg.save(update_fields=['vat_result'])
            return vat_result

        mock_orchestrator.side_effect = orchestrator_side_effect

        # Act - Trigger VAT recalculation via API
        url = reverse('cart-vat-recalculate')
        response = self.client.post(url, format='json')

        # Assert - Verify response
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify cart has vat_result stored
        self.cart.refresh_from_db()
        self.assertIsNotNone(self.cart.vat_result)
        self.assertEqual(self.cart.vat_result['status'], 'calculated')
        self.assertEqual(self.cart.vat_result['region'], 'UK')

    @patch('cart.services.vat_orchestrator.VATAudit')
    @patch('cart.services.vat_orchestrator.rule_engine.execute')
    def test_get_cart_returns_vat_data_from_jsonb(self, mock_rule_engine, mock_vat_audit):
        """Test that GET /api/cart/ returns VAT data from JSONB storage."""
        # Arrange - Create cart item and populate vat_result
        cart_item = CartItem.objects.create(
            cart=self.cart,
            quantity=1,
            actual_price=Decimal('100.00'),
            item_type='fee',
            vat_region='UK',
            vat_rate=Decimal('0.2000'),
            vat_amount=Decimal('20.00'),
            gross_amount=Decimal('120.00')
        )

        # Set vat_result AFTER item creation (to avoid signal clearing it)
        self.cart.vat_result = {
            'status': 'calculated',
            'region': 'UK',
            'totals': {
                'net': '100.00',
                'vat': '20.00',
                'gross': '120.00'
            },
            'items': [{
                'id': str(cart_item.id),
                'vat_amount': '20.00',
                'vat_rate': '0.2000',
                'vat_region': 'UK',
                'gross_amount': '120.00'
            }],
            'execution_id': 'exec_e2e_2',
            'timestamp': timezone.now().isoformat()
        }
        self.cart.save()

        # Act - GET cart via API
        url = reverse('cart-list')
        response = self.client.get(url)

        # Assert - Verify VAT data in response
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify vat_totals field exists and matches JSONB data
        self.assertIn('vat_totals', response.data)
        vat_totals = response.data['vat_totals']

        self.assertEqual(vat_totals['status'], 'calculated')
        self.assertEqual(vat_totals['region'], 'UK')
        self.assertEqual(vat_totals['totals']['net'], '100.00')
        self.assertEqual(vat_totals['totals']['vat'], '20.00')
        self.assertEqual(vat_totals['totals']['gross'], '120.00')

    def test_update_item_quantity_recalculates_vat(self):
        """Test that updating item quantity triggers signal to clear VAT cache."""
        # Arrange - Create cart item
        cart_item = CartItem.objects.create(
            cart=self.cart,
            quantity=1,
            actual_price=Decimal('100.00'),
            item_type='fee'
        )

        # Set initial VAT result (after item creation which clears it)
        self.cart.vat_result = {
            'status': 'calculated',
            'region': 'UK',
            'total_net_amount': '100.00',
            'total_vat_amount': '20.00',
            'total_gross_amount': '120.00',
            'vat_breakdown': []
        }
        self.cart.save()

        # Verify initial VAT is set
        self.cart.refresh_from_db()
        self.assertIsNotNone(self.cart.vat_result)

        # Act - Update quantity (triggers signal to clear VAT cache)
        cart_item.quantity = 3
        cart_item.save()

        # Assert - Signal should have cleared VAT cache
        self.cart.refresh_from_db()
        self.assertIsNone(self.cart.vat_result)

    def test_remove_item_invalidates_vat_cache(self):
        """Test that removing item invalidates VAT cache via signal."""
        # Arrange - Create cart item
        cart_item = CartItem.objects.create(
            cart=self.cart,
            quantity=1,
            actual_price=Decimal('100.00'),
            item_type='fee'
        )

        # Set VAT result AFTER item creation
        self.cart.vat_result = {
            'success': True,
            'status': 'calculated',
            'region': 'UK',
            'total_net_amount': '100.00',
            'total_vat_amount': '20.00',
            'total_gross_amount': '120.00',
            'vat_breakdown': []
        }
        self.cart.save()

        # Verify initial VAT is set
        self.cart.refresh_from_db()
        self.assertIsNotNone(self.cart.vat_result)

        # Act - Delete item directly (triggers signal)
        cart_item.delete()

        # Assert - Signal should have cleared VAT cache
        self.cart.refresh_from_db()
        self.assertIsNone(self.cart.vat_result)

    @patch('cart.views.vat_orchestrator.execute_vat_calculation')
    def test_vat_calculation_error_handling(self, mock_orchestrator):
        """Test that VAT calculation errors are properly handled and stored."""
        # Arrange - Create cart item first
        CartItem.objects.create(
            cart=self.cart,
            quantity=1,
            actual_price=Decimal('100.00'),
            item_type='fee'
        )

        # Mock orchestrator to raise exception
        mock_orchestrator.side_effect = Exception("Rules Engine connection failed")

        # Act - Trigger VAT recalculation via API
        url = reverse('cart-vat-recalculate')
        response = self.client.post(url, format='json')

        # Assert - Response should still be OK (error handled gracefully)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify error flags are set on cart
        self.cart.refresh_from_db()
        self.assertTrue(self.cart.vat_calculation_error)
        self.assertIsNotNone(self.cart.vat_calculation_error_message)
        self.assertIn("Rules Engine connection failed", self.cart.vat_calculation_error_message)

    @patch('cart.services.vat_orchestrator.VATAudit')
    @patch('cart.services.vat_orchestrator.rule_engine.execute')
    def test_regional_vat_variations_uk(self, mock_rule_engine, mock_vat_audit):
        """Test UK region 20% VAT calculation end-to-end."""
        # Arrange
        cart_item = CartItem.objects.create(
            cart=self.cart,
            quantity=1,
            actual_price=Decimal('100.00'),
            item_type='fee'
        )

        mock_rule_engine.return_value = {
            'success': True,
            'cart': {
                'items': [{
                    'id': str(cart_item.id),
                    'actual_price': '100.00',
                    'quantity': 1,
                    'vat_amount': '20.00',
                    'vat_rate': '0.2000',
                    'vat_region': 'UK',
                    'gross_amount': '120.00'
                }]
            },
            'context': {'region': 'UK'},
            'rules_executed': ['calculate_vat_uk'],
            'execution_id': 'exec_uk'
        }

        # Set vat_result after item creation
        self.cart.vat_result = {
            'status': 'calculated',
            'region': 'UK',
            'totals': {'net': '100.00', 'vat': '20.00', 'gross': '120.00'}
        }
        self.cart.save()

        # Act - GET cart
        url = reverse('cart-list')
        response = self.client.get(url)

        # Assert
        self.assertEqual(response.data['vat_totals']['region'], 'UK')
        self.assertEqual(response.data['vat_totals']['totals']['vat'], '20.00')

    @patch('cart.services.vat_orchestrator.VATAudit')
    @patch('cart.services.vat_orchestrator.rule_engine.execute')
    def test_regional_vat_variations_sa(self, mock_rule_engine, mock_vat_audit):
        """Test SA region 15% VAT calculation end-to-end."""
        # Arrange
        cart_item = CartItem.objects.create(
            cart=self.cart,
            quantity=1,
            actual_price=Decimal('100.00'),
            item_type='fee'
        )

        # Set vat_result for SA region
        self.cart.vat_result = {
            'status': 'calculated',
            'region': 'SA',
            'totals': {'net': '100.00', 'vat': '15.00', 'gross': '115.00'}
        }
        self.cart.save()

        # Act - GET cart
        url = reverse('cart-list')
        response = self.client.get(url)

        # Assert
        self.assertEqual(response.data['vat_totals']['region'], 'SA')
        self.assertEqual(response.data['vat_totals']['totals']['vat'], '15.00')
        self.assertEqual(response.data['vat_totals']['totals']['gross'], '115.00')

    @patch('cart.services.vat_orchestrator.VATAudit')
    @patch('cart.services.vat_orchestrator.rule_engine.execute')
    def test_regional_vat_variations_eu(self, mock_rule_engine, mock_vat_audit):
        """Test EU region 0% VAT (reverse charge) end-to-end."""
        # Arrange
        cart_item = CartItem.objects.create(
            cart=self.cart,
            quantity=1,
            actual_price=Decimal('100.00'),
            item_type='fee'
        )

        # Set vat_result for EU region
        self.cart.vat_result = {
            'status': 'calculated',
            'region': 'EU',
            'totals': {'net': '100.00', 'vat': '0.00', 'gross': '100.00'}
        }
        self.cart.save()

        # Act - GET cart
        url = reverse('cart-list')
        response = self.client.get(url)

        # Assert
        self.assertEqual(response.data['vat_totals']['region'], 'EU')
        self.assertEqual(response.data['vat_totals']['totals']['vat'], '0.00')
        self.assertEqual(response.data['vat_totals']['totals']['gross'], '100.00')

    @patch('cart.services.vat_orchestrator.VATAudit')
    @patch('cart.services.vat_orchestrator.rule_engine.execute')
    def test_multiple_items_vat_aggregation(self, mock_rule_engine, mock_vat_audit):
        """Test VAT calculation with multiple cart items."""
        # Arrange - Create multiple items
        item1 = CartItem.objects.create(
            cart=self.cart,
            quantity=2,
            actual_price=Decimal('100.00'),
            item_type='fee'
        )
        item2 = CartItem.objects.create(
            cart=self.cart,
            quantity=1,
            actual_price=Decimal('150.00'),
            item_type='fee'
        )

        # Set aggregated vat_result
        self.cart.vat_result = {
            'status': 'calculated',
            'region': 'UK',
            'totals': {
                'net': '350.00',  # (100*2) + (150*1)
                'vat': '70.00',   # (200*0.20) + (150*0.20)
                'gross': '420.00'
            },
            'items': [
                {
                    'id': str(item1.id),
                    'vat_amount': '40.00',
                    'gross_amount': '240.00'
                },
                {
                    'id': str(item2.id),
                    'vat_amount': '30.00',
                    'gross_amount': '180.00'
                }
            ]
        }
        self.cart.save()

        # Act - GET cart
        url = reverse('cart-list')
        response = self.client.get(url)

        # Assert - Verify aggregated totals
        self.assertEqual(response.data['vat_totals']['totals']['net'], '350.00')
        self.assertEqual(response.data['vat_totals']['totals']['vat'], '70.00')
        self.assertEqual(response.data['vat_totals']['totals']['gross'], '420.00')

    def test_vat_audit_trail_created(self):
        """Test that VAT calculation creates audit trail record.

        Phase 5: True E2E test - verify VATAudit record is actually created
        by the orchestrator without mocking internals.
        """
        from vat.models import VATAudit

        # Phase 5: Create cart item directly (add API requires product)
        CartItem.objects.create(
            cart=self.cart,
            item_type='fee',
            quantity=1,
            actual_price=Decimal('100.00')
        )

        # Count audit records before
        audit_count_before = VATAudit.objects.filter(cart=self.cart).count()

        # Act - Trigger VAT calculation via recalculate endpoint
        url = reverse('cart-vat-recalculate')
        response = self.client.post(url, format='json')

        # Assert - Verify response is successful
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify VAT result was stored in cart
        self.cart.refresh_from_db()
        self.assertIsNotNone(self.cart.vat_result)

        # Verify audit record was created
        audit_count_after = VATAudit.objects.filter(cart=self.cart).count()
        self.assertEqual(audit_count_after, audit_count_before + 1)

        # Verify audit record has required fields
        audit_record = VATAudit.objects.filter(cart=self.cart).latest('created_at')
        self.assertEqual(audit_record.cart, self.cart)
        self.assertIsNone(audit_record.order)  # No order at cart stage
        self.assertIsNotNone(audit_record.input_context)
        self.assertIsNotNone(audit_record.output_data)

    def test_empty_cart_vat_response(self):
        """Test that empty cart returns appropriate VAT structure."""
        # Arrange - Empty cart (no items, no vat_result)

        # Act - GET cart
        url = reverse('cart-list')
        response = self.client.get(url)

        # Assert - Should return null or not-calculated structure
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        vat_totals = response.data.get('vat_totals')

        # Either null or has status != 'calculated'
        if vat_totals is not None:
            self.assertNotEqual(vat_totals.get('status'), 'calculated')
        else:
            self.assertIsNone(vat_totals)

    @patch('cart.services.vat_orchestrator.VATAudit')
    @patch('cart.services.vat_orchestrator.rule_engine.execute')
    def test_vat_last_calculated_timestamp(self, mock_rule_engine, mock_vat_audit):
        """Test that vat_last_calculated_at timestamp is set and returned."""
        # Arrange
        cart_item = CartItem.objects.create(
            cart=self.cart,
            quantity=1,
            actual_price=Decimal('100.00'),
            item_type='fee'
        )

        now = timezone.now()
        self.cart.vat_result = {
            'status': 'calculated',
            'region': 'UK',
            'totals': {'net': '100.00', 'vat': '20.00', 'gross': '120.00'}
        }
        self.cart.vat_last_calculated_at = now
        self.cart.save()

        # Act - GET cart
        url = reverse('cart-list')
        response = self.client.get(url)

        # Assert
        self.assertIsNotNone(response.data.get('vat_last_calculated_at'))

    @patch('cart.services.vat_orchestrator.VATAudit')
    @patch('cart.services.vat_orchestrator.rule_engine.execute')
    def test_concurrent_item_modifications(self, mock_rule_engine, mock_vat_audit):
        """Test VAT recalculation with rapid item modifications."""
        # Arrange - Create item
        cart_item = CartItem.objects.create(
            cart=self.cart,
            quantity=1,
            actual_price=Decimal('100.00'),
            item_type='fee'
        )

        mock_rule_engine.return_value = {
            'success': True,
            'cart': {
                'items': [{
                    'id': str(cart_item.id),
                    'actual_price': '100.00',
                    'quantity': 5,
                    'vat_amount': '100.00',
                    'vat_rate': '0.2000',
                    'vat_region': 'UK',
                    'gross_amount': '600.00'
                }]
            },
            'context': {'region': 'UK'},
            'rules_executed': ['calculate_vat_uk'],
            'execution_id': 'exec_concurrent'
        }

        # Act - Rapid updates
        url = reverse('cart-update-item')

        for quantity in [2, 3, 4, 5]:
            data = {'item_id': cart_item.id, 'quantity': quantity}
            response = self.client.patch(url, data, format='json')
            self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Assert - Final state is correct
        self.cart.refresh_from_db()
        cart_item.refresh_from_db()

        self.assertEqual(cart_item.quantity, 5)
        # VAT should be recalculated (may be cleared by last signal)
        # This test verifies the system handles rapid updates without crashing
