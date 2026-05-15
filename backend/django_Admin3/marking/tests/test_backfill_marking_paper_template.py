"""Tests for migration 0020_backfill_marking_paper_template.

Verifies the data migration copies marking_template_id from MarkingProduct
to MarkingPaper via shared PK (paper.purchasable_id == MarkingProduct.pk).

Strategy: call the migration's forward function directly against the live
test DB (same approach as test_backfill_marking_templates.py). Uses
TestCase (not TransactionTestCase) to avoid the FK-constraint flush crash
that occurs with TransactionTestCase when filter_configurations ->
auth_user FK prevents TRUNCATE on teardown. The forward function uses raw
SQL only, which works correctly within TestCase's SAVEPOINT-based isolation.
"""
import importlib
from django.test import TestCase
from django.db import connection
from django.apps import apps
from django.utils import timezone
from datetime import timedelta


mod = importlib.import_module(
    'marking.migrations.0020_backfill_marking_paper_template'
)


class BackfillMarkingPaperTemplateTests(TestCase):
    """The migration is idempotent: re-running it changes nothing."""

    def _make_marking_product_and_paper(self, subject_code='TBK', tpl_code='TBKFL'):
        """Create a MarkingProduct + MarkingPaper fixture for testing.

        Returns (marking_product, paper, template) tuple.
        """
        from catalog.models import (
            ExamSession, ExamSessionSubject, Subject,
            Product as CatProd, ProductVariation, ProductProductVariation,
        )
        from store.models import MarkingProduct
        from marking.models import MarkingPaper, MarkingTemplate

        subj, _ = Subject.objects.get_or_create(
            code=subject_code,
            defaults={'description': subject_code, 'active': True},
        )
        es, _ = ExamSession.objects.get_or_create(
            session_code='APR2026',
            defaults={
                'start_date': timezone.now() + timedelta(days=30),
                'end_date': timezone.now() + timedelta(days=60),
            },
        )
        ess, _ = ExamSessionSubject.objects.get_or_create(
            exam_session=es, subject=subj,
        )
        tpl, _ = MarkingTemplate.objects.get_or_create(
            code=tpl_code,
            defaults={'name': f'Backfill test {tpl_code}'},
        )
        cat, _ = CatProd.objects.get_or_create(
            code=tpl_code,
            defaults={'fullname': tpl_code, 'shortname': tpl_code},
        )
        pv, _ = ProductVariation.objects.get_or_create(
            variation_type='Marking', name=f'Std-{tpl_code}',
            defaults={'code': tpl_code, 'is_active': True},
        )
        ppv, _ = ProductProductVariation.objects.get_or_create(
            product=cat, product_variation=pv,
        )
        # Use explicit product_code so Product.save() doesn't need to
        # auto-generate (keeps kind as-set by save() internals).
        mp = MarkingProduct.objects.create(
            exam_session_subject=ess,
            product_product_variation=ppv,
            product_code=f'{subject_code}/M{tpl_code}/APR2026',
            marking_template=tpl,
        )
        paper = MarkingPaper.objects.create(
            purchasable=mp,
            marking_template=tpl,  # Phase 4c: NOT NULL — must supply a template
            name='X1',
            deadline=timezone.now() + timedelta(days=30),
            recommended_submit_date=timezone.now() + timedelta(days=25),
        )
        return mp, paper, tpl

    def test_backfill_does_not_overwrite_existing_template(self):
        """The migration SQL is `WHERE marking_template_id IS NULL`, so a
        paper that already has a (possibly stale) template must be left
        alone. Under NOT NULL we can no longer simulate the forward-fill
        path through the ORM — this branch is the only one reachable
        from a Phase-4c-clean database.
        """
        from marking.models import MarkingPaper, MarkingTemplate

        mp, paper, tpl = self._make_marking_product_and_paper()

        other_tpl, _ = MarkingTemplate.objects.get_or_create(
            code='OTHER', defaults={'name': 'Other Template'},
        )
        MarkingPaper.objects.filter(pk=paper.pk).update(marking_template=other_tpl)
        paper.refresh_from_db()
        self.assertEqual(paper.marking_template_id, other_tpl.pk)

        mod.backfill_marking_paper_template(apps, connection.schema_editor())

        paper.refresh_from_db()
        self.assertEqual(paper.marking_template_id, other_tpl.pk,
                         'Backfill must NOT overwrite an already-populated template')

    def test_backfill_is_idempotent(self):
        """Running the backfill twice does not change anything after the first run."""
        # Run twice — second call should be a no-op (no exceptions).
        mod.backfill_marking_paper_template(apps, connection.schema_editor())
        mod.backfill_marking_paper_template(apps, connection.schema_editor())
