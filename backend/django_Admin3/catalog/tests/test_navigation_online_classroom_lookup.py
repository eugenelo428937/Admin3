"""Regression test: navigation_data must look up the 'Online Classroom'
FilterGroup by its correct DB name, not the off-by-typo
'Online Classroom Recording' it previously used.

Bug: catalog/views/navigation_views.py listed 'Online Classroom Recording'
in the navbar group-name lookup. The DB only has 'Online Classroom'
(id=11, code=online_classroom). The lookup silently fell back to
`{products: []}` and the dropdown rendered empty.

After fix: when a ProductVariation is assigned to the 'Online Classroom'
group via filter_product_product_groups, that variation must appear in
the tutorial_dropdown's 'Online Classroom' section.
"""
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


class OnlineClassroomLookupTests(TestCase):
    """When a variation is assigned to the 'Online Classroom' FilterGroup
    (which is the actual DB name — not 'Online Classroom Recording'),
    that variation must surface in tutorial_dropdown['Online Classroom']."""

    def setUp(self):
        cache.clear()
        self.client = APIClient()

        # Mirror the real DB layout: Tutorial parent, 'Online Classroom' child
        self.tutorial_group = FilterGroup.objects.create(
            name='Tutorial', code='tutorial', is_active=True,
        )
        self.oc_group = FilterGroup.objects.create(
            name='Online Classroom',  # ← canonical DB name, not '... Recording'
            code='online_classroom',
            is_active=True,
        )

        now = timezone.now()
        es = ExamSession.objects.create(
            session_code='2099-04', start_date=now - timedelta(days=10),
            end_date=now + timedelta(days=10), is_active=True,
        )
        subject = Subject.objects.create(code='ZN1', description='T', active=True)
        ess = ExamSessionSubject.objects.create(
            exam_session=es, subject=subject, is_active=True,
        )

        # A ProductVariation that's tagged as Online Classroom
        self.oc_variation = ProductVariation.objects.create(
            variation_type='Tutorial',
            name='OC Course',
            description='Online Classroom Course recording',
            code='OC-V',
            is_active=True,
        )
        catalog_product = CatalogProduct.objects.create(
            fullname='OC-PROD', shortname='OC-PROD', code='OC-PROD', is_active=True,
        )
        ppv = ProductProductVariation.objects.create(
            product=catalog_product, product_variation=self.oc_variation, is_active=True,
        )
        ProductProductGroup.objects.create(
            product_product_variation=ppv, product_group=self.oc_group,
        )
        StoreProduct.objects.create(
            exam_session_subject=ess,
            product_product_variation=ppv,
            kind=Purchasable.Kind.PRODUCT,
            is_active=True,
            name='OC-PROD',
            product_code='OC-PROD-CODE',
        )

    def test_online_classroom_dropdown_returns_assigned_variation(self):
        """The variation we wired to the 'Online Classroom' FilterGroup
        must appear in tutorial_dropdown['results']['Online Classroom']."""
        url = reverse('catalog:navigation-data')
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, 200, resp.data)

        oc_items = resp.data['tutorial_dropdown']['results']['Online Classroom']
        oc_codes = {item.get('description') or item.get('name') for item in oc_items}
        self.assertIn(
            'Online Classroom Course recording', oc_codes,
            f"Expected OC variation in tutorial_dropdown['Online Classroom']. "
            f"Got: {oc_items}",
        )
