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


class OrderItemShimPropertiesTests(TestCase):
    """Task 19: backward-compat shim properties derived from purchasable.

    Mirror of `CartItemShimPropertiesTests` for OrderItem — new rows created
    with only `purchasable_id` set must still expose the legacy product /
    marking_voucher / item_type representation via shim properties.
    """

    def setUp(self):
        self.user = User.objects.create_user(
            username='u19o', password='p', email='u19o@x.com',
        )
        self.order = Order.objects.create(
            user=self.user,
            subtotal=Decimal('10.00'),
            vat_amount=Decimal('0.00'),
            total_amount=Decimal('10.00'),
        )

    def test_product_shim_returns_product_for_product_kind(self):
        product = StoreProduct.objects.first()
        if product is None:
            self.skipTest('No Product fixtures')
        item = OrderItem.objects.create(
            order=self.order,
            purchasable=product.purchasable_ptr,
            quantity=1,
        )
        self.assertEqual(item.product_shim, product)

    def test_marking_voucher_shim_returns_generic_item(self):
        from store.models import GenericItem
        gi = GenericItem.objects.create(
            kind='marking_voucher',
            code='MV-ORD-SHIM-T19',
            name='X',
            validity_period_days=1460,
        )
        item = OrderItem.objects.create(
            order=self.order,
            purchasable=gi.purchasable_ptr,
            quantity=1,
        )
        self.assertEqual(item.marking_voucher_shim, gi)

    def test_product_shim_none_for_voucher_purchasable(self):
        from store.models import GenericItem
        gi = GenericItem.objects.create(
            kind='marking_voucher',
            code='MV-ORD-SHIM-T19b',
            name='X',
            validity_period_days=1460,
        )
        item = OrderItem.objects.create(
            order=self.order,
            purchasable=gi.purchasable_ptr,
            quantity=1,
        )
        self.assertIsNone(item.product_shim)

    def test_marking_voucher_shim_none_for_product_purchasable(self):
        product = StoreProduct.objects.first()
        if product is None:
            self.skipTest('No Product fixtures')
        item = OrderItem.objects.create(
            order=self.order,
            purchasable=product.purchasable_ptr,
            quantity=1,
        )
        self.assertIsNone(item.marking_voucher_shim)

    def test_item_type_shim_derives_from_purchasable_kind(self):
        from store.models import GenericItem
        gi = GenericItem.objects.create(
            kind='marking_voucher',
            code='MV-ORD-SHIM-T19c',
            name='X',
            validity_period_days=1460,
        )
        item = OrderItem.objects.create(
            order=self.order,
            purchasable=gi.purchasable_ptr,
            item_type='',  # Force empty to exercise purchasable fallback path
            quantity=1,
        )
        self.assertEqual(item.item_type_shim, 'marking_voucher')
