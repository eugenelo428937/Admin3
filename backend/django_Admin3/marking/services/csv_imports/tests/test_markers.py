import io
from django.contrib.auth.models import User
from django.test import TestCase

from marking.services.csv_imports.markers import (
    MarkerCsvRow,
    parse_markers_csv,
    validate_markers_rows,
)


class ParseMarkersCsvTests(TestCase):
    def test_parses_header_and_rows(self):
        content = (
            'mkref,firstname,lastname,initials\n'
            '38,David,Wilmot,DCW\n'
            '62,"Philip","Webb","PDW"\n'
        )
        rows = parse_markers_csv(io.StringIO(content))
        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[0], MarkerCsvRow(
            row_num=2, mkref='38', firstname='David', lastname='Wilmot', initials='DCW',
        ))
        self.assertEqual(rows[1].firstname, 'Philip')

    def test_skips_blank_lines(self):
        content = (
            'mkref,firstname,lastname,initials\n'
            '\n'
            '1,A,B,AB\n'
        )
        rows = parse_markers_csv(io.StringIO(content))
        self.assertEqual(len(rows), 1)


class ValidateMarkersRowsTests(TestCase):
    def setUp(self):
        self.user_alice = User.objects.create_user(
            username='alice', first_name='Alice', last_name='Allen',
        )

    def test_valid_row_no_errors(self):
        row = MarkerCsvRow(row_num=2, mkref='10', firstname='Alice', lastname='Allen', initials='AA')
        errors, resolved = validate_markers_rows([row])
        self.assertEqual(errors, [])
        self.assertEqual(resolved[0].user_id, self.user_alice.id)
        self.assertEqual(resolved[0].mkref_int, 10)

    def test_zero_match_is_error(self):
        row = MarkerCsvRow(row_num=2, mkref='10', firstname='Bob', lastname='Brown', initials='BB')
        errors, resolved = validate_markers_rows([row])
        self.assertEqual(len(errors), 1)
        self.assertIn("No auth_user matches", errors[0].error_message)

    def test_ambiguous_match_is_error(self):
        User.objects.create_user(username='alice2', first_name='Alice', last_name='Allen')
        row = MarkerCsvRow(row_num=2, mkref='10', firstname='Alice', lastname='Allen', initials='AA')
        errors, resolved = validate_markers_rows([row])
        self.assertEqual(len(errors), 1)
        self.assertIn("Ambiguous match", errors[0].error_message)

    def test_non_integer_mkref_is_error(self):
        row = MarkerCsvRow(row_num=2, mkref='not-a-number', firstname='Alice', lastname='Allen', initials='AA')
        errors, resolved = validate_markers_rows([row])
        self.assertTrue(any('mkref' in e.error_message for e in errors))

    def test_initials_too_long_is_error(self):
        row = MarkerCsvRow(
            row_num=2, mkref='10', firstname='Alice', lastname='Allen',
            initials='X' * 11,
        )
        errors, resolved = validate_markers_rows([row])
        self.assertTrue(any('initials' in e.error_message for e in errors))
