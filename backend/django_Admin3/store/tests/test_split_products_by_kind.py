"""Tests for the split_products_by_kind management command.

Phase 2 of the Product MTI specialization. The command walks every
store.Product and creates one MaterialProduct / TutorialProduct /
MarkingProduct row per existing Product, reassigning Purchasable.kind
away from 'product'.
"""
from io import StringIO
from django.core.management import call_command
from django.test import TestCase


class SplitProductsDryRunTests(TestCase):
    """--dry-run mode walks the data but writes nothing."""

    def test_command_is_registered(self):
        from django.core.management import get_commands
        self.assertIn('split_products_by_kind', get_commands())

    def test_dry_run_writes_nothing(self):
        """No new MaterialProduct/TutorialProduct/MarkingProduct rows
        are created; no Purchasable.kind is changed."""
        from store.models import (
            Product, MaterialProduct, TutorialProduct, MarkingProduct, Purchasable,
        )

        material_before = MaterialProduct.objects.count()
        tutorial_before = TutorialProduct.objects.count()
        marking_before = MarkingProduct.objects.count()
        legacy_before = Purchasable.objects.filter(kind='product').count()

        out = StringIO()
        call_command('split_products_by_kind', '--dry-run', stdout=out)

        self.assertEqual(MaterialProduct.objects.count(), material_before)
        self.assertEqual(TutorialProduct.objects.count(), tutorial_before)
        self.assertEqual(MarkingProduct.objects.count(), marking_before)
        self.assertEqual(
            Purchasable.objects.filter(kind='product').count(),
            legacy_before,
        )

    def test_dry_run_prints_per_kind_tally(self):
        """The stdout includes a count per resolved kind."""
        out = StringIO()
        call_command('split_products_by_kind', '--dry-run', stdout=out)
        output = out.getvalue()
        for kind in ('material', 'tutorial', 'marking', 'unresolved'):
            self.assertIn(kind, output.lower())
        self.assertIn('total', output.lower())


class SplitProductsCheckModeTests(TestCase):
    """--check mode reports unmappable rows. Writes nothing."""

    def test_check_writes_nothing(self):
        from store.models import (
            MaterialProduct, TutorialProduct, MarkingProduct, Purchasable,
        )
        material_before = MaterialProduct.objects.count()
        tutorial_before = TutorialProduct.objects.count()
        marking_before = MarkingProduct.objects.count()
        legacy_before = Purchasable.objects.filter(kind='product').count()

        out = StringIO()
        call_command('split_products_by_kind', '--check', stdout=out)

        self.assertEqual(MaterialProduct.objects.count(), material_before)
        self.assertEqual(TutorialProduct.objects.count(), tutorial_before)
        self.assertEqual(MarkingProduct.objects.count(), marking_before)
        self.assertEqual(
            Purchasable.objects.filter(kind='product').count(),
            legacy_before,
        )

    def test_check_reports_tutorial_format_mapping_status(self):
        """Output names tutorial-format coverage and any unmapped codes."""
        out = StringIO()
        call_command('split_products_by_kind', '--check', stdout=out)
        output = out.getvalue()
        self.assertIn('format', output.lower())

    def test_check_reports_marking_template_coverage(self):
        """Output reports whether every Marking PPV product_id has a
        matching MarkingTemplate row."""
        out = StringIO()
        call_command('split_products_by_kind', '--check', stdout=out)
        output = out.getvalue()
        self.assertIn('marking_template', output.lower())


