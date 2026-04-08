"""Unit tests for _legacy_import_helpers.

These tests cover pure functions: no DB access, no filesystem writes beyond
reading the fixture CSVs checked into the repo.
"""
from pathlib import Path

from django.test import SimpleTestCase

from catalog.management.commands._legacy_import_helpers import (
    LegacyRow,
    iter_legacy_csv_rows,
)

FIXTURES_DIR = Path(__file__).parent / 'fixtures_legacy_csvs'


class TestLegacyRow(SimpleTestCase):
    def test_legacyrow_fields(self):
        row = LegacyRow(
            source_file='mini_1995.csv',
            source_line=1,
            subject='A',
            col2='P',
            col3='N',
            session='95',
            full_code='A/PN/95',
            raw_fullname='Course Notes',
            raw_shortname='Course Notes',
        )
        self.assertEqual(row.subject, 'A')
        self.assertEqual(row.col2, 'P')
        self.assertEqual(row.col3, 'N')
        self.assertEqual(row.raw_fullname, 'Course Notes')


class TestIterLegacyCsvRows(SimpleTestCase):
    def test_iter_yields_legacyrow_instances(self):
        rows = list(iter_legacy_csv_rows([FIXTURES_DIR / 'mini_1995.csv']))
        self.assertEqual(len(rows), 4)
        self.assertIsInstance(rows[0], LegacyRow)

    def test_iter_populates_source_metadata(self):
        rows = list(iter_legacy_csv_rows([FIXTURES_DIR / 'mini_1995.csv']))
        self.assertEqual(rows[0].source_file, 'mini_1995.csv')
        self.assertEqual(rows[0].source_line, 1)
        self.assertEqual(rows[3].source_line, 4)

    def test_iter_strips_whitespace(self):
        rows = list(iter_legacy_csv_rows([FIXTURES_DIR / 'mini_1995.csv']))
        self.assertEqual(rows[0].subject, 'A')
        self.assertEqual(rows[0].raw_fullname, 'Course Notes')

    def test_iter_parses_all_seven_columns(self):
        rows = list(iter_legacy_csv_rows([FIXTURES_DIR / 'mini_1995.csv']))
        r = rows[3]
        self.assertEqual(r.subject, 'B')
        self.assertEqual(r.col2, 'P')
        self.assertEqual(r.col3, 'X')
        self.assertEqual(r.session, '95')
        self.assertEqual(r.full_code, 'B/PX/95')
        self.assertEqual(r.raw_fullname, 'Series X Assignments')
        self.assertEqual(r.raw_shortname, 'Assign X (Papers)')
