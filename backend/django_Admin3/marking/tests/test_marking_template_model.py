"""Tests for marking.MarkingTemplate (MTI specialization, Phases 1–2)."""
from django.db import IntegrityError, transaction
from django.test import TestCase


class MarkingTemplateModelTests(TestCase):
    def test_importable_from_marking_models(self):
        from marking.models import MarkingTemplate
        self.assertTrue(hasattr(MarkingTemplate, '_meta'))

    def test_schema_qualified_db_table(self):
        from marking.models import MarkingTemplate
        self.assertEqual(
            MarkingTemplate._meta.db_table,
            '"acted"."marking_templates"',
        )

    def test_create_minimal(self):
        from marking.models import MarkingTemplate
        t = MarkingTemplate.objects.create(code='X', name='Series X Marking')
        self.assertEqual(t.code, 'X')
        self.assertEqual(t.name, 'Series X Marking')
        self.assertTrue(t.is_active)
        self.assertEqual(t.description, '')
        self.assertIsNotNone(t.created_at)
        self.assertIsNotNone(t.updated_at)

    def test_code_alone_is_not_unique(self):
        """Phase 2: catalog has duplicate codes with distinct shortnames
        (e.g., 'M' appears as both 'Mock Exam Marking' and 'Practice
        Exam Marking'). We preserve both. Uniqueness is over the
        composite (code, name).
        """
        from marking.models import MarkingTemplate
        MarkingTemplate.objects.create(code='M', name='Mock Exam Marking')
        # Same code, different name — must succeed
        t2 = MarkingTemplate.objects.create(code='M', name='Practice Exam Marking')
        self.assertEqual(t2.code, 'M')
        self.assertEqual(MarkingTemplate.objects.filter(code='M').count(), 2)

    def test_code_name_pair_is_unique(self):
        """Same code AND same name => IntegrityError via composite UC."""
        from marking.models import MarkingTemplate
        MarkingTemplate.objects.create(code='X', name='X Marking')
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                MarkingTemplate.objects.create(code='X', name='X Marking')

    def test_has_composite_unique_constraint(self):
        """Constraint is registered in _meta so Django will enforce it in migrations."""
        from marking.models import MarkingTemplate
        constraint_names = {c.name for c in MarkingTemplate._meta.constraints}
        self.assertIn('uq_marking_template_code_name', constraint_names)

    def test_str_format(self):
        from marking.models import MarkingTemplate
        t = MarkingTemplate.objects.create(code='X', name='Series X Marking')
        self.assertEqual(str(t), 'X: Series X Marking')

    def test_inactive_by_flag(self):
        from marking.models import MarkingTemplate
        t = MarkingTemplate.objects.create(
            code='OLD', name='Retired Series', is_active=False
        )
        self.assertFalse(t.is_active)


class MarkingPaperHasTemplateFKTests(TestCase):
    """MarkingPaper.marking_template added in Phase 1 (nullable).

    Becomes NOT NULL in Phase 4c after backfill.
    """

    def test_marking_paper_marking_template_is_not_null(self):
        """Phase 4c: marking_template is now NOT NULL after the
        backfill migration (0020) populated every row.

        Going forward, every paper belongs to a series — there is no
        legitimate 'series-less' paper in the data model.
        """
        from marking.models import MarkingPaper
        field = MarkingPaper._meta.get_field('marking_template')
        self.assertFalse(field.null, 'Phase 4c: marking_template must be NOT NULL')
        from marking.models import MarkingTemplate
        self.assertEqual(field.related_model, MarkingTemplate)

    def test_marking_paper_marking_template_on_delete_protect(self):
        from marking.models import MarkingPaper
        from django.db import models as dj_models
        field = MarkingPaper._meta.get_field('marking_template')
        # PROTECT prevents accidental cascade deletion of all papers for a series.
        self.assertEqual(field.remote_field.on_delete, dj_models.PROTECT)

    def test_marking_paper_create_without_template_raises(self):
        """Phase 4c: a MarkingPaper cannot be created without a
        marking_template — IntegrityError at the DB layer."""
        from django.db import IntegrityError, transaction
        from django.utils import timezone
        from datetime import timedelta
        from marking.models import MarkingPaper
        from store.models import Purchasable
        from catalog.models import (
            ExamSession, ExamSessionSubject, Subject,
            Product as CatalogProduct, ProductVariation, ProductProductVariation,
        )
        from store.models import Product as StoreProduct
        # Build a minimal store.Product (which IS a Purchasable) to satisfy
        # the MarkingPaper.purchasable FK constraint that requires a row in
        # acted.products (a legacy DB-level constraint from migration 0003).
        exam_session = ExamSession.objects.create(
            session_code='ORPHTEST2026',
            start_date=timezone.now(),
            end_date=timezone.now() + timedelta(days=60),
        )
        subject = Subject.objects.create(
            code='ORPH', description='Orphan test subject', active=True,
        )
        ess = ExamSessionSubject.objects.create(
            exam_session=exam_session, subject=subject,
        )
        cat_product = CatalogProduct.objects.create(
            code='ORPHPROD', fullname='Orphan Product', shortname='Orphan',
        )
        variation = ProductVariation.objects.create(
            variation_type='Marking', name='OrphStd',
        )
        ppv = ProductProductVariation.objects.create(
            product=cat_product, product_variation=variation,
        )
        p = StoreProduct.objects.create(
            exam_session_subject=ess,
            product_product_variation=ppv,
        )
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                MarkingPaper.objects.create(
                    purchasable=p,
                    name='X',
                    deadline=timezone.now() + timedelta(days=30),
                    recommended_submit_date=timezone.now() + timedelta(days=25),
                    # marking_template intentionally omitted
                )
