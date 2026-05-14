"""Phase 3.1: `import_current_products` branches by format to the right
store subclass. P/C -> MaterialProduct, M -> MarkingProduct + MarkingTemplate.
"""
import io
import tempfile
from pathlib import Path

from django.core.management import call_command
from django.test import TestCase


class ImportSubclassDispatchTests(TestCase):
    @staticmethod
    def _write_csv(rows):
        """Write rows to a temp CSV file and return its absolute path."""
        # Headered format; matches HEADER_ALIASES in import_current_products.py
        header = 'subject,type,item,version,code,fullname,shortname\n'
        tmp = tempfile.NamedTemporaryFile(
            mode='w', delete=False, suffix='.csv', encoding='utf-8',
        )
        tmp.write(header)
        for r in rows:
            tmp.write(','.join(r) + '\n')
        tmp.close()
        return tmp.name

    def _seed_ess(self, subject_code, session_code):
        from catalog.exam_session.models import ExamSession
        from catalog.subject.models import Subject
        from catalog.models import ExamSessionSubject
        subject, _ = Subject.objects.get_or_create(
            code=subject_code, defaults={'description': subject_code},
        )
        es, _ = ExamSession.objects.get_or_create(
            session_code=session_code,
            defaults={'start_date': '2025-04-01', 'end_date': '2025-04-30'},
        )
        ess, _ = ExamSessionSubject.objects.get_or_create(
            subject=subject, exam_session=es,
        )
        return ess

    def test_printed_import_creates_material_product(self):
        from store.models import MaterialProduct, Product
        self._seed_ess('CB1', '2025-04')

        path = self._write_csv([
            ('CB1', 'P', 'CB1_TEST_P', '2025-04', 'CB1/P/2025-04',
             'CB1 Test Printed', 'CB1 Test'),
        ])
        try:
            call_command('import_current_products', path, '--no-addons', stdout=io.StringIO())
            sp = Product.objects.get(product_code='CB1/P/2025-04')
            self.assertTrue(
                MaterialProduct.objects.filter(pk=sp.pk).exists(),
                'P-format import should produce MaterialProduct',
            )
        finally:
            Path(path).unlink(missing_ok=True)

    def test_ebook_import_creates_material_product(self):
        from store.models import MaterialProduct, Product
        self._seed_ess('CB1', '2025-04')

        path = self._write_csv([
            ('CB1', 'C', 'CB1_TEST_C', '2025-04', 'CB1/C/2025-04',
             'CB1 Test eBook', 'CB1 Test'),
        ])
        try:
            call_command('import_current_products', path, '--no-addons', stdout=io.StringIO())
            sp = Product.objects.get(product_code='CB1/C/2025-04')
            self.assertTrue(
                MaterialProduct.objects.filter(pk=sp.pk).exists(),
                'C-format import should produce MaterialProduct',
            )
        finally:
            Path(path).unlink(missing_ok=True)

    def test_marking_import_creates_marking_product_and_template(self):
        from marking.models import MarkingTemplate
        from store.models import MarkingProduct, Product
        from catalog.products.models import Product as CatalogProduct
        self._seed_ess('CB1', '2025-04')

        # Item code must fit catalog.Product.code max_length=10
        # and MarkingTemplate.code max_length=10.
        path = self._write_csv([
            ('CB1', 'M', 'CB1TMKPH3', '2025-04', 'CB1/M/2025-04',
             'CB1 Test Marking Phase3', 'CB1 Marking'),
        ])
        try:
            call_command('import_current_products', path, '--no-addons', stdout=io.StringIO())

            sp = Product.objects.get(product_code='CB1/M/2025-04')
            self.assertTrue(
                MarkingProduct.objects.filter(pk=sp.pk).exists(),
                'M-format import should produce MarkingProduct',
            )

            # The MarkingTemplate's PK must equal the catalog.Product.pk
            # this M-format row was deduped onto.
            cp = CatalogProduct.objects.get(code='CB1TMKPH3')
            mt = MarkingTemplate.objects.get(pk=cp.pk)
            self.assertEqual(mt.code, 'CB1TMKPH3')

            mp = MarkingProduct.objects.get(pk=sp.pk)
            self.assertEqual(mp.marking_template_id, mt.pk)
        finally:
            Path(path).unlink(missing_ok=True)
