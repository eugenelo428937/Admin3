"""Customer-facing product list/retrieve endpoints must filter to
available products only. Direct retrieve is the documented exception
(order history support)."""
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


def make_active_product(code_suffix='1'):
    """Create a fully-active Product chain. Each call uses a distinct subject,
    PPV, and exam session to keep product_code uniqueness intact."""
    now = timezone.now()
    es = ExamSession.objects.create(
        session_code=f'2099-04-{code_suffix}',
        start_date=now - timedelta(days=10),
        end_date=now + timedelta(days=10),
        is_active=True,
    )
    s = Subject.objects.create(
        code=f'ZA{code_suffix}', description='T', active=True,
    )
    ess = ExamSessionSubject.objects.create(
        exam_session=es, subject=s, is_active=True,
    )
    cp = CatalogProduct.objects.create(
        fullname=f'Product {code_suffix}', shortname=f'P{code_suffix}',
        code=f'P{code_suffix}', is_active=True,
    )
    v = ProductVariation.objects.create(
        variation_type='eBook', name=f'V{code_suffix}',
        code=f'V-EBK-{code_suffix}', is_active=True,
    )
    ppv = ProductProductVariation.objects.create(
        product=cp, product_variation=v, is_active=True,
    )
    from store.models import MaterialProduct
    return MaterialProduct.objects.create(
        exam_session_subject=ess,
        product_product_variation=ppv,
        is_active=True,
        name=f'Product {code_suffix} eBook',
    )


class ProductViewSetAvailableTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.active = make_active_product('A')
        self.inactive = make_active_product('B')
        # Flip ExamSession off → product B should disappear from list
        ExamSession.objects.filter(
            pk=self.inactive.exam_session_subject.exam_session.pk
        ).update(is_active=False)
        # Strengthen the retrieve test: also flip the leaf Purchasable flag
        # so the OLD code (which filtered retrieve by is_active=True) would
        # have hidden it. The NEW unfiltered retrieve must still return it.
        Purchasable.objects.filter(pk=self.inactive.pk).update(is_active=False)

    def test_list_excludes_inactive(self):
        url = reverse('store:product-list')
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, 200)
        ids = {r['id'] for r in resp.data['results'] if not r.get('is_bundle')}
        self.assertIn(self.active.pk, ids)
        self.assertNotIn(self.inactive.pk, ids)

    def test_retrieve_inactive_still_returns_200(self):
        """Order history support — direct fetch returns inactive products."""
        url = reverse('store:product-detail', args=[self.inactive.pk])
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['id'], self.inactive.pk)
