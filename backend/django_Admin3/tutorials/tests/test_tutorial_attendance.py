"""Tests for TutorialAttendance (Task 1.3).

One attendance row per TutorialRegistration (enforced by OneToOne).
``status`` is ATTENDED / ABSENT / LATE / OTHER. When OTHER, ``reason`` is
required (validated in ``clean()``).
"""
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.test import TestCase
from django.utils import timezone

from tutorials.models import TutorialAttendance, TutorialRegistration
from tutorials.tests import factories
from tutorials.tests.test_tutorial_choice import _make_order_item


class TutorialAttendanceTests(TestCase):
    def setUp(self):
        self.student = factories.make_student()
        self.staff = User.objects.create_user(username='staff_user', email='s@t.com')
        self.sp = factories.make_store_product()
        self.event = factories.make_event(store_product=self.sp)
        self.session = factories.make_session(event=self.event)
        self.order_item = _make_order_item(self.student, self.sp)
        self.reg = TutorialRegistration.objects.create(
            student=self.student, tutorial_session=self.session,
            order_item=self.order_item,
        )

    def test_creates_attendance_with_attended_status(self):
        a = TutorialAttendance.objects.create(
            registration=self.reg, status='ATTENDED',
            recorded_by=self.staff, recorded_at=timezone.now(),
        )
        self.assertEqual(a.status, 'ATTENDED')

    def test_other_status_requires_reason(self):
        a = TutorialAttendance(
            registration=self.reg, status='OTHER', reason='',
            recorded_by=self.staff, recorded_at=timezone.now(),
        )
        with self.assertRaises(ValidationError) as ctx:
            a.full_clean()
        self.assertIn('reason', str(ctx.exception).lower())

    def test_other_status_with_reason_validates(self):
        a = TutorialAttendance(
            registration=self.reg, status='OTHER', reason='Family emergency',
            recorded_by=self.staff, recorded_at=timezone.now(),
        )
        a.full_clean()  # should not raise

    def test_one_attendance_per_registration(self):
        TutorialAttendance.objects.create(
            registration=self.reg, status='ATTENDED',
            recorded_by=self.staff, recorded_at=timezone.now(),
        )
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                TutorialAttendance.objects.create(
                    registration=self.reg, status='ABSENT',
                    recorded_by=self.staff, recorded_at=timezone.now(),
                )
