"""Tests for export_filter_group_backfill_csv management command.

The command exports a CSV of every PPV that still needs a filter-group
assignment decision: orphans (no row) plus rows currently stranded at a
parent group (Material or Marking) that need to be moved to a leaf
child. Tutorial PPVs are excluded — already handled by
backfill_tutorial_filter_groups.
"""
import csv
import io
import tempfile
from pathlib import Path

from django.core.management import call_command
from django.test import TestCase

from catalog.products.models import (
    Product as CatalogProduct,
    ProductVariation,
    ProductProductVariation,
)
from filtering.models import FilterGroup, ProductProductGroup


_pv_seq = [0]  # mutable counter so each call gets a unique ProductVariation.code


def _mk_ppv(*, variation_type, variation_code, product_code):
    """Build a PPV. variation_code here is the *semantic* shape we want to
    show in the CSV; the underlying ProductVariation.code is uniquified
    because the DB has a unique constraint and the same shape (e.g. 'C')
    appears on many rows in production."""
    _pv_seq[0] += 1
    cp = CatalogProduct.objects.create(
        fullname=f'P-{product_code}', shortname=f'P-{product_code}',
        code=product_code, is_active=True,
    )
    pv = ProductVariation.objects.create(
        variation_type=variation_type,
        # Uniquify name; (variation_type, name) has a unique constraint
        # but the semantic code shape we want to test against goes into
        # the description field below for the asserts to find.
        name=f'{variation_code}-{_pv_seq[0]}',
        code=f'{variation_code}-{_pv_seq[0]}'[:10],
        description=variation_code,
        is_active=True,
    )
    return ProductProductVariation.objects.create(
        product=cp, product_variation=pv, is_active=True,
    )


class ExportFilterGroupBackfillCsvTests(TestCase):
    def setUp(self):
        # Hierarchy mirrors production
        self.material = FilterGroup.objects.create(
            name='Material', code='material', is_active=True,
        )
        FilterGroup.objects.create(
            name='Core Study Materials', code='core_study_materials',
            is_active=True,
        )
        FilterGroup.objects.create(
            name='Revision Materials', code='revision_materials',
            is_active=True,
        )
        self.marking = FilterGroup.objects.create(
            name='Marking', code='marking', is_active=True,
        )
        self.tutorial = FilterGroup.objects.create(
            name='Tutorial', code='tutorial', is_active=True,
        )
        self.f2f = FilterGroup.objects.create(
            name='Face-to-face', code='face_to_face',
            is_active=True,
        )

        # An eBook orphan (no row in PPG) → needs Core Study vs Revision
        self.ebook_orphan = _mk_ppv(
            variation_type='eBook', variation_code='C',
            product_code='EBORPHAN',
        )
        # A Printed orphan
        self.printed_orphan = _mk_ppv(
            variation_type='Printed', variation_code='P',
            product_code='PRORPHAN',
        )
        # A Marking orphan
        self.marking_orphan = _mk_ppv(
            variation_type='Marking', variation_code='M',
            product_code='MKORPHAN',
        )

        # A row stranded at Material PARENT (in scope for the export)
        self.material_parent_row = _mk_ppv(
            variation_type='eBook', variation_code='C',
            product_code='MATPARENT',
        )
        ProductProductGroup.objects.create(
            product_product_variation=self.material_parent_row,
            product_group=self.material,
        )

        # A row stranded at Marking PARENT
        self.marking_parent_row = _mk_ppv(
            variation_type='Marking', variation_code='M',
            product_code='MKPARENT',
        )
        ProductProductGroup.objects.create(
            product_product_variation=self.marking_parent_row,
            product_group=self.marking,
        )

        # A Tutorial PPV already correctly placed at a leaf — must NOT
        # appear in the export (it's done).
        self.tutorial_done = _mk_ppv(
            variation_type='Tutorial', variation_code='F2F_5F',
            product_code='TUTDONE',
        )
        ProductProductGroup.objects.create(
            product_product_variation=self.tutorial_done,
            product_group=self.f2f,
        )

    def _run_and_parse(self, *extra_args):
        out = io.StringIO()
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'export.csv'
            call_command(
                'export_filter_group_backfill_csv',
                '--output', str(path), *extra_args, stdout=out,
            )
            with path.open() as fh:
                rows = list(csv.DictReader(fh))
        return rows, out.getvalue()

    # ─────────────────────────────────────────────────────────────────
    def test_orphans_included(self):
        rows, _ = self._run_and_parse()
        ppv_ids = {int(r['ppv_id']) for r in rows}
        self.assertIn(self.ebook_orphan.id, ppv_ids)
        self.assertIn(self.printed_orphan.id, ppv_ids)
        self.assertIn(self.marking_orphan.id, ppv_ids)

    def test_parent_tagged_rows_included(self):
        rows, _ = self._run_and_parse()
        ppv_ids = {int(r['ppv_id']) for r in rows}
        self.assertIn(self.material_parent_row.id, ppv_ids)
        self.assertIn(self.marking_parent_row.id, ppv_ids)

    def test_correctly_tagged_tutorial_excluded(self):
        """A PPV that's already at a leaf must not show up."""
        rows, _ = self._run_and_parse()
        ppv_ids = {int(r['ppv_id']) for r in rows}
        self.assertNotIn(self.tutorial_done.id, ppv_ids)

    def test_kind_column_marks_orphan_vs_parent_tagged(self):
        rows, _ = self._run_and_parse()
        by_ppv = {int(r['ppv_id']): r for r in rows}
        self.assertEqual(by_ppv[self.ebook_orphan.id]['kind'], 'orphan')
        self.assertEqual(
            by_ppv[self.material_parent_row.id]['kind'], 'parent_tagged'
        )

    def test_target_columns_are_blank_for_business_fill_in(self):
        """The CSV is INPUT for the business team — target cols are empty."""
        rows, _ = self._run_and_parse()
        for r in rows:
            self.assertEqual(r['target_filter_group_code'], '')
            self.assertEqual(r['rationale'], '')

    def test_context_columns_are_populated(self):
        rows, _ = self._run_and_parse()
        by_ppv = {int(r['ppv_id']): r for r in rows}
        r = by_ppv[self.ebook_orphan.id]
        self.assertEqual(r['variation_type'], 'eBook')
        # The CSV's variation_code is the raw DB code (uniquified in tests
        # but plain 'C' / 'P' / 'M' in production).
        self.assertTrue(r['variation_code'].startswith('C'))
        self.assertEqual(r['product_code'], 'EBORPHAN')

    def test_current_group_filled_for_parent_tagged_blank_for_orphan(self):
        rows, _ = self._run_and_parse()
        by_ppv = {int(r['ppv_id']): r for r in rows}
        self.assertEqual(
            by_ppv[self.material_parent_row.id]['current_group_code'],
            'material',
        )
        self.assertEqual(by_ppv[self.ebook_orphan.id]['current_group_code'], '')

    def test_summary_printed_to_stdout(self):
        _, stdout_value = self._run_and_parse()
        self.assertIn('Exported', stdout_value)
        # At least the row count
        self.assertIn('5', stdout_value)  # 3 orphans + 2 parent rows
