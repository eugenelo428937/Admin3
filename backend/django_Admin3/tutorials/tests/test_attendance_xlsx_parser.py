"""Tests for parsing the instructor-uploaded xlsx."""
from io import BytesIO

from django.contrib.auth.models import User
from django.test import TestCase
from openpyxl import Workbook

from students.models import Student
from tutorials.models import TutorialRegistration
from tutorials.services.attendance_xlsx_parser import parse_attendance_xlsx
from tutorials.tests.factories import make_event, make_session


def _make_workbook(rows):
    """Helper: rows is list of (title, fn, ln, ref, email, company, status)."""
    wb = Workbook()
    ws = wb.active
    ws.append(['Title', 'First Name', 'Last Name', 'Student Ref', 'Email', 'Company', 'Attendance'])
    for r in rows:
        ws.append(list(r))
    buf = BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf


class ParseAttendanceXlsxTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.event = make_event(code='UT-PARSE-1')
        cls.session = make_session(event=cls.event, title='S')
        u = User.objects.create_user(username='studentP', first_name='F', last_name='L')
        cls.student = Student.objects.create(user=u)
        cls.reg = TutorialRegistration.objects.create(
            student=cls.student, tutorial_session=cls.session,
        )

    def test_parses_valid_row(self):
        f = _make_workbook([
            ('', 'F', 'L', self.student.student_ref, 'x@y.com', '', 'ATTENDED'),
        ])
        result = parse_attendance_xlsx(f, self.session)
        self.assertEqual(len(result.rows), 1)
        self.assertEqual(result.rows[0].student_ref, self.student.student_ref)
        self.assertEqual(result.rows[0].status, 'ATTENDED')
        self.assertEqual(result.skipped_blank, 0)
        self.assertEqual(result.errors, [])

    def test_skips_blank_attendance_cell(self):
        f = _make_workbook([
            ('', 'F', 'L', self.student.student_ref, '', '', ''),
        ])
        result = parse_attendance_xlsx(f, self.session)
        self.assertEqual(result.rows, [])
        self.assertEqual(result.skipped_blank, 1)

    def test_rejects_foreign_student_ref(self):
        f = _make_workbook([
            ('', 'Z', 'Z', 9999999, '', '', 'ATTENDED'),
        ])
        result = parse_attendance_xlsx(f, self.session)
        self.assertEqual(result.rows, [])
        self.assertEqual(len(result.errors), 1)
        self.assertIn('9999999', result.errors[0])

    def test_status_is_case_insensitive(self):
        f = _make_workbook([
            ('', 'F', 'L', self.student.student_ref, '', '', 'attended'),
        ])
        result = parse_attendance_xlsx(f, self.session)
        self.assertEqual(result.rows[0].status, 'ATTENDED')

    def test_rejects_invalid_status(self):
        f = _make_workbook([
            ('', 'F', 'L', self.student.student_ref, '', '', 'TARDY'),
        ])
        result = parse_attendance_xlsx(f, self.session)
        self.assertEqual(result.rows, [])
        self.assertEqual(len(result.errors), 1)

    def test_rejects_formula_in_attendance_cell(self):
        wb = Workbook()
        ws = wb.active
        ws.append(['Title', 'First Name', 'Last Name', 'Student Ref', 'Email', 'Company', 'Attendance'])
        ws.append(['', 'F', 'L', self.student.student_ref, '', '', '=A1'])
        buf = BytesIO()
        wb.save(buf); buf.seek(0)
        result = parse_attendance_xlsx(buf, self.session)
        self.assertEqual(result.rows, [])
        self.assertEqual(len(result.errors), 1)
        self.assertIn('formula', result.errors[0].lower())

    def test_exposes_ref_to_registration_id_mapping(self):
        f = _make_workbook([
            ('', 'F', 'L', self.student.student_ref, '', '', 'ATTENDED'),
        ])
        result = parse_attendance_xlsx(f, self.session)
        # The upload view uses this mapping to convert student_ref → registration_id.
        self.assertEqual(
            result.ref_to_registration_id[self.student.student_ref],
            self.reg.id,
        )
