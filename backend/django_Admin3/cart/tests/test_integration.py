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

    @patch('cart.models.Cart.calculate_vat_for_all_items')
    def test_workflow_add_item_get_cart_with_vat(self, mock_calculate_vat):
        """
        Integration Test: Add item to cart → Get cart → VAT included

        Workflow:
        1. User adds item to cart
        2. User retrieves cart
        3. Cart includes VAT calculations
        """
        # Mock VAT calculation
        mock_calculate_vat.return_value = {
            'success': True,
            'items': [{
                'item_id': 1,
                'net_amount': Decimal('50.00'),
                'vat_amount': Decimal('10.00'),
                'gross_amount': Decimal('60.00'),
                'vat_region': 'UK',
                'vat_rate': Decimal('0.2000')
            }],
            'total_net_amount': Decimal('50.00'),
            'total_vat_amount': Decimal('10.00'),
            'total_gross_amount': Decimal('60.00'),
            'vat_breakdown': [{
                'region': 'UK',
                'rate': '20%',
                'amount': Decimal('10.00'),
                'item_count': 1
            }]
        }

        # Step 1: Add item to cart (fee item for simplicity)
        cart = Cart.objects.create(user=self.user)
        CartItem.objects.create(
            cart=cart,
            item_type='fee',
            quantity=1,
            actual_price=Decimal('50.00')
        )

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

    @patch('cart.models.Cart.calculate_vat_for_all_items')
    def test_workflow_multiple_items_vat_breakdown(self, mock_calculate_vat):
        """
        Integration Test: Multiple items → VAT breakdown by region

        Workflow:
        1. User adds multiple items with different VAT regions
        2. User retrieves cart
        3. Cart shows VAT breakdown by region
        """
        # Mock VAT calculation with multiple regions
        mock_calculate_vat.return_value = {
            'success': True,
            'items': [
                {
                    'item_id': 1,
                    'net_amount': Decimal('50.00'),
                    'vat_amount': Decimal('10.00'),
                    'gross_amount': Decimal('60.00'),
                    'vat_region': 'UK',
                    'vat_rate': Decimal('0.2000')
                },
                {
                    'item_id': 2,
                    'net_amount': Decimal('100.00'),
                    'vat_amount': Decimal('15.00'),
                    'gross_amount': Decimal('115.00'),
                    'vat_region': 'SA',
                    'vat_rate': Decimal('0.1500')
                }
            ],
            'total_net_amount': Decimal('150.00'),
            'total_vat_amount': Decimal('25.00'),
            'total_gross_amount': Decimal('175.00'),
            'vat_breakdown': [
                {
                    'region': 'UK',
                    'rate': '20%',
                    'amount': Decimal('10.00'),
                    'item_count': 1
                },
                {
                    'region': 'SA',
                    'rate': '15%',
                    'amount': Decimal('15.00'),
                    'item_count': 1
                }
            ]
        }

        # Add multiple items
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

    @patch('cart.models.Cart.calculate_vat_for_all_items')
    def test_workflow_update_quantity_vat_recalculated(self, mock_calculate_vat):
        """
        Integration Test: Update quantity → VAT recalculated

        Workflow:
        1. User has item in cart
        2. User updates item quantity
        3. Signals clear VAT cache
        4. User retrieves cart
        5. VAT is recalculated for new quantity
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

        # Mock recalculation after quantity change
        mock_calculate_vat.return_value = {
            'success': True,
            'items': [{
                'item_id': item.id,
                'net_amount': Decimal('100.00'),  # 2 * 50
                'vat_amount': Decimal('20.00'),
                'gross_amount': Decimal('120.00'),
                'vat_region': 'UK',
                'vat_rate': Decimal('0.2000')
            }],
            'total_net_amount': Decimal('100.00'),
            'total_vat_amount': Decimal('20.00'),
            'total_gross_amount': Decimal('120.00'),
            'vat_breakdown': []
        }

        # Update quantity via API (this triggers signal)
        item.quantity = 2
        item.save()

        # Verify cache was cleared by signal
        cart.refresh_from_db()
        self.assertIsNone(cart.vat_result)

        # Get cart - should show recalculated VAT
        response = self.client.get('/api/cart/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        vat_totals = response.data['vat_totals']
        self.assertEqual(Decimal(str(vat_totals['total_gross_amount'])), Decimal('120.00'))

    @patch('cart.models.Cart.calculate_vat_for_all_items')
    def test_workflow_remove_item_vat_recalculated(self, mock_calculate_vat):
        """
        Integration Test: Remove item → VAT recalculated

        Workflow:
        1. User has multiple items in cart
        2. User removes one item
        3. Signals clear VAT cache
        4. User retrieves cart
        5. VAT is recalculated for remaining items
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

        # Mock recalculation after item removal
        mock_calculate_vat.return_value = {
            'success': True,
            'items': [{
                'item_id': item2.id,
                'net_amount': Decimal('100.00'),
                'vat_amount': Decimal('20.00'),
                'gross_amount': Decimal('120.00'),
                'vat_region': 'UK',
                'vat_rate': Decimal('0.2000')
            }],
            'total_net_amount': Decimal('100.00'),
            'total_vat_amount': Decimal('20.00'),
            'total_gross_amount': Decimal('120.00'),
            'vat_breakdown': []
        }

        # Remove item (this triggers signal)
        item1.delete()

        # Verify cache was cleared
        cart.refresh_from_db()
        self.assertIsNone(cart.vat_result)

        # Get cart - should show recalculated VAT for remaining item
        response = self.client.get('/api/cart/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['items']), 1)
        vat_totals = response.data['vat_totals']
        self.assertEqual(Decimal(str(vat_totals['total_gross_amount'])), Decimal('120.00'))

    @patch('cart.models.Cart.calculate_vat_for_all_items')
    def test_workflow_change_country_vat_recalculated(self, mock_calculate_vat):
        """
        Integration Test: Change country → VAT recalculated for new country

        Workflow:
        1. User retrieves cart for UK (20% VAT)
        2. User retrieves cart for ZA (15% VAT)
        3. VAT is recalculated for new country
        """
        # Create cart with item
        cart = Cart.objects.create(user=self.user)
        CartItem.objects.create(
            cart=cart,
            item_type='fee',
            quantity=1,
            actual_price=Decimal('100.00')
        )

        # First call: UK VAT (20%)
        mock_calculate_vat.return_value = {
            'success': True,
            'items': [],
            'total_net_amount': Decimal('100.00'),
            'total_vat_amount': Decimal('20.00'),
            'total_gross_amount': Decimal('120.00'),
            'vat_breakdown': []
        }

        response_uk = self.client.get('/api/cart/?country_code=GB')
        vat_uk = response_uk.data['vat_totals']

        # Verify UK VAT calculated
        mock_calculate_vat.assert_called()
        call_kwargs = mock_calculate_vat.call_args.kwargs
        self.assertEqual(call_kwargs['country_code'], 'GB')

        # Second call: ZA VAT (15%)
        mock_calculate_vat.return_value = {
            'success': True,
            'items': [],
            'total_net_amount': Decimal('100.00'),
            'total_vat_amount': Decimal('15.00'),
            'total_gross_amount': Decimal('115.00'),
            'vat_breakdown': []
        }

        response_za = self.client.get('/api/cart/?country_code=ZA')
        vat_za = response_za.data['vat_totals']

        # Verify ZA VAT calculated
        call_kwargs = mock_calculate_vat.call_args.kwargs
        self.assertEqual(call_kwargs['country_code'], 'ZA')
        self.assertEqual(Decimal(str(vat_za['total_gross_amount'])), Decimal('115.00'))

    @patch('cart.models.Cart.calculate_vat_for_all_items')
    def test_workflow_manual_recalculation(self, mock_calculate_vat):
        """
        Integration Test: Manual VAT recalculation

        Workflow:
        1. User has cart with error state
        2. User triggers manual recalculation
        3. VAT is recalculated and error state cleared
        4. CartItem VAT fields updated
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

        # Mock successful recalculation
        mock_calculate_vat.return_value = {
            'success': True,
            'items': [{
                'item_id': item.id,
                'net_amount': Decimal('50.00'),
                'vat_amount': Decimal('10.00'),
                'gross_amount': Decimal('60.00'),
                'vat_region': 'UK',
                'vat_rate': Decimal('0.2000')
            }],
            'total_net_amount': Decimal('50.00'),
            'total_vat_amount': Decimal('10.00'),
            'total_gross_amount': Decimal('60.00'),
            'vat_breakdown': []
        }

        # Trigger manual recalculation
        response = self.client.post('/api/cart/vat/recalculate/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify update_items=True was used
        mock_calculate_vat.assert_called()
        call_kwargs = mock_calculate_vat.call_args.kwargs
        self.assertTrue(call_kwargs.get('update_items', False))

        # Verify error state cleared
        cart.refresh_from_db()
        self.assertFalse(cart.vat_calculation_error)
        self.assertIsNone(cart.vat_calculation_error_message)

        # Verify VAT totals in response
        vat_totals = response.data['vat_totals']
        self.assertTrue(vat_totals['success'])
        self.assertEqual(Decimal(str(vat_totals['total_gross_amount'])), Decimal('60.00'))

    @patch('cart.models.Cart.calculate_vat_for_all_items')
    def test_workflow_error_handling(self, mock_calculate_vat):
        """
        Integration Test: VAT calculation error handling

        Workflow:
        1. User has cart
        2. VAT calculation fails (rules engine unavailable)
        3. Error state is set on cart
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

        # Mock failed VAT calculation
        mock_calculate_vat.return_value = {
            'success': False,
            'error': 'Rules engine unavailable',
            'items': [],
            'total_net_amount': Decimal('0.00'),
            'total_vat_amount': Decimal('0.00'),
            'total_gross_amount': Decimal('0.00'),
            'vat_breakdown': []
        }

        # Trigger recalculation that will fail
        response = self.client.post('/api/cart/vat/recalculate/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify error in response
        vat_totals = response.data['vat_totals']
        self.assertFalse(vat_totals['success'])
        self.assertIn('error', vat_totals)
        self.assertEqual(vat_totals['error'], 'Rules engine unavailable')

        # Verify error state set on cart
        cart.refresh_from_db()
        self.assertTrue(cart.vat_calculation_error)
        self.assertEqual(cart.vat_calculation_error_message, 'Rules engine unavailable')
