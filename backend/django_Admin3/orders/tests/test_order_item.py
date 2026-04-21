from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase

from orders.models import Order, OrderItem
from store.models import Purchasable, Product as StoreProduct

User = get_user_model()


class OrderItemPurchasableFKTests(TestCase):
    """Task 10: dual-write phase for OrderItem.purchasable FK."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='t10',
            email='t10@test.com',
            password='x',
        )

    def test_order_item_accepts_purchasable(self):
        order = Order.objects.create(
            user=self.user,
            subtotal=Decimal('10.00'),
            vat_amount=Decimal('0.00'),
            total_amount=Decimal('10.00'),
        )
        p = Purchasable.objects.create(
            kind='marking_voucher',
            code='V-ORD-T10',
            name='V',
        )
        item = OrderItem.objects.create(
            order=order,
            purchasable=p,
            quantity=1,
        )
        self.assertEqual(item.purchasable_id, p.id)

    def test_order_item_product_fk_still_works(self):
        """Dual-write contract: legacy product FK must remain usable."""
        order = Order.objects.create(
            user=self.user,
            subtotal=Decimal('10.00'),
            vat_amount=Decimal('0.00'),
            total_amount=Decimal('10.00'),
        )
        product = StoreProduct.objects.first()
        if product is None:
            self.skipTest("No products available")
        item = OrderItem.objects.create(
            order=order,
            product=product,
            quantity=1,
        )
        self.assertEqual(item.product_id, product.pk)
