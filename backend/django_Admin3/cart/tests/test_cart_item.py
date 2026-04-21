"""
Task 9: CartItem.purchasable FK dual-write phase tests.

Tests that CartItem accepts the new nullable `purchasable` FK while
retaining legacy `product` / `marking_voucher` FKs.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model

from cart.models import Cart, CartItem
from store.models import Purchasable, Product

User = get_user_model()


class CartItemPurchasableFKTests(TestCase):
    """Dual-write phase: new purchasable FK coexists with legacy FKs."""

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

    def test_cart_item_product_fk_still_works(self):
        """Dual-write contract: legacy product FK must remain usable."""
        cart = Cart.objects.create(user=self.user)
        product = Product.objects.first()
        if product is None:
            self.skipTest("No products available")
        item = CartItem.objects.create(
            cart=cart,
            product=product,
            quantity=1,
        )
        self.assertEqual(item.product_id, product.pk)


class CartItemShimPropertiesTests(TestCase):
    """Task 19: backward-compat shim properties derived from purchasable.

    During Release A (Tasks 19-22), the legacy `product`/`marking_voucher`/
    `item_type` DB fields coexist with the new `purchasable` FK. These shim
    properties derive the same legacy values from `purchasable` for rows
    created with only `purchasable_id` set. In Release B (Task 23), the
    legacy columns are dropped and the shims are renamed to plain names.
    """

    def setUp(self):
        self.user = User.objects.create_user(
            username='u19c', password='p', email='u19c@x.com',
        )
        self.cart = Cart.objects.create(user=self.user)

    def test_product_shim_returns_product_for_product_kind(self):
        product = Product.objects.first()
        if product is None:
            self.skipTest('No Product fixtures')
        # Create a CartItem pointing at the Product's purchasable parent
        # via the MTI pointer, NOT the legacy product FK.
        item = CartItem.objects.create(
            cart=self.cart,
            purchasable=product.purchasable_ptr,
            quantity=1,
        )
        self.assertEqual(item.product_shim, product)

    def test_marking_voucher_shim_returns_generic_item(self):
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
        self.assertEqual(item.marking_voucher_shim, gi)

    def test_product_shim_none_for_voucher_purchasable(self):
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
        self.assertIsNone(item.product_shim)

    def test_marking_voucher_shim_none_for_product_purchasable(self):
        product = Product.objects.first()
        if product is None:
            self.skipTest('No Product fixtures')
        item = CartItem.objects.create(
            cart=self.cart,
            purchasable=product.purchasable_ptr,
            quantity=1,
        )
        self.assertIsNone(item.marking_voucher_shim)

    def test_item_type_shim_derives_from_purchasable_kind(self):
        from store.models import GenericItem
        gi = GenericItem.objects.create(
            kind='marking_voucher',
            code='MV-SHIM-T19c',
            name='X',
            validity_period_days=1460,
        )
        # Create without setting item_type column explicitly — default is 'product'.
        # The shim should prefer the legacy column when it's non-empty, but
        # this test row has kind=marking_voucher so we need to confirm behavior.
        item = CartItem.objects.create(
            cart=self.cart,
            purchasable=gi.purchasable_ptr,
            item_type='',  # Force empty to exercise purchasable fallback path
            quantity=1,
        )
        self.assertEqual(item.item_type_shim, 'marking_voucher')
