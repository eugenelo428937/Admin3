"""Tests for the public attendance endpoints (no-auth, signed-URL gated)."""
from datetime import timedelta
from unittest import mock

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from staff.models import Staff
from students.models import Student
from tutorials.models import (
    TutorialAttendance, TutorialAttendanceLinkAccess, TutorialInstructor,
    TutorialRegistration,
)
from tutorials.services.attendance_link import AttendanceLinkSigner
from tutorials.tests.factories import make_event, make_session


class PublicAttendanceViewsTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.event = make_event(code='UT-PUB-1')
        cls.session = make_session(
            event=cls.event, title='Pub Session',
            sequence=1,
        )
        # Force start_date into the past so attendance is enabled.
        cls.session.start_date = timezone.now() - timedelta(hours=1)
        cls.session.end_date = timezone.now() + timedelta(hours=1)
        cls.session.save(update_fields=['start_date', 'end_date'])

        u = User.objects.create_user(
            username='ins', email='ins@example.com',
            first_name='In', last_name='Str',
        )
        cls.staff = Staff.objects.create(user=u)
        cls.instructor = TutorialInstructor.objects.create(staff=cls.staff)
        cls.session.instructors.add(cls.instructor)

        su = User.objects.create_user(username='stu', first_name='St', last_name='U')
        cls.student = Student.objects.create(user=su)
        cls.reg = TutorialRegistration.objects.create(
            student=cls.student, tutorial_session=cls.session,
        )

    def setUp(self):
        self.client = APIClient()
        self.signer = AttendanceLinkSigner()
        self.token, _ = self.signer.sign(self.session.id, self.instructor.id)

    def _url(self, token=None):
        return f'/api/tutorials/public/attendance/{token or self.token}/'

    def test_get_with_valid_token_returns_payload(self):
        resp = self.client.get(self._url())
        self.assertEqual(resp.status_code, 200, resp.content)
        body = resp.json()
        self.assertEqual(body['session']['id'], self.session.id)
        self.assertEqual(body['instructor']['name'], str(self.instructor))
        self.assertEqual(len(body['registrations']), 1)

    def test_get_writes_view_audit_row(self):
        self.client.get(self._url())
        rows = TutorialAttendanceLinkAccess.objects.filter(action='view')
        self.assertEqual(rows.count(), 1)
        self.assertEqual(rows.first().session_id, self.session.id)

    def test_get_with_expired_token_returns_410(self):
        with mock.patch.object(AttendanceLinkSigner, 'MAX_AGE', 0):
            resp = self.client.get(self._url())
        self.assertEqual(resp.status_code, 410)
        self.assertEqual(resp.json()['code'], 'token_expired')

    def test_get_with_tampered_token_returns_400(self):
        tampered = self.token[:-2] + ('AA' if self.token[-2:] != 'AA' else 'BB')
        resp = self.client.get(self._url(tampered))
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.json()['code'], 'invalid_token')

    def test_post_save_writes_attendance_with_instructor_user_as_recorder(self):
        resp = self.client.post(
            self._url(),
            data={'items': [{'registration_id': self.reg.id, 'status': 'ATTENDED', 'reason': ''}]},
            format='json',
        )
        self.assertEqual(resp.status_code, 200, resp.content)
        att = TutorialAttendance.objects.get(registration=self.reg)
        self.assertEqual(att.status, 'ATTENDED')
        self.assertEqual(att.recorded_by, self.staff.user)

    def test_post_rejects_cross_session_registration(self):
        other = make_session(event=self.event, title='Other', sequence=2)
        ou = User.objects.create_user(username='other_stu')
        os = Student.objects.create(user=ou)
        foreign = TutorialRegistration.objects.create(student=os, tutorial_session=other)
        resp = self.client.post(
            self._url(),
            data={'items': [{'registration_id': foreign.id, 'status': 'ATTENDED', 'reason': ''}]},
            format='json',
        )
        self.assertEqual(resp.status_code, 400)

    def test_post_save_writes_save_audit_row(self):
        self.client.post(
            self._url(),
            data={'items': [{'registration_id': self.reg.id, 'status': 'ATTENDED', 'reason': ''}]},
            format='json',
        )
        self.assertTrue(TutorialAttendanceLinkAccess.objects.filter(action='save').exists())