class BuildTemplateCodeTests(TestCase):
    """Direct tests for the (subject, format) -> template_code helper.

    Independent of DB state — the helper is pure string mapping.
    """

    def setUp(self):
        from store.management.commands.split_products_by_kind import Command
        self.fn = Command._build_template_code

    def test_oc_returns_oc_subject(self):
        self.assertEqual(self.fn('CB1', 'OC'), 'OC_CB1')
        self.assertEqual(self.fn('CM2', 'OC'), 'OC_CM2')

    def test_f2f_strips_letter_suffix(self):
        self.assertEqual(self.fn('CB1', 'F2F_1F'), 'CB1_f2f_1')
        self.assertEqual(self.fn('CB1', 'F2F_3F'), 'CB1_f2f_3')
        self.assertEqual(self.fn('CB1', 'F2F_5B'), 'CB1_f2f_5')
        self.assertEqual(self.fn('CB1', 'F2F_6H'), 'CB1_f2f_6')
        self.assertEqual(self.fn('SP6', 'F2F_1PD'), 'SP6_f2f_1')

    def test_lo_strips_letter_suffix(self):
        self.assertEqual(self.fn('CB1', 'LO_3F'), 'CB1_LO_3')
        self.assertEqual(self.fn('CB1', 'LO_2H'), 'CB1_LO_2')
        self.assertEqual(self.fn('CM2', 'LO_10H'), 'CM2_LO_10')
        self.assertEqual(self.fn('SP6', 'LO_1PD'), 'SP6_LO_1')

    def test_unknown_format_returns_none(self):
        self.assertIsNone(self.fn('CB1', 'UNKNOWN'))
        self.assertIsNone(self.fn('CB1', 'BUNDLE'))

    def test_numeric_suffix_edge_cases(self):
        from store.management.commands.split_products_by_kind import Command
        self.assertEqual(Command._numeric_suffix('10H'), '10')
        self.assertEqual(Command._numeric_suffix('1PD'), '1')
        self.assertEqual(Command._numeric_suffix('F'), '')
        self.assertEqual(Command._numeric_suffix(''), '')


