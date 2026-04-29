import io
from django.contrib.auth.models import User
from django.test import TestCase

from marking.services.csv_imports.markers import (
    MarkerCsvRow,
    parse_markers_csv,
    validate_markers_rows,
)
from userprofile.hash_utils import compute_search_hash
from userprofile.models.user_profile import UserProfile


def seed_user_with_hashed_name(username, firstname, lastname):
    """Create an auth_user (signal auto-creates UserProfile) and set its
    first_name_hash/last_name_hash so the marker resolver can find it."""
    user = User.objects.create_user(username=username)
    profile = user.userprofile
    profile.first_name_hash = compute_search_hash(firstname)
    profile.last_name_hash = compute_search_hash(lastname)
    profile.save(update_fields=['first_name_hash', 'last_name_hash'])
    return user


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
        self.user_alice = seed_user_with_hashed_name('alice', 'Alice', 'Allen')

    def test_valid_row_no_errors(self):
        row = MarkerCsvRow(row_num=2, mkref='10', firstname='Alice', lastname='Allen', initials='AA')
        errors, resolved = validate_markers_rows([row])
        self.assertEqual(errors, [], msg=[e.error_message for e in errors])
        self.assertEqual(resolved[0].user_id, self.user_alice.id)
        self.assertEqual(resolved[0].mkref_int, 10)

    def test_match_is_case_insensitive(self):
        # compute_search_hash lowercases input — verify CSV with different case still matches.
        row = MarkerCsvRow(row_num=2, mkref='10', firstname='ALICE', lastname='allen', initials='AA')
        errors, resolved = validate_markers_rows([row])
        self.assertEqual(errors, [], msg=[e.error_message for e in errors])
        self.assertEqual(resolved[0].user_id, self.user_alice.id)

    def test_zero_match_is_error(self):
        row = MarkerCsvRow(row_num=2, mkref='10', firstname='Bob', lastname='Brown', initials='BB')
        errors, resolved = validate_markers_rows([row])
        self.assertEqual(len(errors), 1)
        self.assertIn("No UserProfile matches", errors[0].error_message)

    def test_ambiguous_match_is_error(self):
        seed_user_with_hashed_name('alice2', 'Alice', 'Allen')
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
