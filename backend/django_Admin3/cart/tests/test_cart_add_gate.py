"""POST /cart/add/ must reject inactive products with HTTP 400 and
the 'product_unavailable' error code."""
from datetime import timedelta
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

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


class CartAddGateTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        now = timezone.now()
        es = ExamSession.objects.create(
            session_code='2099-07', start_date=now - timedelta(days=10),
            end_date=now + timedelta(days=10), is_active=True,
        )
        s = Subject.objects.create(code='ZC1', description='T', active=True)
        ess = ExamSessionSubject.objects.create(
            exam_session=es, subject=s, is_active=True,
        )
        cp = CatalogProduct.objects.create(
            fullname='Gate Product', shortname='GP', code='GP01', is_active=True,
        )
        v = ProductVariation.objects.create(
            variation_type='eBook', name='GP-V', code='GP-EBK', is_active=True,
        )
        ppv = ProductProductVariation.objects.create(
            product=cp, product_variation=v, is_active=True,
        )
        self.inactive = MaterialProduct.objects.create(
exam_session_subject=ess,
            product_product_variation=ppv,
            is_active=False,  # KEY
            name='Gate Product eBook',
        )

    def test_cart_add_inactive_returns_400_product_unavailable(self):
        url = reverse('cart-add')
        resp = self.client.post(url, {
            'current_product': self.inactive.pk,
            'quantity': 1,
        }, format='json')
        self.assertEqual(resp.status_code, 400)
        self.assertIn('product_unavailable', str(resp.data))
