"""
Phase 4: API endpoint tests for Cart VAT integration
TDD Phase: RED - Tests for API endpoints with VAT calculations

These tests verify that API endpoints properly return VAT data in responses.
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


class CartAPIVATTestCase(TestCase):
    """Test Cart API endpoints include VAT calculations"""

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
    def test_get_cart_includes_vat_totals(self, mock_calculate_vat):
        """Test GET /api/cart/ includes VAT totals"""
        # Mock VAT calculation
        mock_calculate_vat.return_value = {
            'success': True,
            'items': [],
            'total_net_amount': Decimal('100.00'),
            'total_vat_amount': Decimal('20.00'),
            'total_gross_amount': Decimal('120.00'),
            'vat_breakdown': [
                {
                    'region': 'UK',
                    'rate': '20%',
                    'amount': Decimal('20.00'),
                    'item_count': 1
                }
            ]
        }

        response = self.client.get('/api/cart/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('vat_totals', response.data)

        vat_totals = response.data['vat_totals']
        self.assertTrue(vat_totals['success'])
        self.assertEqual(Decimal(str(vat_totals['total_net_amount'])), Decimal('100.00'))
        self.assertEqual(Decimal(str(vat_totals['total_vat_amount'])), Decimal('20.00'))
        self.assertEqual(Decimal(str(vat_totals['total_gross_amount'])), Decimal('120.00'))

    @patch('cart.models.Cart.calculate_vat_for_all_items')
    def test_get_cart_accepts_country_code_param(self, mock_calculate_vat):
        """Test GET /api/cart/?country_code=ZA uses provided country code"""
        mock_calculate_vat.return_value = {
            'success': True,
            'items': [],
            'total_net_amount': Decimal('100.00'),
            'total_vat_amount': Decimal('15.00'),
            'total_gross_amount': Decimal('115.00'),
            'vat_breakdown': []
        }

        response = self.client.get('/api/cart/?country_code=ZA')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Verify calculate_vat_for_all_items was called with ZA
        mock_calculate_vat.assert_called()
        call_kwargs = mock_calculate_vat.call_args.kwargs
        self.assertEqual(call_kwargs['country_code'], 'ZA')

    def test_get_cart_includes_vat_error_flags(self):
        """Test GET /api/cart/ includes VAT error flags"""
        # Create cart with error state
        cart = Cart.objects.create(
            user=self.user,
            vat_calculation_error=True,
            vat_calculation_error_message="Test error"
        )

        response = self.client.get('/api/cart/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('vat_calculation_error', response.data)
        self.assertTrue(response.data['vat_calculation_error'])
        self.assertEqual(response.data['vat_calculation_error_message'], "Test error")

    def test_get_cart_includes_vat_timestamp(self):
        """Test GET /api/cart/ includes VAT calculation timestamp"""
        from django.utils import timezone
        timestamp = timezone.now()

        cart = Cart.objects.create(
            user=self.user,
            vat_last_calculated_at=timestamp
        )

        response = self.client.get('/api/cart/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('vat_last_calculated_at', response.data)
        self.assertIsNotNone(response.data['vat_last_calculated_at'])


class CartItemAPIVATTestCase(TestCase):
    """Test CartItem operations trigger VAT recalculation"""

    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='test_user',
            email='test@test.com',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)

        # Note: We can't create ExamSessionSubjectProduct without complex setup
        # For these tests, we'll test the signal behavior, not the full flow

    def test_add_item_clears_vat_cache(self):
        """Test POST /api/cart/add/ clears VAT cache (via signals)"""
        # Create cart with VAT cache
        cart = Cart.objects.create(user=self.user, vat_result={'total': '100.00'})

        # Add a fee item (doesn't require product)
        cart_item = CartItem.objects.create(
            cart=cart,
            item_type='fee',
            quantity=1,
            actual_price=Decimal('50.00')
        )

        # Refresh cart - signals should have cleared VAT cache
        cart.refresh_from_db()
        self.assertIsNone(cart.vat_result)

    def test_update_item_clears_vat_cache(self):
        """Test updating CartItem clears VAT cache (via signals)"""
        cart = Cart.objects.create(user=self.user, vat_result={'total': '100.00'})

        cart_item = CartItem.objects.create(
            cart=cart,
            item_type='fee',
            quantity=1,
            actual_price=Decimal('50.00')
        )

        # Clear VAT result and set new cached value
        cart.vat_result = {'total': '50.00'}
        cart.save()

        # Update item - should trigger signal to clear cache
        cart_item.quantity = 2
        cart_item.save()

        cart.refresh_from_db()
        self.assertIsNone(cart.vat_result)

    def test_remove_item_clears_vat_cache(self):
        """Test deleting CartItem clears VAT cache (via signals)"""
        cart = Cart.objects.create(user=self.user, vat_result={'total': '100.00'})

        cart_item = CartItem.objects.create(
            cart=cart,
            item_type='fee',
            quantity=1,
            actual_price=Decimal('50.00')
        )

        # Set VAT cache
        cart.vat_result = {'total': '50.00'}
        cart.save()

        # Delete item - should trigger signal to clear cache
        cart_item.delete()

        cart.refresh_from_db()
        self.assertIsNone(cart.vat_result)


class CartVATRecalculateEndpointTestCase(TestCase):
    """Test manual VAT recalculation endpoint"""

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
    def test_recalculate_endpoint_exists(self, mock_calculate_vat):
        """Test POST /api/cart/vat/recalculate/ endpoint exists"""
        mock_calculate_vat.return_value = {
            'success': True,
            'items': [],
            'total_net_amount': Decimal('0.00'),
            'total_vat_amount': Decimal('0.00'),
            'total_gross_amount': Decimal('0.00'),
            'vat_breakdown': []
        }

        response = self.client.post('/api/cart/vat/recalculate/')

        # Endpoint should exist (not 404)
        self.assertNotEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    @patch('cart.models.Cart.calculate_vat_for_all_items')
    def test_recalculate_forces_fresh_calculation(self, mock_calculate_vat):
        """Test recalculate endpoint forces fresh VAT calculation"""
        # Create cart with error state
        cart = Cart.objects.create(
            user=self.user,
            vat_calculation_error=True,
            vat_calculation_error_message="Previous error"
        )

        # Mock successful recalculation
        mock_calculate_vat.return_value = {
            'success': True,
            'items': [],
            'total_net_amount': Decimal('100.00'),
            'total_vat_amount': Decimal('20.00'),
            'total_gross_amount': Decimal('120.00'),
            'vat_breakdown': []
        }

        response = self.client.post('/api/cart/vat/recalculate/')

        # Should return success
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify calculate_vat_for_all_items was called with update_items=True
        mock_calculate_vat.assert_called()
        call_kwargs = mock_calculate_vat.call_args.kwargs
        self.assertTrue(call_kwargs.get('update_items', False))

    @patch('cart.models.Cart.calculate_vat_for_all_items')
    def test_recalculate_accepts_country_code(self, mock_calculate_vat):
        """Test recalculate endpoint accepts country_code parameter"""
        mock_calculate_vat.return_value = {
            'success': True,
            'items': [],
            'total_net_amount': Decimal('0.00'),
            'total_vat_amount': Decimal('0.00'),
            'total_gross_amount': Decimal('0.00'),
            'vat_breakdown': []
        }

        response = self.client.post('/api/cart/vat/recalculate/', {'country_code': 'ZA'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify calculate_vat_for_all_items was called with ZA
        mock_calculate_vat.assert_called()
        call_kwargs = mock_calculate_vat.call_args.kwargs
        self.assertEqual(call_kwargs['country_code'], 'ZA')

    @patch('cart.models.Cart.calculate_vat_for_all_items')
    def test_recalculate_clears_error_state_on_success(self, mock_calculate_vat):
        """Test successful recalculation clears error state"""
        cart = Cart.objects.create(
            user=self.user,
            vat_calculation_error=True,
            vat_calculation_error_message="Old error"
        )

        # Mock successful calculation
        mock_calculate_vat.return_value = {
            'success': True,
            'items': [],
            'total_net_amount': Decimal('0.00'),
            'total_vat_amount': Decimal('0.00'),
            'total_gross_amount': Decimal('0.00'),
            'vat_breakdown': []
        }

        response = self.client.post('/api/cart/vat/recalculate/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify error state cleared
        cart.refresh_from_db()
        self.assertFalse(cart.vat_calculation_error)
        self.assertIsNone(cart.vat_calculation_error_message)

    @patch('cart.models.Cart.calculate_vat_for_all_items')
    def test_recalculate_returns_error_on_failure(self, mock_calculate_vat):
        """Test recalculate endpoint returns error information"""
        # Mock failed calculation
        mock_calculate_vat.return_value = {
            'success': False,
            'error': 'Rules engine unavailable',
            'items': [],
            'total_net_amount': Decimal('0.00'),
            'total_vat_amount': Decimal('0.00'),
            'total_gross_amount': Decimal('0.00'),
            'vat_breakdown': []
        }

        response = self.client.post('/api/cart/vat/recalculate/')

        # Should still return 200 but with error in response
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('vat_totals', response.data)
        self.assertFalse(response.data['vat_totals']['success'])
        self.assertIn('error', response.data['vat_totals'])
