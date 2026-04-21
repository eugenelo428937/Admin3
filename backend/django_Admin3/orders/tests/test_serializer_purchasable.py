"""Task 18: OrderItemSerializer exposes the unified `purchasable` FK as nested object.

Dual-emit phase — mirrors the cart test. Ensures parity between cart
and order serializers so the frontend migration surface is consistent.
"""
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase

from orders.models import Order, OrderItem
from orders.serializers.order_serializer import OrderItemSerializer
from store.models import GenericItem, Product as StoreProduct


User = get_user_model()


class OrderItemSerializerPurchasableTests(TestCase):
    """Task 18 RED: OrderItemSerializer must expose nested `purchasable`."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='u18o',
            email='u18o@test.com',
            password='p',
        )
        self.order = Order.objects.create(
            user=self.user,
            subtotal=Decimal('25.00'),
            vat_amount=Decimal('0.00'),
            total_amount=Decimal('25.00'),
        )

    def test_serializer_exposes_purchasable(self):
        """Nested purchasable object should appear for voucher order items."""
        gi = GenericItem.objects.create(
            kind='marking_voucher',
            code='MV-ORD-SER-T18',
            name='Order Serializer Test Voucher',
            validity_period_days=1460,
        )
        item = OrderItem.objects.create(
            order=self.order,
            purchasable=gi,
            item_type='marking_voucher',
            quantity=1,
            actual_price=Decimal('25.00'),
            net_amount=Decimal('25.00'),
            vat_amount=Decimal('0.00'),
            gross_amount=Decimal('25.00'),
            vat_rate=Decimal('0.0000'),
        )
        data = OrderItemSerializer(item).data

        self.assertIn('purchasable', data)
        self.assertIsNotNone(data['purchasable'])
        self.assertEqual(data['purchasable']['code'], 'MV-ORD-SER-T18')
        self.assertEqual(data['purchasable']['kind'], 'marking_voucher')
        self.assertEqual(data['purchasable']['name'], 'Order Serializer Test Voucher')

    def test_legacy_fields_still_present_for_product_items(self):
        """Dual-emit: product-based order items still serialize legacy fields."""
        product = StoreProduct.objects.first()
        if product is None:
            self.skipTest("No store products available for product-FK test")
        item = OrderItem.objects.create(
            order=self.order,
            product=product,
            purchasable=product,
            item_type='product',
            quantity=1,
            actual_price=Decimal('50.00'),
            net_amount=Decimal('50.00'),
            vat_amount=Decimal('0.00'),
            gross_amount=Decimal('50.00'),
            vat_rate=Decimal('0.0000'),
        )
        data = OrderItemSerializer(item).data

        self.assertIn('purchasable', data)
        self.assertIsNotNone(data['purchasable'])
        self.assertEqual(data['purchasable']['kind'], 'product')
        # Legacy fields still emitted
        self.assertIn('item_type', data)
        self.assertIn('item_name', data)
