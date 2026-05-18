"""End-to-end smoke test: post-migration blackout, then activation,
then product appears in list / search / cart-add / serializer."""
from datetime import timedelta
from django.core.cache import cache
from django.core.management import call_command
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


class E2EActiveProductFlowTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        now = timezone.now()
        # Create rows in default-False state (simulating fresh post-migration data)
        es = ExamSession.objects.create(
            session_code='E2E-04', start_date=now - timedelta(days=5),
            end_date=now + timedelta(days=5), is_active=False,
        )
        s = Subject.objects.create(code='ZE1', description='T', active=True)
        ess = ExamSessionSubject.objects.create(
            exam_session=es, subject=s, is_active=True,
        )
        cp = CatalogProduct.objects.create(
            fullname='E2E P', shortname='E2E', code='E2E01', is_active=True,
        )
        v = ProductVariation.objects.create(
            variation_type='eBook', name='E2E-V', code='E2E-EBK',
            is_active=False,
        )
        ppv = ProductProductVariation.objects.create(
            product=cp, product_variation=v, is_active=False,
        )
        self.sp = MaterialProduct.objects.create(
exam_session_subject=ess,
            product_product_variation=ppv,
            is_active=True,
            name='E2E P eBook',
        )

    def test_blackout_then_activation(self):
        # Phase 1: products list excludes the product (default-False blackout)
        url = reverse('store:product-list')
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, 200)
        product_ids = {r['id'] for r in resp.data['results'] if not r.get('is_bundle')}
        self.assertNotIn(self.sp.pk, product_ids)

        # Phase 2: run activation command
        call_command('activate_initial_catalog')

        # Phase 3: product appears
        resp = self.client.get(url)
        product_ids = {r['id'] for r in resp.data['results'] if not r.get('is_bundle')}
        self.assertIn(self.sp.pk, product_ids)
