"""Tests for the import_marking_deadlines management command.

After Phase 4c, the command MUST populate MarkingPaper.marking_template
or the row insert will fail (NOT NULL constraint).
"""
import tempfile
import os
from datetime import timedelta
from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone

from catalog.models import (
    ExamSession, ExamSessionSubject, Subject,
    Product as CatProd, ProductVariation, ProductProductVariation,
)
from marking.models import MarkingPaper, MarkingTemplate
from store.models import MarkingProduct


class ImportMarkingDeadlinesPhase4cTests(TestCase):
    def test_imported_paper_has_marking_template(self):
        """After import, the new MarkingPaper row has marking_template
        derived from the resolved MarkingProduct's series."""
        # ── arrange catalog + store rows the importer expects to find.
        subj = Subject.objects.create(code='CB1', description='C', active=True)
        es = ExamSession.objects.create(
            session_code='APR2026',
            start_date=timezone.now() + timedelta(days=30),
            end_date=timezone.now() + timedelta(days=60),
        )
        ess = ExamSessionSubject.objects.create(exam_session=es, subject=subj)
        tpl = MarkingTemplate.objects.create(code='X', name='Series X')
        cat = CatProd.objects.create(code='X', fullname='X Papers Marking', shortname='X')
        pv = ProductVariation.objects.create(
            variation_type='Marking', name='Std', code='MX',
        )
        ppv = ProductProductVariation.objects.create(
            product=cat, product_variation=pv,
        )
        mp = MarkingProduct(
            exam_session_subject=ess,
            marking_template=tpl,
        )
        mp.save()

        # ── write a one-row TSV the importer can consume.
        with tempfile.NamedTemporaryFile(
            mode='w', suffix='.tsv', delete=False, encoding='utf-8',
        ) as f:
            # Columns: subject, paper_name, recommended_date, deadline_date.
            f.write('CB1\tX1\t01/04/2026\t15/04/2026\n')
            tsv_path = f.name

        try:
            # ── act.
            call_command('import_marking_deadlines', tsv_path)
            # ── assert.
            paper = MarkingPaper.objects.get(name='X1')
            self.assertEqual(paper.marking_template_id, tpl.id)
        finally:
            os.unlink(tsv_path)
