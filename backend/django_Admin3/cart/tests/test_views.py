"""Tests for cart API view endpoints."""
from django.contrib.auth import get_user_model
from unittest.mock import patch
from rest_framework.test import APITestCase
from rest_framework import status
from cart.models import Cart, CartItem

User = get_user_model()


class TestCartViewSetClear(APITestCase):
    """Test the POST /api/cart/clear/ endpoint."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='cartuser', email='cart@example.com', password='testpass123',
        )
        self.client.force_authenticate(user=self.user)

    @patch('cart.services.cart_service.cart_service._trigger_vat_calculation')
    def test_clear_cart(self, mock_vat):
        """POST /api/cart/clear/ clears all items from cart."""
        cart = Cart.objects.create(user=self.user)
        CartItem.objects.create(cart=cart, item_type='fee', quantity=1)
        response = self.client.post('/api/cart/clear/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class TestCartViewSetUpdateItem(APITestCase):
    """Test the PATCH /api/cart/update_item/ endpoint."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='cartuser2', email='cart2@example.com', password='testpass123',
        )
        self.client.force_authenticate(user=self.user)

    @patch('cart.services.cart_service.cart_service._trigger_vat_calculation')
    def test_update_item_not_found(self, mock_vat):
        """PATCH /api/cart/update_item/ with invalid item_id returns 404."""
        Cart.objects.create(user=self.user)
        response = self.client.patch(
            '/api/cart/update_item/',
            {'item_id': 999999, 'quantity': 2},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class TestCartViewSetVatRecalculate(APITestCase):
    """Test the POST /api/cart/vat/recalculate/ endpoint."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='cartuser3', email='cart3@example.com', password='testpass123',
        )
        self.client.force_authenticate(user=self.user)

    @patch('cart.services.cart_service.cart_service._trigger_vat_calculation')
    def test_vat_recalculate(self, mock_vat):
        """POST /api/cart/vat/recalculate/ triggers VAT calculation."""
        Cart.objects.create(user=self.user)
        response = self.client.post('/api/cart/vat/recalculate/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
