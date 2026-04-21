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
