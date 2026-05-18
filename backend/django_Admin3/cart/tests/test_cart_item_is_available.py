"""CartItemSerializer must expose is_available so the frontend can
flag cart items that became inactive after they were added."""
from datetime import timedelta
from django.test import TestCase
from django.utils import timezone

from catalog.exam_session.models import ExamSession
from catalog.subject.models import Subject
from catalog.models import ExamSessionSubject
from catalog.products.models import (
    Product as CatalogProduct,
    ProductVariation,
    ProductProductVariation,
)
from store.models import Product as StoreProduct, Purchasable
from store.models import MaterialProduct
from cart.models import Cart, CartItem
from cart.serializers import CartItemSerializer


class CartItemIsAvailableTests(TestCase):
    def setUp(self):
        now = timezone.now()
        es = ExamSession.objects.create(
            session_code='2099-08', start_date=now - timedelta(days=10),
            end_date=now + timedelta(days=10), is_active=True,
        )
        s = Subject.objects.create(code='ZI1', description='T', active=True)
        ess = ExamSessionSubject.objects.create(
            exam_session=es, subject=s, is_active=True,
        )
        cp = CatalogProduct.objects.create(
            fullname='Item P', shortname='IP', code='IP01', is_active=True,
        )
        v = ProductVariation.objects.create(
            variation_type='eBook', name='IP-V', code='IP-EBK', is_active=True,
        )
        ppv = ProductProductVariation.objects.create(
            product=cp, product_variation=v, is_active=True,
        )
        self.product = MaterialProduct.objects.create(
exam_session_subject=ess,
            product_product_variation=ppv,
            is_active=True,
            name='Item P eBook',
        )
        self.cart = Cart.objects.create()
        self.item = CartItem.objects.create(
            cart=self.cart,
            purchasable_id=self.product.pk,
            quantity=1,
            actual_price='10.00',
            price_type='standard',
        )

    def test_is_available_true_when_product_active(self):
        data = CartItemSerializer(self.item).data
        self.assertTrue(data['is_available'])

    def test_is_available_false_after_product_deactivated(self):
        Purchasable.objects.filter(pk=self.product.pk).update(is_active=False)
        self.item.refresh_from_db()
        data = CartItemSerializer(self.item).data
        self.assertFalse(data['is_available'])
