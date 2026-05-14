"""Phase 3.1: `create_addon_products` instantiates MaterialProduct.

Per spec §9 (Out of scope), addon/solution products stay as MaterialProduct
rows with Purchasable.is_addon=True — no fourth subclass.
"""
from io import StringIO

from django.core.management import call_command
from django.test import TestCase


class CreateAddonProductsSubclassTests(TestCase):
    def _fixture_base_product(self):
        """Build the minimum fixture for one cloneable base addon row.

        Code 'CB1/PX/2025-04' matches the SEGMENT_MAP key 'PX' so the
        command will plan a single 'PX -> PXS' clone.
        """
        from catalog.exam_session.models import ExamSession
        from catalog.subject.models import Subject
        from catalog.models import ExamSessionSubject
        from catalog.products.models import (
            Product as CatalogProduct,
            ProductVariation,
            ProductProductVariation,
        )
        from store.models import MaterialProduct

        subject, _ = Subject.objects.get_or_create(
            code='CB1', defaults={'description': 'Test'},
        )
        es, _ = ExamSession.objects.get_or_create(
            session_code='2025-04',
            defaults={'start_date': '2025-04-01', 'end_date': '2025-04-30'},
        )
        ess, _ = ExamSessionSubject.objects.get_or_create(
            subject=subject, exam_session=es,
        )
        cp, _ = CatalogProduct.objects.get_or_create(
            code='CB1_TEST',
            fullname='CB1 Test Material',
            defaults={'shortname': 'CB1 Test'},
        )
        pv, _ = ProductVariation.objects.get_or_create(
            variation_type='Printed', name='Printed',
            defaults={'code': 'P', 'is_active': True},
        )
        ppv, _ = ProductProductVariation.objects.get_or_create(
            product=cp, product_variation=pv,
            defaults={'is_active': True},
        )
        base = MaterialProduct.objects.create(
            exam_session_subject=ess,
            product_product_variation=ppv,
            product_code='CB1/PX/2025-04',
        )
        return base

    def test_addon_clone_creates_material_product(self):
        from store.models import MaterialProduct, Product

        base = self._fixture_base_product()
        out = StringIO()
        call_command('create_addon_products', '--commit', '--no-prices', stdout=out)

        # The cloner should have produced 'CB1/PXS/2025-04'
        addon = Product.objects.get(product_code='CB1/PXS/2025-04')
        # Critically: the row exists as a MaterialProduct subclass row.
        self.assertTrue(
            MaterialProduct.objects.filter(pk=addon.pk).exists(),
            'Addon row should be created as MaterialProduct, not bare Product',
        )
        # And it carries the addon flag from Purchasable.
        self.assertTrue(addon.purchasable_ptr.is_addon)
