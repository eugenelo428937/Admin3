"""Tests for cart API view endpoints."""
from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from unittest.mock import patch
from rest_framework.test import APIClient, APITestCase
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


class TutorialAddViewGuestTests(TestCase):
    """Guests can add tutorials via the cart view. Auth is enforced at
    checkout, not at add-to-cart."""

    def test_guest_tutorial_add_succeeds(self):
        from catalog.models import (
            ExamSession, ExamSessionSubject, Subject,
            Product as CatProduct, ProductVariation,
            ProductProductVariation,
        )
        from store.models import Product as StoreProduct, TutorialProduct
        from tutorials.models import TutorialEvents

        # Build a real tutorial product so the request gets past the
        # product-resolution step and hits _require_student. All upstream
        # is_active flags must be True and the exam-session window must
        # include "now" for the cart-add availability gate to accept the
        # product (see Purchasable.objects.available_now()).
        now = timezone.now()
        es = ExamSession.objects.create(
            session_code='25',
            start_date=now - timedelta(days=10),
            end_date=now + timedelta(days=60),
            is_active=True)
        subj, _ = Subject.objects.get_or_create(
            code='CB1',
            defaults={'description': 'CB1', 'active': True})
        ess = ExamSessionSubject.objects.create(
            exam_session=es, subject=subj, is_active=True)
        cat, _ = CatProduct.objects.get_or_create(
            code='Live',
            defaults={'fullname': 'T - Live', 'shortname': 'Live',
                      'is_active': True})
        pv, _ = ProductVariation.objects.get_or_create(
            code='LO_6H',
            defaults={'name': 'LO_6H', 'description': '',
                      'description_short': 'LO_6H',
                      'variation_type': 'Tutorial',
                      'is_active': True})
        ppv, _ = ProductProductVariation.objects.get_or_create(
            product=cat, product_variation=pv,
            defaults={'is_active': True})
        sp = TutorialProduct(
            exam_session_subject=ess,
            product_product_variation=ppv,
            product_code='CB1/Live/LO_6H/25',
            format='LO_6H')
        sp.save()
        event = TutorialEvents.objects.create(
            code='CB1-01-25A', store_product=sp,
            lms_start_date=date(2025, 1, 1),
            lms_end_date=date(2025, 2, 1))

        client = APIClient()  # Anonymous
        response = client.post('/api/cart/add/', {
            'current_product': sp.id,
            'quantity': 1,
            'price_type': 'standard',
            'actual_price': '10.00',
            'metadata': {
                'type': 'tutorial',
                'subjectCode': 'CB1',
                'newLocation': {
                    'location': 'London',
                    'choices': [{'choice': '1st',
                                 'eventId': event.id,
                                 'variationId': ppv.id}],
                    'choiceCount': 1,
                },
            },
        }, format='json')

        # Guest add succeeds (200/201). Auth is gated at checkout.
        self.assertIn(response.status_code, (200, 201))
