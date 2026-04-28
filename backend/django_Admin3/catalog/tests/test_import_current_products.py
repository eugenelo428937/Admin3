"""Tests for the import_current_products management command."""
import os
from datetime import datetime
from io import StringIO

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase
from django.utils import timezone

from catalog.exam_session.models import ExamSession
from catalog.models.exam_session_subject import ExamSessionSubject
from catalog.products.models.product import Product
from catalog.products.models.product_product_variation import ProductProductVariation
from catalog.products.models.product_variation import ProductVariation
from catalog.subject.models import Subject
from store.models.product import Product as StoreProduct


FIXTURE_DIR = os.path.join(
    os.path.dirname(__file__), 'fixtures_legacy_csvs'
)
MINI_CURRENT_CSV = os.path.join(FIXTURE_DIR, 'mini_current.csv')


class ImportCurrentProductsTestBase(TestCase):
    """Base class that sets up ExamSession + ExamSessionSubject fixtures."""

    @classmethod
    def setUpTestData(cls):
        cls.session = ExamSession.objects.create(
            session_code='26',
            start_date=timezone.make_aware(datetime(2026, 4, 1)),
            end_date=timezone.make_aware(datetime(2026, 9, 30)),
        )
        cls.subj_cm1 = Subject.objects.create(code='CM1', description='CM1')
        cls.subj_cb1 = Subject.objects.create(code='CB1', description='CB1')
        cls.ess_cm1 = ExamSessionSubject.objects.create(
            exam_session=cls.session, subject=cls.subj_cm1
        )
        cls.ess_cb1 = ExamSessionSubject.objects.create(
            exam_session=cls.session, subject=cls.subj_cb1
        )


class TestHappyPath(ImportCurrentProductsTestBase):
    """Test full import pipeline with mini_current.csv."""

    def test_creates_product_variations(self):
        out = StringIO()
        call_command('import_current_products', MINI_CURRENT_CSV,
                     '--session-code', '26', stdout=out)
        self.assertTrue(ProductVariation.objects.filter(code='P').exists())
        self.assertTrue(ProductVariation.objects.filter(code='C').exists())
        self.assertTrue(ProductVariation.objects.filter(code='M').exists())

    def test_creates_catalog_products(self):
        out = StringIO()
        call_command('import_current_products', MINI_CURRENT_CSV,
                     '--session-code', '26', stdout=out)
        # Expected products after merging:
        # "Course Notes" (N) — merged from P+C
        # "Combined Materials Pack" (C) — merged from P+C
        # "Mock Exam Marking" (M) — grouped from 3 rows
        # "ASET (2014-2017 Papers)" (EX)
        # "Series X Assignments (Marking)" (X) — kept separate (B choice)
        # "Series X Assignments" (X) — merged from P+C
        products = Product.objects.all()
        names = set(products.values_list('fullname', flat=True))
        self.assertIn('Course Notes', names)
        self.assertIn('Combined Materials Pack', names)
        self.assertIn('Mock Exam Marking', names)
        self.assertIn('ASET (2014-2017 Papers)', names)
        self.assertIn('Series X Assignments (Marking)', names)
        self.assertIn('Series X Assignments', names)
        self.assertEqual(len(names), 6)

    def test_creates_ppvs(self):
        out = StringIO()
        call_command('import_current_products', MINI_CURRENT_CSV,
                     '--session-code', '26', stdout=out)
        # "Course Notes" → P, C (2 PPVs)
        # "Combined Materials Pack" → P, C (2 PPVs)
        # "Mock Exam Marking" → M (1 PPV)
        # "ASET (2014-2017 Papers)" → P (1 PPV)
        # "Series X Assignments (Marking)" → M (1 PPV)
        # "Series X Assignments" → P, C (2 PPVs)
        # Total: 9 PPVs
        self.assertEqual(ProductProductVariation.objects.count(), 9)

    def test_creates_store_products(self):
        out = StringIO()
        # --no-addons keeps this test focused on the base import; addon
        # cloning (CM1→CM1S etc.) runs by default since b4940224 and is
        # exercised by the dedicated create_addon_products tests.
        call_command('import_current_products', MINI_CURRENT_CSV,
                     '--session-code', '26', '--no-addons', stdout=out)
        # 13 non-wildcard rows, but after dedup:
        # CM1: Course Notes P, Course Notes C, CMP P, CMP C,
        #       Mock Exam Marking M (3 rows → 1) = 5
        # CB1: Course Notes P, Course Notes C, ASET P,
        #       Series X (Marking) M, Series X C, Series X P = 6
        # Total: 11 store products
        self.assertEqual(StoreProduct.objects.count(), 11)

    def test_store_product_codes_generated(self):
        out = StringIO()
        call_command('import_current_products', MINI_CURRENT_CSV,
                     '--session-code', '26', stdout=out)
        for sp in StoreProduct.objects.all():
            self.assertTrue(sp.product_code, f"Empty product_code for {sp}")
            self.assertIn('/26', sp.product_code)


