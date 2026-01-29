"""Tests for marking vouchers API view endpoints."""
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.utils import timezone
from unittest.mock import patch, MagicMock
from rest_framework.test import APITestCase
from rest_framework import status
from marking_vouchers.models import MarkingVoucher

User = get_user_model()


class TestMarkingVoucherListEndpoint(APITestCase):
    """Test the GET /api/marking-vouchers/ endpoint."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='mvlistuser', email='mvlist@example.com', password='testpass123',
        )
        self.voucher = MarkingVoucher.objects.create(
            code='MV001',
            name='Test Voucher',
            price=Decimal('25.00'),
            is_active=True,
        )
        self.inactive = MarkingVoucher.objects.create(
            code='MV002',
            name='Inactive Voucher',
            price=Decimal('30.00'),
            is_active=False,
        )

    def test_list_marking_vouchers(self):
        """GET /api/marking-vouchers/ returns active vouchers."""
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/marking-vouchers/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Handle both paginated (dict with 'results') and non-paginated (list) responses
        results = response.data.get('results', response.data) if isinstance(response.data, dict) else response.data
        codes = [v['code'] for v in results]
        self.assertIn('MV001', codes)
        self.assertNotIn('MV002', codes)


class TestMarkingVoucherDetailEndpoint(APITestCase):
    """Test the GET /api/marking-vouchers/{pk}/ endpoint."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='mvdetailuser', email='mvdetail@example.com', password='testpass123',
        )
        self.voucher = MarkingVoucher.objects.create(
            code='MV010',
            name='Detail Voucher',
            price=Decimal('50.00'),
            is_active=True,
        )

    def test_retrieve_marking_voucher(self):
        """GET /api/marking-vouchers/{pk}/ returns voucher details."""
        self.client.force_authenticate(user=self.user)
        response = self.client.get(f'/api/marking-vouchers/{self.voucher.pk}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['code'], 'MV010')

    def test_retrieve_marking_voucher_literal_url(self):
        """GET /api/marking-vouchers/999999/ with nonexistent pk returns 404."""
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/marking-vouchers/999999/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class TestAddVoucherToCartEndpoint(APITestCase):
    """Test the POST /api/marking-vouchers/add-to-cart/ endpoint."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='voucheruser', email='voucher@example.com', password='testpass123',
        )
        self.voucher = MarkingVoucher.objects.create(
            code='MV020',
            name='Cart Voucher',
            price=Decimal('35.00'),
            is_active=True,
        )

    @patch('marking_vouchers.views.CartService')
    def test_add_voucher_to_cart_authenticated(self, mock_cart_service_cls):
        """POST /api/marking-vouchers/add-to-cart/ with auth adds voucher."""
        mock_service = mock_cart_service_cls.return_value
        mock_item = MagicMock()
        mock_item.id = 1
        mock_item.quantity = 1
        mock_item.actual_price = Decimal('35.00')
        mock_service.add_marking_voucher.return_value = mock_item
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            '/api/marking-vouchers/add-to-cart/',
            {'voucher_id': self.voucher.id, 'quantity': 1},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_add_voucher_to_cart_unauthenticated(self):
        """POST /api/marking-vouchers/add-to-cart/ without auth returns 401."""
        response = self.client.post(
            '/api/marking-vouchers/add-to-cart/',
            {'voucher_id': self.voucher.id, 'quantity': 1},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
