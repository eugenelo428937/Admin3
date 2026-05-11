"""navigation_data must hide catalog.Products / ProductVariations that
have no available store.Product backing them."""
from datetime import timedelta
from django.core.cache import cache
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
from filtering.models import FilterGroup, ProductProductGroup
from store.models import Product as StoreProduct, Purchasable


class NavigationDataAvailableTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()

        # Create the Tutorial filter group (used by navbar for location list)
        self.tutorial_group = FilterGroup.objects.create(
            name='Tutorial', code='TUTORIAL', is_active=True,
        )

        now = timezone.now()
        es_active = ExamSession.objects.create(
            session_code='2099-04', start_date=now - timedelta(days=10),
            end_date=now + timedelta(days=10), is_active=True,
        )
        es_inactive = ExamSession.objects.create(
            session_code='2099-05', start_date=now - timedelta(days=10),
            end_date=now + timedelta(days=10), is_active=False,  # KEY
        )
        s = Subject.objects.create(code='ZN1', description='T', active=True)
        ess_a = ExamSessionSubject.objects.create(
            exam_session=es_active, subject=s, is_active=True,
        )
        ess_i = ExamSessionSubject.objects.create(
            exam_session=es_inactive, subject=s, is_active=True,
        )
        v = ProductVariation.objects.create(
            variation_type='Tutorial', name='F2F', code='F2F-V', is_active=True,
        )

        def mk(code, ess):
            cp = CatalogProduct.objects.create(
                fullname=code, shortname=code, code=code, is_active=True,
            )
            ppv = ProductProductVariation.objects.create(
                product=cp, product_variation=v, is_active=True,
            )
            ProductProductGroup.objects.create(
                product_product_variation=ppv, product_group=self.tutorial_group,
            )
            return cp, StoreProduct.objects.create(
                exam_session_subject=ess,
                product_product_variation=ppv,
                kind=Purchasable.Kind.PRODUCT,
                is_active=True,
                name=code,
                # Pre-set product_code to bypass Tutorial code auto-generation
                # (which requires a TutorialEvent — out of scope for this test).
                product_code=f'{code}-CODE',
            )

        self.product_with_active, _ = mk('NAV-AVAIL', ess_a)
        self.product_with_inactive_only, _ = mk('NAV-DARK', ess_i)

    def test_tutorial_locations_exclude_products_with_only_inactive_store(self):
        url = reverse('catalog:navigation-data')
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, 200)
        loc = resp.data['tutorial_dropdown']['results']['Location']
        all_codes = {p['code'] for p in loc['left'] + loc['right']}
        self.assertIn('NAV-AVAIL', all_codes)
        self.assertNotIn('NAV-DARK', all_codes)
