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


class NavigationDataFilterObjectTests(TestCase):
    """Each clickable nav item carries a filter={key, value, preserve} object."""

    def setUp(self):
        cache.clear()
        self.client = APIClient()

    def test_subjects_carry_filter_object(self):
        """Each subject item carries filter={key:'subjects', value:<code>, preserve:[]}."""
        Subject.objects.create(code='ZZ1', description='Test Subject', active=True)
        cache.clear()

        url = reverse('catalog:navigation-data')
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, 200)

        subjects = resp.data['subjects']
        zz1 = next((s for s in subjects if s['code'] == 'ZZ1'), None)
        self.assertIsNotNone(zz1, 'ZZ1 subject not found in response')
        self.assertEqual(zz1['filter'], {
            'key': 'subjects',
            'value': 'ZZ1',
            'preserve': [],
        })

    def test_navbar_groups_carry_filter_object_when_mapped(self):
        """navbar_product_groups items carry filter resolved from filter_configuration_groups."""
        from filtering.models import FilterConfiguration, FilterConfigurationGroup

        fc = FilterConfiguration.objects.create(
            name='PRODUCT_TYPE_TEST', filter_key='product_types',
            filter_type='filter_group', display_label='Product Type', is_active=True,
        )
        fg = FilterGroup.objects.create(name='Core Study Materials', code='csm-test', is_active=True)
        FilterConfigurationGroup.objects.create(filter_configuration=fc, filter_group=fg)
        cache.clear()

        url = reverse('catalog:navigation-data')
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, 200)

        groups = resp.data['navbar_product_groups']['results']
        csm = next((g for g in groups if g.get('name') == 'Core Study Materials'), None)
        self.assertIsNotNone(csm, "'Core Study Materials' not found in navbar_product_groups")
        self.assertEqual(csm.get('filter'), {
            'key': 'product_types',
            'value': 'Core Study Materials',
            'preserve': ['subjects'],
        })

    def test_navbar_groups_without_mapping_omit_filter_key(self):
        """navbar_product_groups items without a FilterConfigurationGroup mapping have no 'filter' key."""
        # Create an unmapped group named exactly 'Marking' (in the navbar list) but with no FCG
        FilterGroup.objects.create(name='Marking', code='marking-unmapped-test', is_active=True)
        cache.clear()

        url = reverse('catalog:navigation-data')
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, 200)

        groups = resp.data['navbar_product_groups']['results']
        marking = next((g for g in groups if g.get('name') == 'Marking'), None)
        self.assertIsNotNone(marking)
        # No FCG mapping → no 'filter' key emitted
        self.assertNotIn('filter', marking)

    def test_distance_learning_groups_carry_filter_object_when_mapped(self):
        """distance_learning_dropdown items carry filter when mapped via filter_configuration_groups."""
        from filtering.models import FilterConfiguration, FilterConfigurationGroup

        fc = FilterConfiguration.objects.create(
            name='PRODUCT_TYPE_DL', filter_key='product_types',
            filter_type='filter_group', display_label='Product Type DL', is_active=True,
        )
        fg = FilterGroup.objects.create(name='Revision Materials', code='rev-test', is_active=True)
        FilterConfigurationGroup.objects.create(filter_configuration=fc, filter_group=fg)
        cache.clear()

        url = reverse('catalog:navigation-data')
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, 200)

        groups = resp.data['distance_learning_dropdown']['results']
        rev = next((g for g in groups if g.get('name') == 'Revision Materials'), None)
        self.assertIsNotNone(rev, "'Revision Materials' not found in distance_learning_dropdown")
        self.assertEqual(rev.get('filter'), {
            'key': 'product_types',
            'value': 'Revision Materials',
            'preserve': ['subjects'],
        })

    def test_tutorial_format_items_carry_filter_object_when_mapped(self):
        """tutorial_dropdown Format items carry filter resolved from filter_configuration_groups."""
        from filtering.models import FilterConfiguration, FilterConfigurationGroup

        fc = FilterConfiguration.objects.create(
            name='DELIVERY_MODE_TEST', filter_key='modes_of_delivery',
            filter_type='filter_group', display_label='Delivery Mode', is_active=True,
        )
        fg = FilterGroup.objects.create(name='Face-to-face', code='f2f-test', is_active=True)
        FilterConfigurationGroup.objects.create(filter_configuration=fc, filter_group=fg)
        cache.clear()

        url = reverse('catalog:navigation-data')
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, 200)

        format_items = resp.data['tutorial_dropdown']['results']['Format']
        f2f = next((f for f in format_items if f.get('name') == 'Face-to-face'), None)
        self.assertIsNotNone(f2f, "'Face-to-face' not found in tutorial_dropdown Format")
        self.assertEqual(f2f.get('filter'), {
            'key': 'modes_of_delivery',
            'value': 'Face-to-face',
            'preserve': ['subjects'],
        })
