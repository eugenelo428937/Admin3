from django.test import TestCase, RequestFactory, override_settings
from django.contrib.auth import get_user_model
from django.contrib.sessions.backends.db import SessionStore
from decimal import Decimal
from unittest.mock import patch

from cart.models import Cart, CartItem, CartFee
from cart.services.cart_service import CartService

User = get_user_model()


@override_settings(USE_DUMMY_PAYMENT_GATEWAY=True)
class CartServiceTest(TestCase):
    def setUp(self):
        self.service = CartService()
        self.factory = RequestFactory()
        self.user = User.objects.create_user(
            username='testuser', email='test@example.com', password='testpass123'
        )

    def _make_request(self, user=None):
        request = self.factory.get('/api/cart/')
        request.user = user or self.user
        request.session = SessionStore()
        return request

    def test_get_or_create_authenticated(self):
        request = self._make_request()
        cart = self.service.get_or_create(request)
        self.assertEqual(cart.user, self.user)
        # Second call returns same cart
        cart2 = self.service.get_or_create(request)
        self.assertEqual(cart.id, cart2.id)

    @patch('cart.services.cart_service.cart_service._trigger_vat_calculation')
    def test_add_item_creates_cart_item(self, mock_vat):
        cart = Cart.objects.create(user=self.user)

        from store.models import Product as StoreProduct
        # Use a mock product ID — add_item calls _resolve_product internally
        with patch.object(self.service, '_resolve_product') as mock_resolve:
            mock_product = StoreProduct(id=1)
            mock_product.product = type('P', (), {'fullname': 'Test Product', 'group_name': '', 'code': 'TP'})()
            mock_resolve.return_value = mock_product

            item, error = self.service.add_item(
                cart, product_id=1, quantity=2, price_type='standard',
                actual_price=Decimal('50.00'), metadata={'variationId': 'v1'}
            )

        self.assertIsNone(error)
        self.assertEqual(item.quantity, 2)
        self.assertEqual(item.actual_price, Decimal('50.00'))

    @patch('cart.services.cart_service.cart_service._trigger_vat_calculation')
    def test_add_item_product_not_found(self, mock_vat):
        cart = Cart.objects.create(user=self.user)
        item, error = self.service.add_item(cart, product_id=99999)
        self.assertIsNone(item)
        self.assertIn('No Product', error)

    @patch('cart.services.cart_service.cart_service._trigger_vat_calculation')
    def test_update_item(self, mock_vat):
        cart = Cart.objects.create(user=self.user)
        item = CartItem.objects.create(
            cart=cart, item_type='product', quantity=1,
            price_type='standard', actual_price=Decimal('25.00')
        )

        updated = self.service.update_item(cart, item.id, quantity=5)
        self.assertEqual(updated.quantity, 5)

    @patch('cart.services.cart_service.cart_service._trigger_vat_calculation')
    def test_update_item_not_found(self, mock_vat):
        cart = Cart.objects.create(user=self.user)
        with self.assertRaises(CartItem.DoesNotExist):
            self.service.update_item(cart, item_id=99999)

    @patch('cart.services.cart_service.cart_service._trigger_vat_calculation')
    def test_remove_item(self, mock_vat):
        cart = Cart.objects.create(user=self.user)
        item = CartItem.objects.create(
            cart=cart, item_type='product', quantity=1,
            price_type='standard', actual_price=Decimal('10.00')
        )

        self.service.remove_item(cart, item.id)
        self.assertEqual(cart.items.count(), 0)

    @patch('cart.services.cart_service.cart_service._trigger_vat_calculation')
    def test_clear(self, mock_vat):
        cart = Cart.objects.create(user=self.user)
        CartItem.objects.create(cart=cart, item_type='product', quantity=1, price_type='standard')
        CartItem.objects.create(cart=cart, item_type='product', quantity=2, price_type='standard')

        self.service.clear(cart)
        self.assertEqual(cart.items.count(), 0)

    @patch('cart.services.cart_service.cart_service._trigger_vat_calculation')
    def test_merge_guest_cart(self, mock_vat):
        # Create guest cart with items
        guest_cart = Cart.objects.create(session_key='guest-session-123')
        CartItem.objects.create(
            cart=guest_cart, item_type='product', quantity=3,
            price_type='standard', actual_price=Decimal('20.00')
        )

        # Merge into user cart
        self.service.merge_guest_cart(self.user, 'guest-session-123')

        # Guest cart should be deleted
        self.assertFalse(Cart.objects.filter(session_key='guest-session-123').exists())

        # User cart should have the item
        user_cart = Cart.objects.get(user=self.user)
        self.assertEqual(user_cart.items.count(), 1)
        self.assertEqual(user_cart.items.first().quantity, 3)

    @patch('cart.services.cart_service.cart_service._trigger_vat_calculation')
    def test_merge_guest_cart_no_guest(self, mock_vat):
        # Should not raise if guest cart doesn't exist
        self.service.merge_guest_cart(self.user, 'nonexistent-session')

    def test_update_cart_flags(self):
        cart = Cart.objects.create(user=self.user)
        item = CartItem.objects.create(
            cart=cart, item_type='product', quantity=1,
            price_type='standard', is_marking=True
        )

        self.service._update_cart_flags(cart)
        cart.refresh_from_db()
        self.assertTrue(cart.has_marking)

    def test_update_cart_flags_empty_cart(self):
        cart = Cart.objects.create(user=self.user, has_marking=True)
        self.service._update_cart_flags(cart)
        cart.refresh_from_db()
        self.assertFalse(cart.has_marking)
