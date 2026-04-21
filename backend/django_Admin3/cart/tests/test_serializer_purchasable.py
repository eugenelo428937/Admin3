"""Task 18: CartItemSerializer exposes the unified `purchasable` FK as nested object.

Dual-emit phase — the serializer must emit the new `purchasable` nested
object alongside existing legacy fields (product, marking_voucher, item_type)
so the frontend can migrate progressively.
"""
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase

from cart.models import Cart, CartItem
from cart.serializers import CartItemSerializer
from store.models import GenericItem, Product as StoreProduct


User = get_user_model()


class CartItemSerializerPurchasableTests(TestCase):
    """Task 18 RED: serializer must expose nested `purchasable`."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='u18c', password='p', email='u18c@x.com',
        )
        self.cart = Cart.objects.create(user=self.user)

    def test_serializer_exposes_purchasable(self):
        """Nested purchasable object should appear with kind/code/name."""
        gi = GenericItem.objects.create(
            kind='marking_voucher',
            code='MV-SER-T18',
            name='Serializer Test Voucher',
            validity_period_days=1460,
        )
        item = CartItem.objects.create(
            cart=self.cart,
            purchasable=gi,
            item_type='marking_voucher',
            quantity=1,
            actual_price=Decimal('25.00'),
        )
        data = CartItemSerializer(item).data

        self.assertIn('purchasable', data)
        self.assertIsNotNone(data['purchasable'])
        self.assertEqual(data['purchasable']['code'], 'MV-SER-T18')
        self.assertEqual(data['purchasable']['kind'], 'marking_voucher')
        self.assertEqual(data['purchasable']['name'], 'Serializer Test Voucher')

    def test_legacy_fields_still_present_for_product_items(self):
        """Dual-emit: item with legacy product FK still serializes both."""
        product = StoreProduct.objects.first()
        if product is None:
            self.skipTest("No store products available for product-FK test")
        item = CartItem.objects.create(
            cart=self.cart,
            product=product,
            purchasable=product,  # MTI: Product is a Purchasable
            item_type='product',
            quantity=1,
            actual_price=Decimal('50.00'),
        )
        data = CartItemSerializer(item).data

        # New field emitted
        self.assertIn('purchasable', data)
        self.assertIsNotNone(data['purchasable'])
        self.assertEqual(data['purchasable']['kind'], 'product')
        # Legacy read-only fields still present (dual-emit contract)
        self.assertIn('product_id', data)
        self.assertIn('product_name', data)
        self.assertIn('product_code', data)

    def test_serializer_fee_item_emits_fee_generic_purchasable(self):
        """Fee items auto-populate to FEE_GENERIC in Release B (Task 22).

        Previously (Release A) fee items could have purchasable=NULL and
        the serializer emitted ``None``. After Task 22 enforces NOT NULL,
        the CartItem.save() shim auto-populates purchasable_id to
        FEE_GENERIC, so the serializer emits that Purchasable payload.
        """
        item = CartItem.objects.create(
            cart=self.cart,
            item_type='fee',
            quantity=1,
            actual_price=Decimal('5.00'),
            metadata={'fee_type': 'delivery', 'fee_name': 'Delivery Fee'},
        )
        data = CartItemSerializer(item).data
        self.assertIn('purchasable', data)
        self.assertIsNotNone(data['purchasable'])
        self.assertEqual(data['purchasable']['code'], 'FEE_GENERIC')
