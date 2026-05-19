"""Kind-aware classifier behavior in CartService.

After Phase 5/6, store.Product is split into MaterialProduct,
TutorialProduct, and MarkingProduct subclasses with an explicit
`kind` discriminator on Purchasable. These tests lock in that the
cart's classifier helpers branch on `kind` rather than falling
through to PPV-shaped heuristics that silently return None for
non-Material rows.
"""
from datetime import timedelta
from decimal import Decimal
from django.test import TestCase, override_settings
from django.utils import timezone

from cart.models import Cart, CartItem
from cart.services.cart_service import CartService
from catalog.models import (
    Subject, ExamSession, ExamSessionSubject,
    Product as CatalogProduct, ProductVariation, ProductProductVariation,
)
from store.models import MaterialProduct, MarkingProduct, TutorialProduct


@override_settings(USE_DUMMY_PAYMENT_GATEWAY=True)
class KindAwareClassifierTest(TestCase):
    """All three product kinds — Material, Tutorial, Marking — must be
    classified by purchasable.kind, not by walking the legacy PPV chain.
    """

    @classmethod
    def setUpTestData(cls):
        now = timezone.now()
        cls.subject = Subject.objects.create(code='CM2', active=True)
        cls.exam_session = ExamSession.objects.create(
            session_code='2025-04',
            start_date=now - timedelta(days=10),
            end_date=now + timedelta(days=10),
            is_active=True,
        )
        cls.ess = ExamSessionSubject.objects.create(
            exam_session=cls.exam_session, subject=cls.subject, is_active=True,
        )

        # ── Material fixture ────────────────────────────────────────────
        cls.catalog_product = CatalogProduct.objects.create(
            fullname='Core Study Material CM2', shortname='CSM CM2',
            code='CSM01', is_active=True,
        )
        cls.variation_ebook = ProductVariation.objects.create(
            variation_type='eBook', name='Standard eBook', code='E',
            is_active=True,
        )
        cls.ppv_ebook = ProductProductVariation.objects.create(
            product=cls.catalog_product, product_variation=cls.variation_ebook,
            is_active=True,
        )
        cls.material_product = MaterialProduct.objects.create(
            exam_session_subject=cls.ess, product_product_variation=cls.ppv_ebook,
        )

        # ── Tutorial fixture ────────────────────────────────────────────
        from tutorials.models import TutorialLocation
        cls.location = TutorialLocation.objects.create(name='London', code='LON')
        cls.tutorial_product = TutorialProduct.objects.create(
            exam_session_subject=cls.ess, is_active=True,
            format='LO_6H', tutorial_location=cls.location,
        )

        # ── Marking fixture ─────────────────────────────────────────────
        from marking.models import MarkingTemplate
        cls.marking_template = MarkingTemplate.objects.create(
            code='MM1', name='Mock Marking 1',
        )
        cls.marking_product = MarkingProduct.objects.create(
            exam_session_subject=cls.ess, marking_template=cls.marking_template,
            is_active=True,
        )

    def setUp(self):
        self.service = CartService()
        self.cart = Cart.objects.create(session_key='test-session')

    # ─── _is_material_product ────────────────────────────────────────────

    def test_is_material_product_true_for_material_kind(self):
        item = CartItem.objects.create(
            cart=self.cart, product=self.material_product,
            quantity=1, price_type='standard', actual_price=Decimal('50.00'),
            metadata={'variationType': 'eBook'},
        )
        self.assertTrue(self.service._is_material_product(item))

    def test_is_material_product_false_for_tutorial_kind(self):
        """Tutorial kind must classify as not-material, regardless of metadata."""
        item = CartItem.objects.create(
            cart=self.cart, product=self.tutorial_product,
            quantity=1, price_type='standard', actual_price=Decimal('150.00'),
            metadata={},
        )
        self.assertFalse(self.service._is_material_product(item))

    def test_is_material_product_false_for_marking_kind(self):
        """Marking kind must classify as not-material — no PPV fall-through."""
        item = CartItem.objects.create(
            cart=self.cart, product=self.marking_product,
            quantity=1, price_type='standard', actual_price=Decimal('40.00'),
            metadata={},
        )
        self.assertFalse(self.service._is_material_product(item))

    # ─── _is_tutorial_product ────────────────────────────────────────────

    def test_is_tutorial_product_true_for_tutorial_kind(self):
        """A TutorialProduct cart line is a tutorial even before any
        CartTutorialChoice rows are attached."""
        item = CartItem.objects.create(
            cart=self.cart, product=self.tutorial_product,
            quantity=1, price_type='standard', actual_price=Decimal('150.00'),
            metadata={},
        )
        self.assertTrue(self.service._is_tutorial_product(item))

    def test_is_tutorial_product_false_for_marking_kind(self):
        item = CartItem.objects.create(
            cart=self.cart, product=self.marking_product,
            quantity=1, price_type='standard', actual_price=Decimal('40.00'),
            metadata={},
        )
        self.assertFalse(self.service._is_tutorial_product(item))

    def test_is_tutorial_product_false_for_material_kind(self):
        item = CartItem.objects.create(
            cart=self.cart, product=self.material_product,
            quantity=1, price_type='standard', actual_price=Decimal('50.00'),
            metadata={'variationType': 'eBook'},
        )
        self.assertFalse(self.service._is_tutorial_product(item))

    # ─── _is_digital_product ─────────────────────────────────────────────

    def test_is_digital_product_false_for_tutorial_kind(self):
        """Tutorial is delivered live — not 'digital' in the VAT sense."""
        item = CartItem.objects.create(
            cart=self.cart, product=self.tutorial_product,
            quantity=1, price_type='standard', actual_price=Decimal('150.00'),
            metadata={},
        )
        self.assertFalse(self.service._is_digital_product(item))

    def test_is_digital_product_false_for_marking_kind(self):
        """Marking products are electronic submissions but not treated as
        Digital for VAT — they have their own product_type."""
        item = CartItem.objects.create(
            cart=self.cart, product=self.marking_product,
            quantity=1, price_type='standard', actual_price=Decimal('40.00'),
            metadata={},
        )
        self.assertFalse(self.service._is_digital_product(item))

    def test_is_digital_product_true_for_material_ebook(self):
        """Positive material→digital path still requires an explicit
        metadata signal (variationId / variationName / 'OC' code).
        Empty metadata stays non-digital — controllers must tag."""
        item = CartItem.objects.create(
            cart=self.cart, product=self.material_product,
            quantity=1, price_type='standard', actual_price=Decimal('50.00'),
            metadata={'variationId': self.ppv_ebook.id},
        )
        self.assertTrue(self.service._is_digital_product(item))

    # ─── _get_item_product_type ──────────────────────────────────────────

    def test_product_type_marking_kind_without_metadata(self):
        """A Marking cart line with empty metadata must classify as
        'Marking', not fall through to the 'Digital' default.

        This is the active foot-gun that prompted the refactor: a
        Marking item without metadata.variationType currently returns
        'Digital' and feeds the wrong VAT context.
        """
        item = CartItem.objects.create(
            cart=self.cart, product=self.marking_product,
            quantity=1, price_type='standard', actual_price=Decimal('40.00'),
            metadata={},
        )
        self.assertEqual(self.service._get_item_product_type(item), 'Marking')

    def test_product_type_tutorial_kind_without_metadata(self):
        """A TutorialProduct cart line without metadata.type must still
        classify as 'Tutorial' via kind dispatch."""
        item = CartItem.objects.create(
            cart=self.cart, product=self.tutorial_product,
            quantity=1, price_type='standard', actual_price=Decimal('150.00'),
            metadata={},
        )
        self.assertEqual(self.service._get_item_product_type(item), 'Tutorial')

    def test_product_type_metadata_overrides_kind(self):
        """If metadata.variationType is set, it wins — preserves the
        existing contract that controllers can override kind-based
        defaults (e.g., a Material row tagged Printed)."""
        item = CartItem.objects.create(
            cart=self.cart, product=self.material_product,
            quantity=1, price_type='standard', actual_price=Decimal('50.00'),
            metadata={'variationType': 'Printed'},
        )
        self.assertEqual(self.service._get_item_product_type(item), 'Printed')

    # ─── _get_item_product_code ──────────────────────────────────────────

    def test_product_code_marking_returns_template_code(self):
        """Marking cart line should surface the marking_template code,
        not an empty string. Improves rules-engine audit context."""
        item = CartItem.objects.create(
            cart=self.cart, product=self.marking_product,
            quantity=1, price_type='standard', actual_price=Decimal('40.00'),
            metadata={},
        )
        self.assertEqual(self.service._get_item_product_code(item), 'MM1')

    def test_product_code_tutorial_returns_format(self):
        """Tutorial cart line should surface the format enum (e.g. 'LO_6H'),
        not an empty string."""
        item = CartItem.objects.create(
            cart=self.cart, product=self.tutorial_product,
            quantity=1, price_type='standard', actual_price=Decimal('150.00'),
            metadata={},
        )
        self.assertEqual(self.service._get_item_product_code(item), 'LO_6H')

    def test_product_code_material_returns_catalog_code(self):
        """Material path is unchanged — catalog product code wins."""
        item = CartItem.objects.create(
            cart=self.cart, product=self.material_product,
            quantity=1, price_type='standard', actual_price=Decimal('50.00'),
            metadata={'variationType': 'eBook'},
        )
        self.assertEqual(self.service._get_item_product_code(item), 'CSM01')
