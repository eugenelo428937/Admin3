"""Tests for the import_legacy_products management command."""
import shutil
import tempfile
from pathlib import Path

from django.core.management import call_command
from django.test import TestCase

from legacy.models import LegacyProduct


FIXTURES_DIR = Path(__file__).resolve().parent.parent.parent / 'catalog' / 'tests' / 'fixtures_legacy_csvs'


class ImportLegacyProductsTestBase(TestCase):
    """Each test runs against an isolated tmp directory with CSV inputs."""

    def setUp(self):
        self.tmpdir = Path(tempfile.mkdtemp())
        self.csv_dir = self.tmpdir / 'csvs'
        self.csv_dir.mkdir()

    def tearDown(self):
        shutil.rmtree(self.tmpdir)

    def copy_fixture(self, name: str):
        shutil.copy(FIXTURES_DIR / name, self.csv_dir / name)

    def run_import(self, **kwargs):
        call_command(
            'import_legacy_products',
            csv_dir=str(self.csv_dir),
            **kwargs,
        )


class TestImportLegacyProductsBasic(ImportLegacyProductsTestBase):

    def test_empty_csv_dir_imports_nothing(self):
        self.run_import()
        self.assertEqual(LegacyProduct.objects.count(), 0)

    def test_imports_all_valid_rows_from_mini_1995(self):
        """mini_1995.csv has 4 valid rows — all should be imported."""
        self.copy_fixture('mini_1995.csv')
        self.run_import()
        self.assertEqual(LegacyProduct.objects.count(), 4)

    def test_imports_all_valid_rows_from_mini_2026(self):
        """mini_2026.csv has 8 valid rows — all should be imported."""
        self.copy_fixture('mini_2026.csv')
        self.run_import()
        self.assertEqual(LegacyProduct.objects.count(), 8)

    def test_imports_multiple_csv_files(self):
        """Both fixtures combined: 4 + 8 = 12 rows."""
        self.copy_fixture('mini_1995.csv')
        self.copy_fixture('mini_2026.csv')
        self.run_import()
        self.assertEqual(LegacyProduct.objects.count(), 12)

    def test_skips_invalid_rows(self):
        """mini_invalid.csv has 4 rows: wildcard (*), col2=E, unknown
        session (95B), and unknown subject (ZZZZ).  classify_row catches
        the first two; the last two are valid per CSV-only checks.
        So 2 imported, 2 skipped."""
        self.copy_fixture('mini_invalid.csv')
        self.run_import()
        # wildcard_subject + unknown_col2 are skipped by classify_row
        # unknown_session (95B) and unknown_subject (ZZZZ) are NOT
        # caught by classify_row (those are DB-level checks from old Stage 3).
        # In the flat legacy import, we import ALL rows that pass classify_row.
        self.assertEqual(LegacyProduct.objects.count(), 2)


class TestImportLegacyProductsFields(ImportLegacyProductsTestBase):

    def test_subject_code_populated(self):
        self.copy_fixture('mini_1995.csv')
        self.run_import()
        row = LegacyProduct.objects.filter(full_code='A/PN/95').first()
        self.assertIsNotNone(row)
        self.assertEqual(row.subject_code, 'A')

    def test_delivery_format_populated(self):
        self.copy_fixture('mini_1995.csv')
        self.run_import()
        row = LegacyProduct.objects.filter(full_code='A/PN/95').first()
        self.assertEqual(row.delivery_format, 'P')

    def test_product_template_code_populated(self):
        self.copy_fixture('mini_1995.csv')
        self.run_import()
        row = LegacyProduct.objects.filter(full_code='A/PN/95').first()
        self.assertEqual(row.product_template_code, 'N')

    def test_session_code_populated(self):
        self.copy_fixture('mini_1995.csv')
        self.run_import()
        row = LegacyProduct.objects.filter(full_code='A/PN/95').first()
        self.assertEqual(row.session_code, '95')

    def test_legacy_product_name_is_raw_fullname(self):
        self.copy_fixture('mini_1995.csv')
        self.run_import()
        row = LegacyProduct.objects.filter(full_code='A/PN/95').first()
        self.assertEqual(row.legacy_product_name, 'Course Notes')

    def test_short_name_populated(self):
        self.copy_fixture('mini_1995.csv')
        self.run_import()
        row = LegacyProduct.objects.filter(full_code='A/PN/95').first()
        self.assertEqual(row.short_name, 'Course Notes')

    def test_normalized_name_uses_normalize_fullname(self):
        self.copy_fixture('mini_2026.csv')
        self.run_import()
        # mini_2026.csv row 2: "Course Notes eBook" → normalize → "Course Notes"
        ebook_row = LegacyProduct.objects.filter(
            full_code='CM1/CN/26'
        ).first()
        self.assertIsNotNone(ebook_row)
        self.assertEqual(ebook_row.legacy_product_name, 'Course Notes eBook')
        self.assertEqual(ebook_row.normalized_name, 'Course Notes')

    def test_source_file_populated(self):
        self.copy_fixture('mini_1995.csv')
        self.run_import()
        row = LegacyProduct.objects.first()
        self.assertEqual(row.source_file, 'mini_1995.csv')

    def test_source_line_populated(self):
        self.copy_fixture('mini_1995.csv')
        self.run_import()
        rows = list(LegacyProduct.objects.order_by('source_line'))
        self.assertEqual(rows[0].source_line, 1)
        self.assertEqual(rows[3].source_line, 4)


class TestImportLegacyProductsIdempotent(ImportLegacyProductsTestBase):

    def test_rerun_with_clear_reimports(self):
        """Running with --clear truncates and reimports."""
        self.copy_fixture('mini_1995.csv')
        self.run_import()
        self.assertEqual(LegacyProduct.objects.count(), 4)
        self.run_import(clear=True)
        self.assertEqual(LegacyProduct.objects.count(), 4)

    def test_rerun_without_clear_skips_if_nonempty(self):
        """Running without --clear when table is non-empty is a no-op."""
        self.copy_fixture('mini_1995.csv')
        self.run_import()
        self.assertEqual(LegacyProduct.objects.count(), 4)
        # Second run without --clear — should skip
        self.run_import()
        self.assertEqual(LegacyProduct.objects.count(), 4)
