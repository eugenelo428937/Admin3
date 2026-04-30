import io
from django.contrib.auth.models import User
from django.test import TestCase

from marking.services.csv_imports.markers import (
    MarkerCsvRow,
    parse_markers_csv,
    validate_markers_rows,
)
from staff.models import Staff
from students.models import Student
from userprofile.hash_utils import compute_search_hash


def seed_staff(username: str, firstname: str, lastname: str) -> Staff:
    """Create an auth_user, set the auto-created UserProfile's hashes,
    and link a Staff record."""
    user = User.objects.create_user(username=username)
    profile = user.userprofile
    profile.first_name_hash = compute_search_hash(firstname)
    profile.last_name_hash = compute_search_hash(lastname)
    profile.save(update_fields=['first_name_hash', 'last_name_hash'])
    return Staff.objects.create(user=user, initials=username.upper()[:3])


def seed_student(username: str, student_ref: int, student_type: str = 'M') -> Student:
    user = User.objects.create_user(username=username)
    return Student.objects.create(
        student_ref=student_ref, user=user, student_type=student_type,
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


class ValidateMarkersRowsStaffTierTests(TestCase):
    """Tier 1: staff lookup by hashed firstname+lastname."""

    def test_resolves_via_staff_when_name_matches(self):
        staff = seed_staff('alice', 'Alice', 'Allen')
        row = MarkerCsvRow(row_num=2, mkref='10', firstname='Alice', lastname='Allen', initials='AA')
        errors, resolved = validate_markers_rows([row])
        self.assertEqual(errors, [], msg=[e.error_message for e in errors])
        self.assertEqual(resolved[0].user_id, staff.user_id)

    def test_staff_match_is_case_insensitive(self):
        staff = seed_staff('alice', 'Alice', 'Allen')
        row = MarkerCsvRow(row_num=2, mkref='10', firstname='ALICE', lastname='allen', initials='AA')
        errors, resolved = validate_markers_rows([row])
        self.assertEqual(errors, [], msg=[e.error_message for e in errors])
        self.assertEqual(resolved[0].user_id, staff.user_id)

    def test_ambiguous_staff_match_is_error(self):
        seed_staff('alice1', 'Alice', 'Allen')
        seed_staff('alice2', 'Alice', 'Allen')
        row = MarkerCsvRow(row_num=2, mkref='10', firstname='Alice', lastname='Allen', initials='AA')
        errors, resolved = validate_markers_rows([row])
        self.assertEqual(len(errors), 1)
        self.assertIn('Ambiguous Staff match', errors[0].error_message)


class ValidateMarkersRowsStudentFallbackTests(TestCase):
    """Tier 2: when no Staff match, fall back to Student by mkref + student_type='M'."""

    def test_resolves_via_student_when_no_staff(self):
        student = seed_student('bob', student_ref=99, student_type='M')
        row = MarkerCsvRow(row_num=2, mkref='99', firstname='Bob', lastname='Brown', initials='BB')
        errors, resolved = validate_markers_rows([row])
        self.assertEqual(errors, [], msg=[e.error_message for e in errors])
        self.assertEqual(resolved[0].user_id, student.user_id)

    def test_student_with_wrong_type_is_not_resolved(self):
        # student exists but type='S' (regular) — should NOT match the marker fallback
        seed_student('bob', student_ref=99, student_type='S')
        row = MarkerCsvRow(row_num=2, mkref='99', firstname='Bob', lastname='Brown', initials='BB')
        errors, resolved = validate_markers_rows([row])
        self.assertEqual(len(errors), 1)
        self.assertIn("student_type='M'", errors[0].error_message)

    def test_no_staff_and_no_student_is_error(self):
        row = MarkerCsvRow(row_num=2, mkref='999', firstname='Ghost', lastname='None', initials='GN')
        errors, resolved = validate_markers_rows([row])
        self.assertEqual(len(errors), 1)
        msg = errors[0].error_message
        self.assertIn('No Staff matches', msg)
        self.assertIn("student_ref=999", msg)

    def test_staff_takes_priority_over_student(self):
        """If both a Staff and a Student match, Staff wins."""
        staff = seed_staff('alice', 'Alice', 'Allen')
        seed_student('alice_old', student_ref=10, student_type='M')
        row = MarkerCsvRow(row_num=2, mkref='10', firstname='Alice', lastname='Allen', initials='AA')
        errors, resolved = validate_markers_rows([row])
        self.assertEqual(errors, [])
        self.assertEqual(resolved[0].user_id, staff.user_id)


class ValidateMarkersRowsValidationTests(TestCase):
    def setUp(self):
        seed_staff('alice', 'Alice', 'Allen')

    def test_non_integer_mkref_is_error(self):
        # name resolves via staff, but mkref still has to be parseable
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
