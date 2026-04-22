from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase

from orders.models import Order, OrderItem
from store.models import Purchasable, Product as StoreProduct

User = get_user_model()


class OrderItemPurchasableFKTests(TestCase):
    """Task 23 (Release B): OrderItem uses the unified `purchasable` FK."""

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

    def test_order_item_product_backed_via_purchasable(self):
        """Product is an MTI subclass of Purchasable; product.pk ==
        purchasable_ptr_id.
        """
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
            purchasable=product.purchasable_ptr,
            quantity=1,
        )
        self.assertEqual(item.purchasable_id, product.pk)
        self.assertEqual(item.product, product)


class OrderItemPurchasablePropertiesTests(TestCase):
    """Task 23: `product` / `marking_voucher` / `item_type` are now read-only
    @properties derived from the unified `purchasable` FK.
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

    def test_product_property_returns_product_for_product_kind(self):
        product = StoreProduct.objects.first()
        if product is None:
            self.skipTest('No Product fixtures')
        item = OrderItem.objects.create(
            order=self.order,
            purchasable=product.purchasable_ptr,
            quantity=1,
        )
        self.assertEqual(item.product, product)

    def test_marking_voucher_property_returns_generic_item(self):
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
        self.assertEqual(item.marking_voucher, gi)

    def test_product_property_none_for_voucher_purchasable(self):
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
        self.assertIsNone(item.product)

    def test_marking_voucher_property_none_for_product_purchasable(self):
        product = StoreProduct.objects.first()
        if product is None:
            self.skipTest('No Product fixtures')
        item = OrderItem.objects.create(
            order=self.order,
            purchasable=product.purchasable_ptr,
            quantity=1,
        )
        self.assertIsNone(item.marking_voucher)

    def test_item_type_derives_from_purchasable_kind(self):
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
            quantity=1,
        )
        self.assertEqual(item.item_type, 'marking_voucher')

    def test_item_type_fee_for_fee_generic_purchasable(self):
        fee = Purchasable.objects.filter(code='FEE_GENERIC').first()
        if fee is None:
            self.skipTest('FEE_GENERIC purchasable not present')
        item = OrderItem.objects.create(
            order=self.order,
            purchasable=fee,
            quantity=1,
        )
        self.assertEqual(item.item_type, 'fee')