class PublicAttendanceUploadTests(TestCase):
    """Tests for POST /api/tutorials/public/attendance/<token>/upload-xlsx/."""

    @classmethod
    def setUpTestData(cls):
        cls.event = make_event(code='UT-UPL-1')
        cls.session = make_session(event=cls.event, title='Up Session', sequence=1)
        cls.session.start_date = timezone.now() - timedelta(hours=1)
        cls.session.end_date = timezone.now() + timedelta(hours=1)
        cls.session.save(update_fields=['start_date', 'end_date'])

        u = User.objects.create_user(
            username='upins', email='upins@example.com',
            first_name='Up', last_name='In',
        )
        cls.staff = Staff.objects.create(user=u)
        cls.instructor = TutorialInstructor.objects.create(staff=cls.staff)
        cls.session.instructors.add(cls.instructor)

        su = User.objects.create_user(username='upstu', first_name='Up', last_name='Stu')
        cls.student = Student.objects.create(user=su)
        cls.reg = TutorialRegistration.objects.create(
            student=cls.student, tutorial_session=cls.session,
        )

    def setUp(self):
        self.client = APIClient()
        signer = AttendanceLinkSigner()
        self.token, _ = signer.sign(self.session.id, self.instructor.id)

    def _xlsx(self, rows):
        from io import BytesIO
        from openpyxl import Workbook
        wb = Workbook()
        ws = wb.active
        ws.append([
            'Title', 'First Name', 'Last Name', 'Student Ref', 'Email', 'Company', 'Attendance',
        ])
        for r in rows:
            ws.append(list(r))
        buf = BytesIO()
        wb.save(buf)
        buf.seek(0)
        buf.name = 'attendance.xlsx'
        return buf

    def _url(self):
        return f'/api/tutorials/public/attendance/{self.token}/upload-xlsx/'

    def test_successful_upload_creates_attendance(self):
        xlsx = self._xlsx([
            ('', 'Up', 'Stu', self.student.student_ref, '', '', 'ATTENDED'),
        ])
        resp = self.client.post(self._url(), data={'file': xlsx}, format='multipart')
        self.assertEqual(resp.status_code, 200, resp.content)
        self.assertEqual(
            TutorialAttendance.objects.get(registration=self.reg).status,
            'ATTENDED',
        )
        body = resp.json()
        self.assertEqual(body['upload_summary']['rows_applied'], 1)
        self.assertEqual(body['upload_summary']['skipped_blank'], 0)
        self.assertEqual(body['upload_summary']['errors'], [])

    def test_skipped_blank_rows_reported_not_failed(self):
        xlsx = self._xlsx([
            ('', 'Up', 'Stu', self.student.student_ref, '', '', ''),
        ])
        resp = self.client.post(self._url(), data={'file': xlsx}, format='multipart')
        self.assertEqual(resp.status_code, 200, resp.content)
        body = resp.json()
        self.assertEqual(body['upload_summary']['rows_applied'], 0)
        self.assertEqual(body['upload_summary']['skipped_blank'], 1)

    def test_foreign_student_ref_surfaces_as_row_error(self):
        xlsx = self._xlsx([
            ('', 'X', 'Y', 9999999, '', '', 'ATTENDED'),
        ])
        resp = self.client.post(self._url(), data={'file': xlsx}, format='multipart')
        self.assertEqual(resp.status_code, 200, resp.content)
        body = resp.json()
        self.assertEqual(body['upload_summary']['rows_applied'], 0)
        self.assertEqual(len(body['upload_summary']['errors']), 1)

    def test_oversized_returns_413(self):
        from io import BytesIO
        big = BytesIO(b'\x00' * (3 * 1024 * 1024))
        big.name = 'big.xlsx'
        resp = self.client.post(self._url(), data={'file': big}, format='multipart')
        self.assertEqual(resp.status_code, 413)

    def test_wrong_mime_returns_415(self):
        from io import BytesIO
        not_xlsx = BytesIO(b'hello world')
        not_xlsx.name = 'fake.xlsx'
        resp = self.client.post(self._url(), data={'file': not_xlsx}, format='multipart')
        self.assertIn(resp.status_code, (400, 415))

    def test_upload_writes_audit_row(self):
        xlsx = self._xlsx([
            ('', 'Up', 'Stu', self.student.student_ref, '', '', 'ATTENDED'),
        ])
        self.client.post(self._url(), data={'file': xlsx}, format='multipart')
        rows = TutorialAttendanceLinkAccess.objects.filter(action='upload')
        self.assertEqual(rows.count(), 1)

    def test_expired_token_returns_410(self):
        xlsx = self._xlsx([
            ('', 'Up', 'Stu', self.student.student_ref, '', '', 'ATTENDED'),
        ])
        with mock.patch.object(AttendanceLinkSigner, 'MAX_AGE', 0):
            resp = self.client.post(
                self._url(), data={'file': xlsx}, format='multipart',
            )
        self.assertEqual(resp.status_code, 410)
