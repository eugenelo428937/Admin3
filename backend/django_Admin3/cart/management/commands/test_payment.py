from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from decimal import Decimal
from unittest.mock import patch

from cart.models import Cart, CartItem, ActedOrder, ActedOrderPayment
from cart.services import opayo_service

User = get_user_model()

class Command(BaseCommand):
    help = 'Test payment integration functionality'

    def add_arguments(self, parser):
        parser.add_argument(
            '--test-type',
            type=str,
            choices=['card_success', 'card_failure', 'invoice'],
            default='card_success',
            help='Type of payment test to run'
        )

    def handle(self, *args, **options):
        test_type = options['test_type']
        
        self.stdout.write(f"Testing payment integration: {test_type}")
        
        # Create test user
        user, created = User.objects.get_or_create(
            username='payment_test_user',
            defaults={
                'email': 'payment_test@example.com',
                'first_name': 'Payment',
                'last_name': 'Test'
            }
        )
        
        if created:
            self.stdout.write(f"Created test user: {user.username}")
        
        # Create test order
        order = ActedOrder.objects.create(
            user=user,
            subtotal=Decimal('100.00'),
            vat_amount=Decimal('20.00'),
            total_amount=Decimal('120.00')
        )
        
        self.stdout.write(f"Created test order: {order.id}")
        
        # Test card payment success
        if test_type == 'card_success':
            self.test_card_payment_success(order)
        elif test_type == 'card_failure':
            self.test_card_payment_failure(order)
        elif test_type == 'invoice':
            self.test_invoice_payment(order)
        
        self.stdout.write(self.style.SUCCESS('Payment test completed successfully'))

    def test_card_payment_success(self, order):
        """Test successful card payment"""
        self.stdout.write("Testing card payment success...")
        
        card_data = {
            'card_number': '4929 0000 0000 6123',
            'cardholder_name': 'Test User',
            'expiry_month': '12',
            'expiry_year': '25',
            'cvv': '123'
        }

        result = opayo_service.process_card_payment(
            order, card_data, '127.0.0.1', 'Test User Agent'
        )
        
        self.stdout.write(f"Payment result: {result}")
        
        # Verify payment record was created
        payment = ActedOrderPayment.objects.filter(order=order).first()
        if payment:
            self.stdout.write(f"Payment record created: ID={payment.id}, Status={payment.status}")
        else:
            self.stdout.write(self.style.ERROR("No payment record found"))

    def test_card_payment_failure(self, order):
        """Test failed card payment"""
        self.stdout.write("Testing card payment failure...")
        
        card_data = {
            'card_number': '4929000000006',
            'cardholder_name': 'Test User',
            'expiry_month': '12',
            'expiry_year': '25',
            'cvv': '123'
        }
        
        # Mock the Opayo service to return failure
        with patch.object(opayo_service, 'process_card_payment') as mock_payment:
            mock_payment.return_value = {
                'success': False,
                'payment_id': 1,
                'error_message': 'Card declined',
                'error_code': 'DECLINED'
            }
            
            result = opayo_service.process_card_payment(
                order, card_data, '127.0.0.1', 'Test User Agent'
            )
            
            self.stdout.write(f"Payment result: {result}")
            
            # Verify payment record was created with failed status
            payment = ActedOrderPayment.objects.filter(order=order).first()
            if payment:
                self.stdout.write(f"Payment record created: ID={payment.id}, Status={payment.status}")
                if payment.status == 'failed':
                    self.stdout.write(self.style.SUCCESS("Payment failure handled correctly"))
                else:
                    self.stdout.write(self.style.ERROR("Payment should have failed status"))
            else:
                self.stdout.write(self.style.ERROR("No payment record found"))

    def test_invoice_payment(self, order):
        """Test invoice payment"""
        self.stdout.write("Testing invoice payment...")
        
        result = opayo_service.process_invoice_payment(
            order, '127.0.0.1', 'Test User Agent'
        )
        
        self.stdout.write(f"Payment result: {result}")
        
        # Verify payment record was created
        payment = ActedOrderPayment.objects.filter(order=order).first()
        if payment:
            self.stdout.write(f"Payment record created: ID={payment.id}, Status={payment.status}")
            if payment.payment_method == 'invoice' and payment.status == 'pending':
                self.stdout.write(self.style.SUCCESS("Invoice payment created correctly"))
            else:
                self.stdout.write(self.style.ERROR("Invoice payment status incorrect"))
        else:
            self.stdout.write(self.style.ERROR("No payment record found")) 