class SplitProductsCommitTests(TestCase):
    """--commit mode actually creates subclass rows.

    Uses TestCase + per-test savepoint rollback for isolation; the
    command's outer atomic() block nests under the test savepoint
    correctly (no FK teardown issues with this approach).
    """

    def _make_minimal_legacy_product(self, code, variation_type='eBook',
                                     variation_code='X', product_code=None):
        """Create one legacy-shape Product (kind='product').

        ``product_code`` can be supplied to bypass Product.save()'s
        auto-generation logic (required for Tutorial/variation_type rows
        whose code generation needs a linked TutorialEvent).
        """
        from store.models import Product, Purchasable
        from catalog.products.models import (
            Product as CatalogProduct, ProductVariation, ProductProductVariation,
        )
        from catalog.exam_session.models import ExamSession
        from catalog.subject.models import Subject
        from catalog.models import ExamSessionSubject

        subj, _ = Subject.objects.get_or_create(
            code='TST',
            defaults={'description': 'Test subject', 'active': True}
        )
        sess, _ = ExamSession.objects.get_or_create(
            session_code='TST25',
            defaults={'start_date': '2025-01-01', 'end_date': '2025-12-31'}
        )
        ess, _ = ExamSessionSubject.objects.get_or_create(
            exam_session=sess, subject=subj
        )
        cp, _ = CatalogProduct.objects.get_or_create(
            code='TST1',
            defaults={'fullname': 'Test', 'shortname': 'Test'}
        )
        pv, _ = ProductVariation.objects.get_or_create(
            variation_type=variation_type,
            name=variation_type,
            defaults={'code': variation_code, 'is_active': True},
        )
        ppv, _ = ProductProductVariation.objects.get_or_create(
            product=cp, product_variation=pv, defaults={'is_active': True}
        )
        create_kwargs = dict(
            name=code,
            exam_session_subject=ess,
            product_product_variation=ppv,
        )
        if product_code is not None:
            # Supply explicit product_code to skip auto-generation (e.g. for
            # Tutorial rows that would need a TutorialEvent to generate a code).
            create_kwargs['product_code'] = product_code
            create_kwargs['code'] = product_code
        else:
            create_kwargs['code'] = code
        product = Product.objects.create(**create_kwargs)
        # Reset to legacy kind for the test (Product.save likely set kind to
        # 'product' via Purchasable, but be explicit).
        Purchasable.objects.filter(pk=product.pk).update(kind='product')
        return product

    def test_commit_creates_material_subclass(self):
        from store.models import MaterialProduct, Purchasable
        p = self._make_minimal_legacy_product(code='MAT/X/25', variation_type='eBook')

        call_command('split_products_by_kind', '--commit')

        self.assertTrue(
            MaterialProduct.objects.filter(pk=p.pk).exists(),
            'MaterialProduct row should be created with shared PK',
        )
        self.assertEqual(
            Purchasable.objects.get(pk=p.pk).kind, 'material'
        )

    def test_commit_is_idempotent(self):
        from store.models import MaterialProduct, Purchasable
        p = self._make_minimal_legacy_product(code='MAT/Y/25', variation_type='eBook')

        call_command('split_products_by_kind', '--commit')
        first_count = MaterialProduct.objects.count()
        # Re-stale the kind so the second run sees a kind=product row whose
        # subclass child already exists. The split should NOT create a
        # duplicate but SHOULD correct the kind back to 'material'.
        Purchasable.objects.filter(pk=p.pk).update(kind='product')
        call_command('split_products_by_kind', '--commit')
        second_count = MaterialProduct.objects.count()

        self.assertEqual(
            first_count, second_count,
            'Second --commit must not create a duplicate subclass row',
        )
        self.assertEqual(
            Purchasable.objects.get(pk=p.pk).kind, 'material'
        )

    def test_commit_preserves_product_code(self):
        from store.models import Product
        p = self._make_minimal_legacy_product(code='MAT/Z/25', variation_type='eBook',
                                              variation_code='Z')

        original_code = Product.objects.get(pk=p.pk).code
        call_command('split_products_by_kind', '--commit')
        after_code = Product.objects.get(pk=p.pk).code

        self.assertEqual(
            original_code, after_code,
            'Product.code is identity; never mutated by the split',
        )

    def test_commit_creates_tutorial_subclass(self):
        """Tutorial path: variation_type='Tutorial', OC variation_code.

        OC has no TutorialEvent and no TutorialCourseTemplate match
        by design (per Phase 2's nullable FK design); the subclass row
        is created with NULL FKs.

        We supply an explicit product_code to bypass Product.save()'s
        auto-generation, which requires a linked TutorialEvent.
        """
        from store.models import TutorialProduct, Purchasable
        p = self._make_minimal_legacy_product(
            code='TUT/OC/25', variation_type='Tutorial', variation_code='OC',
            product_code='TST/OC/TUT/25',
        )

        call_command('split_products_by_kind', '--commit')

        self.assertTrue(
            TutorialProduct.objects.filter(pk=p.pk).exists(),
            'TutorialProduct row should be created with shared PK',
        )
        tp = TutorialProduct.objects.get(pk=p.pk)
        self.assertEqual(tp.format, 'OC')
        # OC = no physical venue, no matching template in fixture
        self.assertIsNone(tp.tutorial_location_id)
        self.assertIsNone(tp.tutorial_course_template_id)
        self.assertEqual(
            Purchasable.objects.get(pk=p.pk).kind, 'tutorial'
        )

    def test_commit_creates_marking_subclass(self):
        """Marking path: requires a MarkingTemplate keyed by catalog Product.id."""
        from store.models import MarkingProduct, Purchasable
        from marking.models import MarkingTemplate
        from catalog.products.models import Product as CatalogProduct

        # Marking variation creates a catalog Product with code='TST1'
        # (or reuses existing). The MarkingTemplate must be keyed by that
        # catalog Product's pk for the split to succeed.
        p = self._make_minimal_legacy_product(
            code='MARK/M/25', variation_type='Marking', variation_code='M',
        )
        cp = CatalogProduct.objects.get(code='TST1')
        MarkingTemplate.objects.get_or_create(
            pk=cp.pk,
            defaults={'code': 'M', 'name': 'Test Marking', 'is_active': True},
        )

        call_command('split_products_by_kind', '--commit')

        self.assertTrue(
            MarkingProduct.objects.filter(pk=p.pk).exists(),
            'MarkingProduct row should be created with shared PK',
        )
        mp = MarkingProduct.objects.get(pk=p.pk)
        self.assertEqual(mp.marking_template_id, cp.pk)
        self.assertEqual(
            Purchasable.objects.get(pk=p.pk).kind, 'marking'
        )

    def test_commit_invariant_after_run(self):
        """After --commit, no Purchasable.kind='product' rows remain
        across multiple variation types (assuming all variation_types
        are mapped and the test DB has no orphans)."""
        from store.models import Purchasable
        from marking.models import MarkingTemplate
        from catalog.products.models import Product as CatalogProduct

        self._make_minimal_legacy_product(code='MAT/A/25', variation_type='eBook')
        self._make_minimal_legacy_product(
            code='MARK/A/25', variation_type='Marking', variation_code='M',
        )
        cp = CatalogProduct.objects.get(code='TST1')
        MarkingTemplate.objects.get_or_create(
            pk=cp.pk,
            defaults={'code': 'M', 'name': 'Test Marking', 'is_active': True},
        )

        call_command('split_products_by_kind', '--commit')

        self.assertEqual(
            Purchasable.objects.filter(kind='product').count(),
            0,
            'All legacy rows (material + marking) must be reclassified',
        )
