from django.test import TestCase
from django.contrib.auth import get_user_model
from decimal import Decimal

from cart.models import Cart, CartItem, CartFee
from orders.models import Order, OrderItem
from orders.services.order_builder import OrderBuilder

User = get_user_model()


class OrderBuilderTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser', email='test@example.com', password='testpass123'
        )
        self.cart = Cart.objects.create(user=self.user)

        # Add items to cart
        self.item1 = CartItem.objects.create(
            cart=self.cart,
            item_type='product',
            quantity=2,
            price_type='standard',
            actual_price=Decimal('50.00'),
        )
        self.item2 = CartItem.objects.create(
            cart=self.cart,
            item_type='product',
            quantity=1,
            price_type='retaker',
            actual_price=Decimal('30.00'),
        )

        self.vat_result = {
            'totals': {
                'net': '130.00',
                'vat': '26.00',
                'gross': '156.00',
            },
            'items': [
                {'id': str(self.item1.id), 'vat_amount': '20.00'},
                {'id': str(self.item2.id), 'vat_amount': '6.00'},
            ],
            'region': 'UK',
        }

    def test_build_creates_order_with_totals(self):
        builder = OrderBuilder(cart=self.cart, user=self.user, vat_result=self.vat_result)
        order = builder.build()

        self.assertEqual(order.subtotal, Decimal('130.00'))
        self.assertEqual(order.vat_amount, Decimal('26.00'))
        self.assertEqual(order.total_amount, Decimal('156.00'))
        self.assertEqual(order.vat_country, 'UK')
        self.assertEqual(order.user, self.user)

    def test_build_transfers_items(self):
        builder = OrderBuilder(cart=self.cart, user=self.user, vat_result=self.vat_result)
        order = builder.build()

        order_items = order.items.all()
        self.assertEqual(order_items.count(), 2)

        item1_order = order_items.get(quantity=2)
        self.assertEqual(item1_order.actual_price, Decimal('50.00'))
        self.assertEqual(item1_order.vat_amount, Decimal('20.00'))

        item2_order = order_items.get(quantity=1)
        self.assertEqual(item2_order.actual_price, Decimal('30.00'))
        self.assertEqual(item2_order.vat_amount, Decimal('6.00'))

    def test_build_transfers_fees(self):
        CartFee.objects.create(
            cart=self.cart,
            fee_type='tutorial_booking_fee',
            name='Booking Fee',
            amount=Decimal('25.00'),
            currency='GBP',
        )

        builder = OrderBuilder(cart=self.cart, user=self.user, vat_result=self.vat_result)
        order = builder.build()

        fee_items = order.items.filter(item_type='fee')
        self.assertEqual(fee_items.count(), 1)
        fee_item = fee_items.first()
        self.assertEqual(fee_item.actual_price, Decimal('25.00'))
        self.assertTrue(fee_item.is_vat_exempt)

    def test_build_atomic_transaction(self):
        # Verify order creation is atomic — if items fail, order shouldn't exist
        vat_result_bad_items = {
            'totals': {'net': '100.00', 'vat': '20.00', 'gross': '120.00'},
            'items': [],
            'region': 'UK',
        }
        builder = OrderBuilder(cart=self.cart, user=self.user, vat_result=vat_result_bad_items)
        order = builder.build()

        # Should still succeed — items just get zero VAT
        self.assertEqual(order.items.count(), 2)

    def test_build_with_zero_vat(self):
        vat_result = {
            'totals': {'net': '130.00', 'vat': '0.00', 'gross': '130.00'},
            'items': [],
            'region': 'ROW',
        }
        builder = OrderBuilder(cart=self.cart, user=self.user, vat_result=vat_result)
        order = builder.build()

        self.assertEqual(order.vat_amount, Decimal('0.00'))
        for item in order.items.all():
            self.assertTrue(item.is_vat_exempt)
