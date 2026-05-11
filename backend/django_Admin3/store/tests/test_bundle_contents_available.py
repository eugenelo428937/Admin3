"""Bundle stays visible when contents go inactive, but the contents
endpoint excludes inactive items."""
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
from catalog.products.bundle.models import ProductBundle
from store.models import (
    Product as StoreProduct, Purchasable, Bundle, BundleProduct,
)


class BundleContentsAvailableTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        now = timezone.now()
        self.session = ExamSession.objects.create(
            session_code='2099-05',
            start_date=now - timedelta(days=10),
            end_date=now + timedelta(days=10),
            is_active=True,
        )
        self.subject = Subject.objects.create(code='ZB1', description='T', active=True)
        self.ess = ExamSessionSubject.objects.create(
            exam_session=self.session, subject=self.subject, is_active=True,
        )
        # Bundle template (catalog-side) for the store Bundle
        self.template = ProductBundle.objects.create(
            bundle_name='ZB1 Test Bundle',
            subject=self.subject,
            is_active=True,
        )
        # Two products with DISTINCT PPVs (so each gets a unique product_code)
        def mk(code, active):
            cp = CatalogProduct.objects.create(
                fullname=code, shortname=code, code=code, is_active=True,
            )
            v = ProductVariation.objects.create(
                variation_type='eBook', name=f'{code}-V', code=f'{code}-EBK',
                is_active=True,
            )
            ppv = ProductProductVariation.objects.create(
                product=cp, product_variation=v, is_active=True,
            )
            return StoreProduct.objects.create(
                exam_session_subject=self.ess,
                product_product_variation=ppv,
                kind=Purchasable.Kind.PRODUCT,
                is_active=active,
                name=code,
            )
        self.active_p = mk('B-ACT', True)
        self.inactive_p = mk('B-INACT', False)
        self.bundle = Bundle.objects.create(
            bundle_template=self.template,
            exam_session_subject=self.ess,
            is_active=True,
        )
        BundleProduct.objects.create(
            bundle=self.bundle, product=self.active_p, is_active=True,
        )
        BundleProduct.objects.create(
            bundle=self.bundle, product=self.inactive_p, is_active=True,
        )

    def test_bundle_visible_in_list(self):
        url = reverse('store:bundle-list')
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, 200)
        # BundleViewSet's list returns plain list (pagination_class = None)
        # OR it might be wrapped. Try both shapes.
        results = resp.data['results'] if isinstance(resp.data, dict) and 'results' in resp.data else resp.data
        ids = {b['id'] for b in results}
        self.assertIn(self.bundle.pk, ids)

    def test_bundle_contents_excludes_inactive(self):
        url = reverse('store:bundle-products', args=[self.bundle.pk])
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, 200)
        # BundleProductSerializer exposes `product` as PK (int), not nested.
        product_ids = {
            item['product']['id'] if isinstance(item['product'], dict) else item['product']
            for item in resp.data
        }
        self.assertIn(self.active_p.pk, product_ids)
        self.assertNotIn(self.inactive_p.pk, product_ids)
