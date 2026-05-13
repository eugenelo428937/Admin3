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

    def test_empty_items_no_op(self):
        result = save_attendance_items(
            session=self.session, recorded_by=self.recorder, items=[],
        )
        self.assertEqual(result, [])
        self.assertFalse(TutorialAttendance.objects.exists())


class SaveAttendanceEnqueuesSyncJobTests(TestCase):
    """After a successful save, exactly one AttendanceSyncJob row should
    be enqueued for the session so the cron can push the change up to
    Administrate. Empty items → no job (no work to sync)."""

    @classmethod
    def setUpTestData(cls):
        cls.recorder = User.objects.create_user(username='enq_recorder')
        cls.event = make_event(code='UT-ENQ-1')
        cls.session = make_session(event=cls.event, title='Enqueue')
        u1 = User.objects.create_user(username='enq_s1')
        cls.student1 = Student.objects.create(student_ref=900, user=u1)
        cls.reg1 = TutorialRegistration.objects.create(
            student=cls.student1, tutorial_session=cls.session,
        )
        u2 = User.objects.create_user(username='enq_s2')
        cls.student2 = Student.objects.create(student_ref=901, user=u2)
        cls.reg2 = TutorialRegistration.objects.create(
            student=cls.student2, tutorial_session=cls.session,
        )

    def test_enqueues_one_pending_job_with_payload(self):
        from tutorials.models import AttendanceSyncJob
        save_attendance_items(
            session=self.session, recorded_by=self.recorder,
            items=[
                {'registration_id': self.reg1.id, 'status': 'ATTENDED', 'reason': ''},
                {'registration_id': self.reg2.id, 'status': 'ABSENT', 'reason': ''},
            ],
        )
        job = AttendanceSyncJob.objects.get()
        self.assertEqual(job.session_id, self.session.id)
        self.assertEqual(job.status, 'pending')
        # Payload should carry registration_id + student_ref + status for each item.
        by_reg = {p['registration_id']: p for p in job.payload}
        self.assertEqual(by_reg[self.reg1.id]['student_ref'], 900)
        self.assertEqual(by_reg[self.reg1.id]['status'], 'ATTENDED')
        self.assertEqual(by_reg[self.reg2.id]['student_ref'], 901)
        self.assertEqual(by_reg[self.reg2.id]['status'], 'ABSENT')

    def test_empty_items_does_not_enqueue(self):
        from tutorials.models import AttendanceSyncJob
        save_attendance_items(
            session=self.session, recorded_by=self.recorder, items=[],
        )
        self.assertEqual(AttendanceSyncJob.objects.count(), 0)