class TestCanonicalNameMerging(ImportCurrentProductsTestBase):
    """Test that P/C pairs merge into one Product."""

    def test_ebook_suffix_stripped(self):
        call_command('import_current_products', MINI_CURRENT_CSV,
                     '--session-code', '26', stdout=StringIO())
        # "Course Notes eBook" should NOT exist as separate product
        self.assertFalse(
            Product.objects.filter(fullname='Course Notes eBook').exists()
        )
        # "Course Notes" should exist
        self.assertTrue(
            Product.objects.filter(fullname='Course Notes').exists()
        )

    def test_merged_product_has_two_ppvs(self):
        call_command('import_current_products', MINI_CURRENT_CSV,
                     '--session-code', '26', stdout=StringIO())
        product = Product.objects.get(fullname='Course Notes', code='N')
        ppvs = ProductProductVariation.objects.filter(product=product)
        variation_codes = set(
            ppvs.values_list('product_variation__code', flat=True)
        )
        self.assertEqual(variation_codes, {'P', 'C'})

    def test_shortname_prefers_printed(self):
        """When P and C exist, shortname should come from P row."""
        call_command('import_current_products', MINI_CURRENT_CSV,
                     '--session-code', '26', stdout=StringIO())
        product = Product.objects.get(fullname='Combined Materials Pack', code='C')
        # P row shortname is "CMP", C row is "CMP eBook"
        self.assertEqual(product.shortname, 'CMP')


class TestMockExamGrouping(ImportCurrentProductsTestBase):
    """Test mock exam marking rows grouped into one product."""

    def test_three_rows_become_one_product(self):
        call_command('import_current_products', MINI_CURRENT_CSV,
                     '--session-code', '26', stdout=StringIO())
        mock_products = Product.objects.filter(
            fullname='Mock Exam Marking', code='M'
        )
        self.assertEqual(mock_products.count(), 1)

    def test_no_mock_exam_2_3_products(self):
        call_command('import_current_products', MINI_CURRENT_CSV,
                     '--session-code', '26', stdout=StringIO())
        self.assertFalse(
            Product.objects.filter(fullname='Mock Exam 2 Marking').exists()
        )
        self.assertFalse(
            Product.objects.filter(fullname='Mock Exam 3 Marking').exists()
        )

    def test_one_store_product_per_subject(self):
        call_command('import_current_products', MINI_CURRENT_CSV,
                     '--session-code', '26', stdout=StringIO())
        mock_product = Product.objects.get(fullname='Mock Exam Marking', code='M')
        ppv = ProductProductVariation.objects.get(product=mock_product)
        # CM1 has 3 mock exam rows → 1 store product
        cm1_store = StoreProduct.objects.filter(
            exam_session_subject=self.ess_cm1,
            product_product_variation=ppv,
        )
        self.assertEqual(cm1_store.count(), 1)


class TestWildcardSkipping(ImportCurrentProductsTestBase):
    """Test wildcard (*) rows are skipped."""

    def test_wildcard_products_not_in_store(self):
        call_command('import_current_products', MINI_CURRENT_CSV,
                     '--session-code', '26', stdout=StringIO())
        # "Additional Charge" and "ActEd Binder" are wildcard-only
        self.assertFalse(
            Product.objects.filter(fullname='Additional Charge').exists()
        )
        self.assertFalse(
            Product.objects.filter(fullname='ActEd Binder').exists()
        )

    def test_output_reports_skipped_count(self):
        out = StringIO()
        call_command('import_current_products', MINI_CURRENT_CSV,
                     '--session-code', '26', stdout=out)
        output = out.getvalue()
        self.assertIn('Skipped (wildcard)', output)


class TestMissingESS(ImportCurrentProductsTestBase):
    """Test rows with subjects missing from ExamSessionSubject."""

    def test_missing_subject_skipped(self):
        """CSV row with unknown subject should be skipped."""
        # Remove CB1's ESS so its rows get skipped
        self.ess_cb1.delete()
        out = StringIO()
        call_command('import_current_products', MINI_CURRENT_CSV,
                     '--session-code', '26', stdout=out)
        output = out.getvalue()
        self.assertIn('Skipped (no ESS)', output)
        # Only CM1 store products should exist (5)
        self.assertEqual(StoreProduct.objects.count(), 5)


class TestIdempotency(ImportCurrentProductsTestBase):
    """Test running twice produces no duplicates."""

    def test_second_run_no_duplicates(self):
        call_command('import_current_products', MINI_CURRENT_CSV,
                     '--session-code', '26', stdout=StringIO())
        first_counts = (
            Product.objects.count(),
            ProductProductVariation.objects.count(),
            StoreProduct.objects.count(),
        )
        call_command('import_current_products', MINI_CURRENT_CSV,
                     '--session-code', '26', stdout=StringIO())
        second_counts = (
            Product.objects.count(),
            ProductProductVariation.objects.count(),
            StoreProduct.objects.count(),
        )
        self.assertEqual(first_counts, second_counts)


class TestDryRun(ImportCurrentProductsTestBase):
    """Test --dry-run creates no records."""

    def test_dry_run_creates_nothing(self):
        call_command('import_current_products', MINI_CURRENT_CSV,
                     '--session-code', '26', '--dry-run', stdout=StringIO())
        self.assertEqual(Product.objects.count(), 0)
        self.assertEqual(ProductProductVariation.objects.count(), 0)
        self.assertEqual(StoreProduct.objects.count(), 0)


class TestInvalidSession(ImportCurrentProductsTestBase):
    """Test nonexistent session code raises error."""

    def test_invalid_session_raises(self):
        with self.assertRaises(CommandError):
            call_command('import_current_products', MINI_CURRENT_CSV,
                         '--session-code', '99X', stdout=StringIO())
