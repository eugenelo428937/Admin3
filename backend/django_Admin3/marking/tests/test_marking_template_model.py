"""Tests for marking.MarkingTemplate (Phase 1 of MTI specialization)."""
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

    def test_code_is_unique(self):
        from marking.models import MarkingTemplate
        MarkingTemplate.objects.create(code='MM1', name='Mock Marking 1')
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                MarkingTemplate.objects.create(code='MM1', name='Duplicate')

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

    def test_marking_paper_has_marking_template_field(self):
        from marking.models import MarkingPaper
        field = MarkingPaper._meta.get_field('marking_template')
        self.assertTrue(field.null, "Phase 1: marking_template must be nullable")
        # related model resolves to MarkingTemplate
        from marking.models import MarkingTemplate
        self.assertEqual(field.related_model, MarkingTemplate)

    def test_marking_paper_marking_template_on_delete_protect(self):
        from marking.models import MarkingPaper
        from django.db import models as dj_models
        field = MarkingPaper._meta.get_field('marking_template')
        # PROTECT prevents accidental cascade deletion of all papers for a series
        self.assertEqual(field.remote_field.on_delete, dj_models.PROTECT)
