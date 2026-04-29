from django.contrib.auth.models import User
from django.utils import timezone

from marking.tests.fixtures import MarkingChainTestCase
from marking.models import Marker
from marking.services.csv_imports.marks26_lookups import build_lookups
from marking.services.csv_imports.marks26_parsing import Marks26Row
from marking.services.csv_imports.marks26_validators import (
    preflight_checks,
    validate_marks26_row,
)
from staff.models import Staff


def make_row(**overrides) -> Marks26Row:
    base = dict(
        row_num=2, ref='', subject='*', assign='', abbrev='*', sequence='0',
        datelogged='/  /', dateout='/  /', score='', grade='', marker='',
        rating='', voucher='0', order='', realdatein='/  /', expiry='/  /',
        staffalloc='', hubdownld='/  /', hubout='/  /', hubfeedbk='/  /',
        comments='',
    )
    base.update(overrides)
    return Marks26Row(**base)


class PreflightChecksTests(MarkingChainTestCase):
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.paper.name = 'X'
        cls.paper.sequences = 1
        cls.paper.save(update_fields=['name', 'sequences'])

    def test_missing_staff_initials_is_error(self):
        lookups = build_lookups()
        row = make_row(
            ref=str(self.student.student_ref),
            subject=self.subject.code, assign='FIX01/MX/26', abbrev='X',
            sequence='1', datelogged='10/04/2026', dateout='13/04/2026',
            staffalloc='ZZZ', marker='AAA', order='99',
        )
        errors = preflight_checks([row], lookups)
        self.assertTrue(any("Staff.initials missing: 'ZZZ'" in e for e in errors))

    def test_missing_marker_initials_is_error(self):
        lookups = build_lookups()
        row = make_row(
            ref=str(self.student.student_ref),
            subject=self.subject.code, assign='FIX01/MX/26', abbrev='X',
            sequence='1', datelogged='10/04/2026', dateout='13/04/2026',
            staffalloc='AA', marker='AAA', order='99',
        )
        errors = preflight_checks([row], lookups)
        self.assertTrue(any("Marker.initial missing: 'AAA'" in e for e in errors))


class ValidateMarks26RowTests(MarkingChainTestCase):
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()

        # Marker + Staff for grading-path tests
        marker_user = User.objects.create_user(
            username='vm1', first_name='V', last_name='Marker',
        )
        cls.marker = Marker.objects.create(user=marker_user, initial='MM')
        staff_user = User.objects.create_user(
            username='vs1', first_name='V', last_name='Staff',
        )
        cls.staff = Staff.objects.create(user=staff_user, initials='AA')

        cls.paper.name = 'X'
        cls.paper.sequences = 1
        cls.paper.save(update_fields=['name', 'sequences'])

        # Voucher OrderItem at orderno '1490175' (matches voucher rows)
        from orders.models.order_item import OrderItem
        OrderItem.objects.create(
            order=cls.fixture_order, purchasable=cls.mv_purchasable,
            quantity=1, metadata={'orderno': '1490175'},
        )

    def test_voucher_row_valid_no_redemption(self):
        lookups = build_lookups()
        row = make_row(
            ref=str(self.student.student_ref),
            assign='*/MV/22', voucher='123', order='1490175',
            expiry='08/10/2025',
        )
        errors = validate_marks26_row(row, lookups)
        self.assertEqual(errors, [], msg=[e.error_message for e in errors])

    def test_unknown_student_ref_is_error(self):
        lookups = build_lookups()
        row = make_row(ref='99999', assign='*/MV/22', voucher='1', order='1490175', expiry='01/01/2030')
        errors = validate_marks26_row(row, lookups)
        self.assertTrue(any('student_ref' in e.error_message for e in errors))

    def test_orphan_grading_is_error(self):
        lookups = build_lookups()
        row = make_row(
            ref=str(self.student.student_ref),
            subject=self.subject.code, assign='FIX01/MX/26', abbrev='X', sequence='1',
            datelogged='/  /',
            dateout='10/04/2026',
            staffalloc='AA', marker='MM', order='1',
        )
        errors = validate_marks26_row(row, lookups)
        self.assertTrue(any('orphan grading' in e.error_message.lower() for e in errors))

    def test_orphan_feedback_is_error(self):
        lookups = build_lookups()
        row = make_row(
            ref=str(self.student.student_ref),
            subject=self.subject.code, assign='FIX01/MX/26', abbrev='X', sequence='1',
            datelogged='10/04/2026', dateout='/  /',
            hubfeedbk='15/04/2026',
            order='1',
        )
        errors = validate_marks26_row(row, lookups)
        self.assertTrue(any('orphan feedback' in e.error_message.lower() for e in errors))

    def test_invalid_grade_is_error(self):
        lookups = build_lookups()
        row = make_row(
            ref=str(self.student.student_ref),
            subject=self.subject.code, assign='FIX01/MX/26', abbrev='X', sequence='1',
            datelogged='10/04/2026', dateout='13/04/2026',
            staffalloc='AA', marker='MM', grade='Z',
            order='1',
        )
        errors = validate_marks26_row(row, lookups)
        self.assertTrue(any('grade' in e.error_message and 'A,B,C,D' in e.error_message for e in errors))

    def test_invalid_rating_is_error(self):
        lookups = build_lookups()
        row = make_row(
            ref=str(self.student.student_ref),
            subject=self.subject.code, assign='FIX01/MX/26', abbrev='X', sequence='1',
            datelogged='10/04/2026', dateout='13/04/2026',
            staffalloc='AA', marker='MM',
            hubfeedbk='15/04/2026', rating='Z',
            order='1',
        )
        errors = validate_marks26_row(row, lookups)
        self.assertTrue(any('rating' in e.error_message and 'E,G,A,P' in e.error_message for e in errors))


class PreflightMissingMVPurchasableTests(MarkingChainTestCase):
    """Verify the MV-purchasable preflight check fails when it's missing.

    Cannot delete the Purchasable from the DB (PROTECTed by OrderItem fixture);
    instead, simulate absence by clearing the looked-up reference.
    """

    def test_missing_mv_purchasable_is_error(self):
        lookups = build_lookups()
        lookups.mv_purchasable = None
        row = make_row(assign='*/MV/22', voucher='1', order='42', expiry='01/01/2030')
        errors = preflight_checks([row], lookups)
        self.assertTrue(any("MV" in e and "does not exist" in e for e in errors))
