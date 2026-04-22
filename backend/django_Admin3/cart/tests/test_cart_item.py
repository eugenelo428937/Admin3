"""
Task 23 (Release B): CartItem unified purchasable FK tests.

The legacy `product` / `marking_voucher` / `item_type` columns have been
dropped. Items reach the catalog via the unified `purchasable` FK, and
the former field names survive as read-only @properties derived from
``purchasable.kind``.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model

from cart.models import Cart, CartItem
from store.models import Purchasable, Product

User = get_user_model()


class CartItemPurchasableFKTests(TestCase):
    """The single supported FK for CartItem is `purchasable`."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='t9',
            email='t9@test.com',
            password='x',
        )

    def test_cart_item_accepts_purchasable(self):
        cart = Cart.objects.create(user=self.user)
        p = Purchasable.objects.create(
            kind='marking_voucher',
            code='V-TEST-T9',
            name='V',
        )
        item = CartItem.objects.create(
            cart=cart,
            purchasable=p,
            quantity=1,
        )
        self.assertEqual(item.purchasable_id, p.id)

    def test_cart_item_product_backed_via_purchasable(self):
        """Product is an MTI subclass of Purchasable; product.pk ==
        purchasable_ptr_id, so the same PK backs both sides.
        """
        cart = Cart.objects.create(user=self.user)
        product = Product.objects.first()
        if product is None:
            self.skipTest("No products available")
        item = CartItem.objects.create(
            cart=cart,
            purchasable=product.purchasable_ptr,
            quantity=1,
        )
        self.assertEqual(item.purchasable_id, product.pk)
        self.assertEqual(item.product, product)


class CartItemPurchasablePropertiesTests(TestCase):
    """Task 23: `product`, `marking_voucher`, `item_type` are now read-only
    @properties derived from the unified `purchasable` FK.
    """

    def setUp(self):
        self.user = User.objects.create_user(
            username='u19c', password='p', email='u19c@x.com',
        )
        self.cart = Cart.objects.create(user=self.user)

    def test_product_property_returns_product_for_product_kind(self):
        product = Product.objects.first()
        if product is None:
            self.skipTest('No Product fixtures')
        item = CartItem.objects.create(
            cart=self.cart,
            purchasable=product.purchasable_ptr,
            quantity=1,
        )
        self.assertEqual(item.product, product)

    def test_marking_voucher_property_returns_generic_item(self):
        from store.models import GenericItem
        gi = GenericItem.objects.create(
            kind='marking_voucher',
            code='MV-SHIM-T19',
            name='X',
            validity_period_days=1460,
        )
        item = CartItem.objects.create(
            cart=self.cart,
            purchasable=gi.purchasable_ptr,
            quantity=1,
        )
        self.assertEqual(item.marking_voucher, gi)

    def test_product_property_none_for_voucher_purchasable(self):
        from store.models import GenericItem
        gi = GenericItem.objects.create(
            kind='marking_voucher',
            code='MV-SHIM-T19b',
            name='X',
            validity_period_days=1460,
        )
        item = CartItem.objects.create(
            cart=self.cart,
            purchasable=gi.purchasable_ptr,
            quantity=1,
        )
        self.assertIsNone(item.product)

    def test_marking_voucher_property_none_for_product_purchasable(self):
        product = Product.objects.first()
        if product is None:
            self.skipTest('No Product fixtures')
        item = CartItem.objects.create(
            cart=self.cart,
            purchasable=product.purchasable_ptr,
            quantity=1,
        )
        self.assertIsNone(item.marking_voucher)

    def test_item_type_derives_from_purchasable_kind(self):
        from store.models import GenericItem
        gi = GenericItem.objects.create(
            kind='marking_voucher',
            code='MV-SHIM-T19c',
            name='X',
            validity_period_days=1460,
        )
        item = CartItem.objects.create(
            cart=self.cart,
            purchasable=gi.purchasable_ptr,
            quantity=1,
        )
        self.assertEqual(item.item_type, 'marking_voucher')

    def test_item_type_fee_for_fee_generic_purchasable(self):
        fee = Purchasable.objects.filter(code='FEE_GENERIC').first()
        if fee is None:
            self.skipTest('FEE_GENERIC purchasable not present')
        item = CartItem.objects.create(
            cart=self.cart,
            purchasable=fee,
            quantity=1,
        )
        self.assertEqual(item.item_type, 'fee')
