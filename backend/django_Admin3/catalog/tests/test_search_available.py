"""fuzzy_search and advanced_product_search must exclude inactive store products
from the suggested_products / store-product result list. The catalog-Product
fuzzy filter (suggested_filters.products) is a separate query path and may
still surface the catalog template; that's intentional - Task 9's scope is
the store-product list only."""
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
from store.models import Product as StoreProduct
from store.models.purchasable import Purchasable


class SearchAvailableTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        now = timezone.now()
        es = ExamSession.objects.create(
            session_code='2099-06', start_date=now - timedelta(days=10),
            end_date=now + timedelta(days=10), is_active=True,
        )
        s = Subject.objects.create(code='ZS1', description='T', active=True)
        ess = ExamSessionSubject.objects.create(
            exam_session=es, subject=s, is_active=True,
        )
        cp = CatalogProduct.objects.create(
            fullname='SearchableProduct', shortname='SP',
            code='SP01', is_active=True,
        )
        v = ProductVariation.objects.create(
            variation_type='eBook', name='SP-V', code='SP-EBK', is_active=True,
        )
        ppv = ProductProductVariation.objects.create(
            product=cp, product_variation=v, is_active=True,
        )
        self.sp = StoreProduct.objects.create(
            exam_session_subject=ess,
            product_product_variation=ppv,
            kind=Purchasable.Kind.MATERIAL,
            is_active=False,  # KEY: inactive at the leaf
            name='SearchableProduct eBook',
        )

    def test_fuzzy_search_excludes_inactive_store_product(self):
        url = reverse('catalog:fuzzy-search')
        resp = self.client.get(url, {'q': 'SearchableProduct'})
        self.assertEqual(resp.status_code, 200)
        # Tightened: check the store-product list specifically. The catalog
        # Product still appears in suggested_filters.products by design.
        suggested_store_products = resp.data.get('suggested_products', [])
        store_product_ids = {p.get('id') for p in suggested_store_products}
        self.assertNotIn(self.sp.pk, store_product_ids)
        # Also assert total_count for store products is 0
        self.assertEqual(resp.data.get('total_count', None), 0)

    def test_advanced_search_excludes_inactive_store_product(self):
        url = reverse('catalog:advanced-search')
        resp = self.client.get(url, {'q': 'SearchableProduct'})
        self.assertEqual(resp.status_code, 200)
        # The inactive store product's CATALOG product (cp.pk) should not
        # appear in any product list. The catalog Product's pk is what
        # advanced_product_search returns at the top level.
        # Walk the response: the catalog Product code 'SP01' should NOT
        # appear anywhere in the products section, since the store-side
        # product is inactive and there's no other available SKU.
        import json
        body = json.dumps(resp.data)
        self.assertNotIn('SP01', body)
