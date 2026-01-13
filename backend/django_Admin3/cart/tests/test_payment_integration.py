from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from decimal import Decimal
from unittest.mock import patch, MagicMock

from cart.models import Cart, CartItem, ActedOrder, ActedOrderPayment
from exam_sessions_subjects_products.models import ExamSessionSubjectProduct
from exam_sessions_subjects.models import ExamSessionSubject
from catalog.models import Product, ExamSession, Subject
from products.models import FilterGroup
from django.utils import timezone

User = get_user_model()

class PaymentIntegrationTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)

        # Create test filter group
        self.filter_group = FilterGroup.objects.create(
            name='Test Product',
            code='TEST',
            description='Test product for payment testing'
        )

        # Create test subject
        self.subject = Subject.objects.create(
            code='TEST',
            description='Test Subject'
        )

        # Create test exam session
        self.exam_session = ExamSession.objects.create(
            session_code='TEST-2025',
            start_date=timezone.now(),
            end_date=timezone.now()
        )

        # Create exam session subject
        self.exam_session_subject = ExamSessionSubject.objects.create(
            exam_session=self.exam_session,
            subject=self.subject
        )

        # Create test product
        self.product = Product.objects.create(
            fullname='Test Product',
            shortname='Test Product',
            code='TEST001'
        )
        # Add product to filter group via M2M
        self.product.groups.add(self.filter_group)

        # Create test exam session subject product
        self.exam_product = ExamSessionSubjectProduct.objects.create(
            exam_session_subject=self.exam_session_subject,
            product=self.product
        )
        
        # Create cart and add item
        self.cart = Cart.objects.create(user=self.user)
        self.cart_item = CartItem.objects.create(
            cart=self.cart,
            product=self.exam_product,
            quantity=1,
            actual_price=Decimal('100.00')
        )

    def test_card_payment_success(self):
        """Test successful card payment processing

        Uses DummyPaymentService (via USE_DUMMY_PAYMENT_GATEWAY=True in development settings)
        which creates actual payment records in the database.
        """
        payment_data = {
            'employer_code': '',
            'is_invoice': False,
            'payment_method': 'card',
            'card_data': {
                'card_number': '4929000000006',
                'cardholder_name': 'Test User',
                'expiry_month': '12',
                'expiry_year': '25',
                'cvv': '123'
            }
        }

        # DummyPaymentService creates actual payment records - no mocking needed
        response = self.client.post(reverse('cart-checkout'), payment_data, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data['payment']['success'])
        # DummyPaymentService generates transaction ID: DUMMY + timestamp
        self.assertTrue(response.data['payment']['transaction_id'].startswith('DUMMY'))

        # Verify order was created
        order = ActedOrder.objects.first()
        self.assertIsNotNone(order)
        self.assertEqual(order.user, self.user)

        # Verify payment record was created by DummyPaymentService
        payment = ActedOrderPayment.objects.first()
        self.assertIsNotNone(payment)
        self.assertEqual(payment.order, order)
        self.assertEqual(payment.payment_method, 'card')
        self.assertEqual(payment.status, 'completed')

    def test_invoice_payment_success(self):
        """Test successful invoice payment processing

        Uses DummyPaymentService (via USE_DUMMY_PAYMENT_GATEWAY=True in development settings)
        which creates actual payment records in the database.
        """
        payment_data = {
            'employer_code': 'EMP123',
            'is_invoice': True,
            'payment_method': 'invoice'
        }

        # DummyPaymentService creates actual payment records - no mocking needed
        response = self.client.post(reverse('cart-checkout'), payment_data, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data['payment']['success'])

        # Verify order was created
        order = ActedOrder.objects.first()
        self.assertIsNotNone(order)
        self.assertEqual(order.user, self.user)

        # Verify payment record was created by DummyPaymentService
        payment = ActedOrderPayment.objects.first()
        self.assertIsNotNone(payment)
        self.assertEqual(payment.order, order)
        self.assertEqual(payment.payment_method, 'invoice')
        self.assertEqual(payment.status, 'pending')

    def test_card_payment_failure(self):
        """Test card payment failure handling"""
        payment_data = {
            'employer_code': '',
            'is_invoice': False,
            'payment_method': 'card',
            'card_data': {
                'card_number': '4929000000006',
                'cardholder_name': 'Test User',
                'expiry_month': '12',
                'expiry_year': '25',
                'cvv': '123'
            }
        }
        
        # Mock the Opayo service to return failure
        with patch('cart.services.payment_service.payment_service.process_card_payment') as mock_payment:
            mock_payment.return_value = {
                'success': False,
                'payment_id': 1,
                'error_message': 'Card declined',
                'error_code': 'DECLINED'
            }
            
            response = self.client.post(reverse('cart-checkout'), payment_data, format='json')

            # Should return 400 or 500 due to payment failure
            self.assertIn(response.status_code, [status.HTTP_400_BAD_REQUEST, status.HTTP_500_INTERNAL_SERVER_ERROR])

            # Verify no order was created (transaction rollback)
            order = ActedOrder.objects.first()
            self.assertIsNone(order)

    def test_missing_card_data(self):
        """Test validation of required card data"""
        payment_data = {
            'employer_code': '',
            'is_invoice': False,
            'payment_method': 'card'
            # Missing card_data
        }
        
        response = self.client.post(reverse('cart-checkout'), payment_data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Card data is required', response.data['detail'])

    def test_empty_cart_checkout(self):
        """Test checkout with empty cart"""
        # Clear cart
        self.cart.items.all().delete()
        
        payment_data = {
            'employer_code': '',
            'is_invoice': True,
            'payment_method': 'invoice'
        }
        
        response = self.client.post(reverse('cart-checkout'), payment_data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Cart is empty', response.data['detail'])

    def test_payment_model_properties(self):
        """Test ActedOrderPayment model properties"""
        order = ActedOrder.objects.create(user=self.user, total_amount=Decimal('100.00'))
        payment = ActedOrderPayment.objects.create(
            order=order,
            payment_method='card',
            amount=Decimal('100.00'),
            status='completed'
        )
        
        self.assertTrue(payment.is_successful)
        self.assertTrue(payment.is_card_payment)
        self.assertFalse(payment.is_invoice_payment)
        
        # Test invoice payment
        invoice_payment = ActedOrderPayment.objects.create(
            order=order,
            payment_method='invoice',
            amount=Decimal('100.00'),
            status='pending'
        )
        
        self.assertFalse(invoice_payment.is_successful)
        self.assertFalse(invoice_payment.is_card_payment)
        self.assertTrue(invoice_payment.is_invoice_payment) 