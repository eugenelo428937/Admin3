"""
Phase 4: Integration tests for Cart VAT functionality
TDD Phase: RED - End-to-end workflow tests

These tests verify complete user workflows with VAT calculations,
testing the integration of models, methods, signals, serializers, and API endpoints.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from decimal import Decimal
from unittest.mock import patch

from cart.models import Cart, CartItem
from exam_sessions_subjects_products.models import ExamSessionSubjectProduct

User = get_user_model()


class CartVATIntegrationTestCase(TestCase):
    """Integration tests for complete VAT calculation workflows"""

    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='test_user',
            email='test@test.com',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)

    def test_workflow_add_item_get_cart_with_vat(self):
        """
        Integration Test: Add item to cart → Get cart → VAT included

        Workflow:
        1. User adds item to cart
        2. VAT stored in cart.vat_result (Phase 5 architecture)
        3. User retrieves cart with VAT data
        """
        # Phase 5: VAT results stored in cart.vat_result JSONB field
        vat_result = {
            'success': True,
            'items': [{
                'item_id': 1,
                'net_amount': '50.00',
                'vat_amount': '10.00',
                'gross_amount': '60.00',
                'vat_region': 'UK',
                'vat_rate': '0.2000'
            }],
            'total_net_amount': '50.00',
            'total_vat_amount': '10.00',
            'total_gross_amount': '60.00',
            'vat_breakdown': [{
                'region': 'UK',
                'rate': '20%',
                'amount': '10.00',
                'item_count': 1
            }]
        }

        # Step 1: Create cart with item
        cart = Cart.objects.create(user=self.user)
        CartItem.objects.create(
            cart=cart,
            item_type='fee',
            quantity=1,
            actual_price=Decimal('50.00')
        )
        # Phase 5: Set vat_result directly (simulates orchestrator calculation)
        # Use update_fields to ensure vat_result is saved after signal cleared it
        cart.vat_result = vat_result
        cart.save(update_fields=['vat_result'])

        # Step 2: Get cart
        response = self.client.get('/api/cart/')

        # Step 3: Verify cart includes VAT
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('vat_totals', response.data)

        vat_totals = response.data['vat_totals']
        self.assertTrue(vat_totals['success'])
        self.assertEqual(Decimal(str(vat_totals['total_net_amount'])), Decimal('50.00'))
        self.assertEqual(Decimal(str(vat_totals['total_vat_amount'])), Decimal('10.00'))
        self.assertEqual(Decimal(str(vat_totals['total_gross_amount'])), Decimal('60.00'))

    def test_workflow_multiple_items_vat_breakdown(self):
        """
        Integration Test: Multiple items → VAT breakdown by region

        Workflow:
        1. User adds multiple items with different VAT regions
        2. VAT stored in cart.vat_result (Phase 5 architecture)
        3. Cart shows VAT breakdown by region
        """
        # Phase 5: VAT results stored in cart.vat_result JSONB field
        vat_result = {
            'success': True,
            'items': [
                {
                    'item_id': 1,
                    'net_amount': '50.00',
                    'vat_amount': '10.00',
                    'gross_amount': '60.00',
                    'vat_region': 'UK',
                    'vat_rate': '0.2000'
                },
                {
                    'item_id': 2,
                    'net_amount': '100.00',
                    'vat_amount': '15.00',
                    'gross_amount': '115.00',
                    'vat_region': 'SA',
                    'vat_rate': '0.1500'
                }
            ],
            'total_net_amount': '150.00',
            'total_vat_amount': '25.00',
            'total_gross_amount': '175.00',
            'vat_breakdown': [
                {
                    'region': 'UK',
                    'rate': '20%',
                    'amount': '10.00',
                    'item_count': 1
                },
                {
                    'region': 'SA',
                    'rate': '15%',
                    'amount': '15.00',
                    'item_count': 1
                }
            ]
        }

        # Create cart with multiple items
        cart = Cart.objects.create(user=self.user)
        CartItem.objects.create(
            cart=cart,
            item_type='fee',
            quantity=1,
            actual_price=Decimal('50.00')
        )
        CartItem.objects.create(
            cart=cart,
            item_type='fee',
            quantity=1,
            actual_price=Decimal('100.00')
        )
        # Phase 5: Set vat_result directly
        # Use update_fields to ensure vat_result is saved after signal cleared it
        cart.vat_result = vat_result
        cart.save(update_fields=['vat_result'])

        # Get cart
        response = self.client.get('/api/cart/')

        # Verify VAT breakdown
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        vat_totals = response.data['vat_totals']

        breakdown = vat_totals['vat_breakdown']
        self.assertEqual(len(breakdown), 2)
        self.assertEqual(breakdown[0]['region'], 'UK')
        self.assertEqual(breakdown[1]['region'], 'SA')
        self.assertEqual(Decimal(str(vat_totals['total_gross_amount'])), Decimal('175.00'))

    def test_workflow_update_quantity_vat_recalculated(self):
        """
        Integration Test: Update quantity → VAT cache cleared → Recalculated

        Workflow:
        1. User has item in cart with cached VAT
        2. User updates item quantity
        3. Signal clears VAT cache
        4. Orchestrator recalculates VAT (simulated)
        5. User retrieves cart with new VAT
        """
        # Create cart with item
        cart = Cart.objects.create(user=self.user)
        item = CartItem.objects.create(
            cart=cart,
            item_type='fee',
            quantity=1,
            actual_price=Decimal('50.00')
        )

        # Set initial VAT cache
        cart.vat_result = {'total': '50.00'}
        cart.save()

        # Update quantity (this triggers signal to clear cache)
        item.quantity = 2
        item.save()

        # Verify cache was cleared by signal
        cart.refresh_from_db()
        self.assertIsNone(cart.vat_result)

        # Phase 5: Simulate orchestrator recalculating VAT after cache cleared
        cart.vat_result = {
            'success': True,
            'items': [{
                'item_id': item.id,
                'net_amount': '100.00',  # 2 * 50
                'vat_amount': '20.00',
                'gross_amount': '120.00',
                'vat_region': 'UK',
                'vat_rate': '0.2000'
            }],
            'total_net_amount': '100.00',
            'total_vat_amount': '20.00',
            'total_gross_amount': '120.00',
            'vat_breakdown': []
        }
        cart.save(update_fields=['vat_result'])

        # Get cart - should show recalculated VAT
        response = self.client.get('/api/cart/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        vat_totals = response.data['vat_totals']
        self.assertEqual(Decimal(str(vat_totals['total_gross_amount'])), Decimal('120.00'))

    def test_workflow_remove_item_vat_recalculated(self):
        """
        Integration Test: Remove item → VAT cache cleared → Recalculated

        Workflow:
        1. User has multiple items in cart with cached VAT
        2. User removes one item
        3. Signal clears VAT cache
        4. Orchestrator recalculates VAT (simulated)
        5. User retrieves cart with new VAT
        """
        # Create cart with two items
        cart = Cart.objects.create(user=self.user)
        item1 = CartItem.objects.create(
            cart=cart,
            item_type='fee',
            quantity=1,
            actual_price=Decimal('50.00')
        )
        item2 = CartItem.objects.create(
            cart=cart,
            item_type='fee',
            quantity=1,
            actual_price=Decimal('100.00')
        )

        # Set initial VAT cache
        cart.vat_result = {'total': '150.00'}
        cart.save()

        # Remove item (this triggers signal to clear cache)
        item1.delete()

        # Verify cache was cleared
        cart.refresh_from_db()
        self.assertIsNone(cart.vat_result)

        # Phase 5: Simulate orchestrator recalculating VAT after cache cleared
        cart.vat_result = {
            'success': True,
            'items': [{
                'item_id': item2.id,
                'net_amount': '100.00',
                'vat_amount': '20.00',
                'gross_amount': '120.00',
                'vat_region': 'UK',
                'vat_rate': '0.2000'
            }],
            'total_net_amount': '100.00',
            'total_vat_amount': '20.00',
            'total_gross_amount': '120.00',
            'vat_breakdown': []
        }
        cart.save(update_fields=['vat_result'])

        # Get cart - should show recalculated VAT for remaining item
        response = self.client.get('/api/cart/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['items']), 1)
        vat_totals = response.data['vat_totals']
        self.assertEqual(Decimal(str(vat_totals['total_gross_amount'])), Decimal('120.00'))

    def test_workflow_different_regions_different_vat(self):
        """
        Integration Test: Different regions → Different VAT rates

        Workflow:
        1. Cart with UK region gets 20% VAT
        2. Cart with SA region gets 15% VAT
        3. Phase 5: vat_result stores region-specific calculations
        """
        # Create cart with item - UK region
        cart_uk = Cart.objects.create(user=self.user)
        CartItem.objects.create(
            cart=cart_uk,
            item_type='fee',
            quantity=1,
            actual_price=Decimal('100.00')
        )
        # UK VAT at 20%
        cart_uk.vat_result = {
            'success': True,
            'items': [],
            'total_net_amount': '100.00',
            'total_vat_amount': '20.00',
            'total_gross_amount': '120.00',
            'vat_breakdown': [{'region': 'UK', 'rate': '20%', 'amount': '20.00', 'item_count': 1}]
        }
        cart_uk.save()

        response_uk = self.client.get('/api/cart/')
        vat_uk = response_uk.data['vat_totals']
        self.assertEqual(Decimal(str(vat_uk['total_gross_amount'])), Decimal('120.00'))
        self.assertEqual(vat_uk['vat_breakdown'][0]['region'], 'UK')

        # Delete UK cart and create SA cart
        cart_uk.delete()

        # Create cart for SA region
        cart_sa = Cart.objects.create(user=self.user)
        CartItem.objects.create(
            cart=cart_sa,
            item_type='fee',
            quantity=1,
            actual_price=Decimal('100.00')
        )
        # SA VAT at 15%
        cart_sa.vat_result = {
            'success': True,
            'items': [],
            'total_net_amount': '100.00',
            'total_vat_amount': '15.00',
            'total_gross_amount': '115.00',
            'vat_breakdown': [{'region': 'SA', 'rate': '15%', 'amount': '15.00', 'item_count': 1}]
        }
        cart_sa.save()

        response_sa = self.client.get('/api/cart/')
        vat_sa = response_sa.data['vat_totals']
        self.assertEqual(Decimal(str(vat_sa['total_gross_amount'])), Decimal('115.00'))
        self.assertEqual(vat_sa['vat_breakdown'][0]['region'], 'SA')

    @patch('cart.views.vat_orchestrator.execute_vat_calculation')
    def test_workflow_manual_recalculation(self, mock_orchestrator):
        """
        Integration Test: Manual VAT recalculation

        Workflow:
        1. User has cart with error state
        2. User triggers manual recalculation via API
        3. Orchestrator recalculates and clears error state
        4. User gets updated VAT totals
        """
        # Create cart with error state
        cart = Cart.objects.create(
            user=self.user,
            vat_calculation_error=True,
            vat_calculation_error_message="Previous error"
        )
        item = CartItem.objects.create(
            cart=cart,
            item_type='fee',
            quantity=1,
            actual_price=Decimal('50.00')
        )

        # Prepare mock result
        vat_result = {
            'success': True,
            'items': [{
                'item_id': item.id,
                'net_amount': '50.00',
                'vat_amount': '10.00',
                'gross_amount': '60.00',
                'vat_region': 'UK',
                'vat_rate': '0.2000'
            }],
            'total_net_amount': '50.00',
            'total_vat_amount': '10.00',
            'total_gross_amount': '60.00',
            'vat_breakdown': []
        }

        # Mock orchestrator - also set cart.vat_result as side effect
        def orchestrator_side_effect(cart_arg):
            cart_arg.vat_result = vat_result
            cart_arg.save(update_fields=['vat_result'])
            return vat_result

        mock_orchestrator.side_effect = orchestrator_side_effect

        # Trigger manual recalculation
        response = self.client.post('/api/cart/vat/recalculate/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify orchestrator was called
        mock_orchestrator.assert_called()

        # Verify VAT totals in response
        vat_totals = response.data['vat_totals']
        self.assertTrue(vat_totals['success'])
        self.assertEqual(Decimal(str(vat_totals['total_gross_amount'])), Decimal('60.00'))

    @patch('cart.views.vat_orchestrator.execute_vat_calculation')
    def test_workflow_error_handling(self, mock_orchestrator):
        """
        Integration Test: VAT calculation error handling

        Workflow:
        1. User has cart
        2. Orchestrator VAT calculation fails
        3. Error state stored in vat_result
        4. User retrieves cart with error information
        """
        # Create cart
        cart = Cart.objects.create(user=self.user)
        CartItem.objects.create(
            cart=cart,
            item_type='fee',
            quantity=1,
            actual_price=Decimal('50.00')
        )

        # Prepare error result
        vat_error_result = {
            'success': False,
            'error': 'Rules engine unavailable',
            'items': [],
            'total_net_amount': '0.00',
            'total_vat_amount': '0.00',
            'total_gross_amount': '0.00',
            'vat_breakdown': []
        }

        # Mock orchestrator failure - also set cart.vat_result as side effect
        def orchestrator_side_effect(cart_arg):
            cart_arg.vat_result = vat_error_result
            cart_arg.save(update_fields=['vat_result'])
            return vat_error_result

        mock_orchestrator.side_effect = orchestrator_side_effect

        # Trigger recalculation that will fail
        response = self.client.post('/api/cart/vat/recalculate/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify error in response
        vat_totals = response.data['vat_totals']
        self.assertFalse(vat_totals['success'])
        self.assertIn('error', vat_totals)
        self.assertEqual(vat_totals['error'], 'Rules engine unavailable')
