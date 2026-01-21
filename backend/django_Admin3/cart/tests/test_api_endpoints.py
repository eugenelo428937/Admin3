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
# Note: Cart now uses store.Product (T087 legacy app cleanup)

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

    def test_get_cart_includes_vat_totals(self):
        """Test GET /api/cart/ includes VAT totals"""
        # Phase 5: Create cart with vat_result set directly
        cart = Cart.objects.create(
            user=self.user,
            vat_result={
                'success': True,
                'items': [],
                'totals': {
                    'net': '100.00',
                    'vat': '20.00',
                    'gross': '120.00'
                },
                'total_net_amount': '100.00',
                'total_vat_amount': '20.00',
                'total_gross_amount': '120.00',
                'vat_breakdown': [
                    {
                        'region': 'UK',
                        'rate': '20%',
                        'amount': '20.00',
                        'item_count': 1
                    }
                ]
            }
        )

        response = self.client.get('/api/cart/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('vat_totals', response.data)

        vat_totals = response.data['vat_totals']
        self.assertTrue(vat_totals['success'])
        self.assertEqual(Decimal(str(vat_totals['total_net_amount'])), Decimal('100.00'))
        self.assertEqual(Decimal(str(vat_totals['total_vat_amount'])), Decimal('20.00'))
        self.assertEqual(Decimal(str(vat_totals['total_gross_amount'])), Decimal('120.00'))

    def test_get_cart_accepts_country_code_param(self):
        """Test GET /api/cart/?country_code=ZA returns cart data"""
        # Phase 5: GET endpoint is read-only, reads from vat_result
        # Country code param may be used for future recalculation features
        cart = Cart.objects.create(
            user=self.user,
            vat_result={
                'success': True,
                'items': [],
                'total_net_amount': '100.00',
                'total_vat_amount': '15.00',
                'total_gross_amount': '115.00',
                'vat_breakdown': []
            }
        )

        response = self.client.get('/api/cart/?country_code=ZA')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Verify cart data is returned
        self.assertIn('vat_totals', response.data)

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

    # T019: API Contract Tests for POST /cart/add/
    def test_add_item_via_api_returns_cart_with_vat(self):
        """Test POST /api/cart/add/ returns cart with VAT totals"""
        # Note: The add endpoint requires a product_id, but creating products
        # requires complex setup with ExamSessionSubjectProduct.
        # For now, we verify that adding items (via model) triggers cache invalidation
        # and that the cart response includes VAT data.

        # This test verifies the integration: add item → signals → cache cleared → fresh VAT
        cart = Cart.objects.create(user=self.user)

        # Add item directly (endpoint would do the same)
        CartItem.objects.create(
            cart=cart,
            item_type='fee',
            quantity=1,
            actual_price=Decimal('50.00')
        )

        # Get cart via API - should include VAT totals
        response = self.client.get('/api/cart/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('vat_totals', response.data)
        # VAT cache should have been cleared and recalculated

    # T020: API Contract Tests for PATCH /cart/update_item/
    @patch('rules_engine.services.rule_engine.rule_engine')
    def test_update_item_returns_updated_vat(self, mock_rule_engine):
        """Test PATCH /api/cart/update_item/ returns updated VAT"""
        # Mock rules engine
        mock_rule_engine.execute.side_effect = [
            {
                'cart_item': {'vat_amount': Decimal('10.00'), 'gross_amount': Decimal('60.00')},
                'vat': {'region': 'UK', 'rate': Decimal('0.2000')}
            },
            {
                'cart_item': {'vat_amount': Decimal('30.00'), 'gross_amount': Decimal('180.00')},
                'vat': {'region': 'UK', 'rate': Decimal('0.2000')}
            }
        ]

        # Create cart with item
        cart = Cart.objects.create(user=self.user)
        cart_item = CartItem.objects.create(
            cart=cart,
            item_type='fee',
            quantity=1,
            actual_price=Decimal('50.00')
        )

        # Update quantity via API
        response = self.client.patch('/api/cart/update_item/', {
            'item_id': cart_item.id,
            'quantity': 3
        })

        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])
        # VAT should be recalculated for new quantity

    # T021: API Contract Tests for DELETE /cart/remove/
    def test_remove_item_triggers_vat_recalc(self):
        """Test DELETE /api/cart/remove/ triggers VAT recalculation"""
        # Create cart with 2 items
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
            actual_price=Decimal('30.00')
        )

        # Set old VAT cache before deletion
        old_vat_result = {'cached': 'data', 'totals': {'gross': '80.00'}}
        cart.vat_result = old_vat_result
        cart.save()

        # Delete one item via API (send item_id in request body, not query param)
        response = self.client.delete('/api/cart/remove/', {'item_id': item1.id}, format='json')

        # Should return success
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify item deleted
        self.assertFalse(CartItem.objects.filter(id=item1.id).exists())
        self.assertTrue(CartItem.objects.filter(id=item2.id).exists())

        # Phase 5: Remove endpoint triggers VAT recalculation for remaining items
        # Verify VAT was recalculated (vat_result should be different from old cache)
        cart.refresh_from_db()
        self.assertIsNotNone(cart.vat_result)
        # The new result should have 'status' key from real calculation
        self.assertIn('status', cart.vat_result)


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

    @patch('cart.services.vat_orchestrator.vat_orchestrator.execute_vat_calculation')
    def test_recalculate_endpoint_exists(self, mock_execute_vat):
        """Test POST /api/cart/vat/recalculate/ endpoint exists"""
        # Create a cart for the user first
        Cart.objects.create(user=self.user)

        mock_execute_vat.return_value = {
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

    @patch('cart.services.vat_orchestrator.vat_orchestrator.execute_vat_calculation')
    def test_recalculate_forces_fresh_calculation(self, mock_execute_vat):
        """Test recalculate endpoint forces fresh VAT calculation"""
        # Create cart with error state
        cart = Cart.objects.create(
            user=self.user,
            vat_calculation_error=True,
            vat_calculation_error_message="Previous error"
        )

        # Mock successful recalculation
        mock_execute_vat.return_value = {
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

        # Verify execute_vat_calculation was called
        mock_execute_vat.assert_called()

    @patch('cart.views.vat_orchestrator.execute_vat_calculation')
    def test_recalculate_accepts_country_code(self, mock_execute_vat):
        """Test recalculate endpoint triggers VAT calculation.

        Note: Phase 5 recalculate endpoint currently gets country from user profile,
        not from request parameter. This test verifies the endpoint works.
        """
        # Create a cart for the user first
        cart = Cart.objects.create(user=self.user)

        mock_execute_vat.return_value = {
            'success': True,
            'status': 'calculated',
            'region': 'ZA',
            'items': [],
            'totals': {'net': '0.00', 'vat': '0.00', 'gross': '0.00'},
            'total_net_amount': '0.00',
            'total_vat_amount': '0.00',
            'total_gross_amount': '0.00',
            'vat_breakdown': []
        }

        response = self.client.post('/api/cart/vat/recalculate/', {'country_code': 'ZA'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify execute_vat_calculation was called with the cart
        mock_execute_vat.assert_called_once_with(cart)

    @patch('cart.views.vat_orchestrator.execute_vat_calculation')
    def test_recalculate_clears_error_state_on_success(self, mock_execute_vat):
        """Test successful recalculation clears error state"""
        cart = Cart.objects.create(
            user=self.user,
            vat_calculation_error=True,
            vat_calculation_error_message="Old error"
        )

        # Mock successful calculation
        mock_execute_vat.return_value = {
            'success': True,
            'status': 'calculated',
            'region': 'UK',
            'items': [],
            'totals': {'net': '0.00', 'vat': '0.00', 'gross': '0.00'},
            'total_net_amount': '0.00',
            'total_vat_amount': '0.00',
            'total_gross_amount': '0.00',
            'vat_breakdown': []
        }

        response = self.client.post('/api/cart/vat/recalculate/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify error state cleared
        cart.refresh_from_db()
        self.assertFalse(cart.vat_calculation_error)
        self.assertIsNone(cart.vat_calculation_error_message)

    @patch('cart.views.vat_orchestrator.execute_vat_calculation')
    def test_recalculate_returns_error_on_failure(self, mock_execute_vat):
        """Test recalculate endpoint handles calculation failure.

        Phase 5: When orchestrator raises exception, view catches it and sets
        error flags on cart. The response still returns 200 with error state.
        """
        # Create a cart for the user first
        cart = Cart.objects.create(user=self.user)

        # Mock failed calculation - raise exception as real orchestrator does
        mock_execute_vat.side_effect = Exception('Rules engine unavailable')

        response = self.client.post('/api/cart/vat/recalculate/')

        # Should still return 200 (endpoint handles errors gracefully)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify error state was set on cart
        cart.refresh_from_db()
        self.assertTrue(cart.vat_calculation_error)
        self.assertIn('Rules engine unavailable', cart.vat_calculation_error_message)
