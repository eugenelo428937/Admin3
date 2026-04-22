"""Verify Product is an MTI subclass of Purchasable after migration."""
from django.test import TestCase
from store.models import Product, Purchasable


class ProductMTITests(TestCase):
    def test_product_is_purchasable(self):
        """MTI contract: product.purchasable_ptr traverses to the parent row,
        and Product.pk == Purchasable.pk via the parent_link OneToOneField."""
        for product in Product.objects.all().order_by('pk')[:5]:
            parent = product.purchasable_ptr
            # parent_link must be a Purchasable instance, not None, not a stale PK
            self.assertIsNotNone(parent)
            self.assertEqual(parent.__class__, Purchasable)
            self.assertEqual(parent.pk, product.pk)
            # And Purchasable.code mirrors product_code (save() invariant)
            self.assertEqual(parent.code, product.product_code)

    def test_every_product_has_purchasable_parent(self):
        """The MTI parent_link must be populated for all products (invariant
        guarded by FK constraint from Task 7)."""
        product_count = Product.objects.count()
        purchasable_product_count = Purchasable.objects.filter(
            kind=Purchasable.Kind.PRODUCT
        ).count()
        self.assertEqual(product_count, purchasable_product_count)

    def test_product_inherits_purchasable_fields(self):
        """The fields code/name/kind/is_active must be inherited from
        Purchasable (not redeclared on Product)."""
        for field_name in ('code', 'name', 'kind', 'is_active', 'dynamic_pricing'):
            field = Product._meta.get_field(field_name)
            self.assertEqual(
                field.model, Purchasable,
                f"Field {field_name!r} should come from Purchasable, got {field.model}"
            )

    def test_product_subclass_relationship(self):
        """Verify Django specifically recognises Product → Purchasable as MTI."""
        self.assertTrue(issubclass(Product, Purchasable))
        # Django MTI: _meta.parents maps parent model → parent_link field
        parent_link = Product._meta.parents.get(Purchasable)
        self.assertIsNotNone(parent_link, "No MTI parent_link found from Product to Purchasable")


class TutorialProductConcurrentSaveTests(TestCase):
    """Regression test for tutorial-product save path.

    Before the fix, placing more than one tutorial product in a single
    transaction would fail with IntegrityError on Purchasable.code's
    UNIQUE constraint (both rows trying to claim code='pending').
    """

    def test_multiple_tutorial_products_save_in_same_transaction(self):
        # Use existing fixtures — if no tutorial-type PPV exists, skip.
        from catalog.products.models import ProductProductVariation
        from catalog.models import ExamSessionSubject
        tutorial_ppvs = ProductProductVariation.objects.filter(
            product_variation__variation_type__in=[
                'Tutorial', 'Live Online', 'Online Classroom', 'Online',
            ]
        )[:2]
        esses = ExamSessionSubject.objects.all()[:2]
        if tutorial_ppvs.count() < 2 or esses.count() < 2:
            self.skipTest("Need 2+ tutorial PPVs and 2+ ESSes in fixtures")

        # Two different (ess, ppv) pairs to avoid unique_together collision
        Product.objects.create(
            exam_session_subject=esses[0],
            product_product_variation=tutorial_ppvs[0],
        )
        Product.objects.create(
            exam_session_subject=esses[1],
            product_product_variation=tutorial_ppvs[1],
        )
        # If we reach here, the UUID placeholder worked and both saved.
        tutorial_products = Product.objects.filter(
            product_product_variation__in=tutorial_ppvs
        )
        self.assertGreaterEqual(tutorial_products.count(), 2)
        # Both should have non-pending product_codes now
        for p in tutorial_products:
            self.assertFalse(p.product_code.startswith('pending'))
            self.assertFalse(p.code.startswith('pending'))
