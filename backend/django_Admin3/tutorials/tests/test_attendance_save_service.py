"""Tests for the shared attendance save service."""
from datetime import timedelta

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone

from students.models import Student
from tutorials.models import TutorialAttendance, TutorialRegistration
from tutorials.services.attendance_save_service import (
    CrossSessionRegistration, save_attendance_items,
)
from tutorials.tests.factories import make_event, make_session


class SaveAttendanceItemsTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.recorder = User.objects.create_user(username='recorder')
        cls.event = make_event(code='UT-SVC-1')
        cls.session = make_session(event=cls.event, title='S')
        u = User.objects.create_user(username='studentB', first_name='B', last_name='B')
        cls.student = Student.objects.create(user=u)
        cls.reg = TutorialRegistration.objects.create(
            student=cls.student, tutorial_session=cls.session,
        )

    def test_creates_attendance_when_missing(self):
        save_attendance_items(
            session=self.session, recorded_by=self.recorder,
            items=[{'registration_id': self.reg.id, 'status': 'ATTENDED', 'reason': ''}],
        )
        a = TutorialAttendance.objects.get(registration=self.reg)
        self.assertEqual(a.status, 'ATTENDED')
        self.assertEqual(a.recorded_by, self.recorder)

    def test_updates_attendance_when_present(self):
        TutorialAttendance.objects.create(
            registration=self.reg, status='ABSENT', recorded_at=timezone.now(),
        )
        save_attendance_items(
            session=self.session, recorded_by=self.recorder,
            items=[{'registration_id': self.reg.id, 'status': 'LATE', 'reason': ''}],
        )
        a = TutorialAttendance.objects.get(registration=self.reg)
        self.assertEqual(a.status, 'LATE')
        self.assertEqual(a.recorded_by, self.recorder)

    def test_rejects_cross_session_registration_id(self):
        other_session = make_session(event=self.event, title='Other', sequence=2)
        u2 = User.objects.create_user(username='studentC')
        s2 = Student.objects.create(user=u2)
        foreign_reg = TutorialRegistration.objects.create(
            student=s2, tutorial_session=other_session,
        )
        with self.assertRaises(CrossSessionRegistration):
            save_attendance_items(
                session=self.session, recorded_by=self.recorder,
                items=[{'registration_id': foreign_reg.id, 'status': 'ATTENDED', 'reason': ''}],
            )
