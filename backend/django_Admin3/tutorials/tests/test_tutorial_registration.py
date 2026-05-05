"""Tests for TutorialRegistration (Task 1.2).

The session-level enrolment record. Owned exclusively by the CSV sync
importer; never written by checkout. Soft-deleted via ``is_active=False``.
A partial unique index allows multiple inactive history rows but only one
active row per (student, session).
"""
from django.db import IntegrityError, transaction
from django.test import TestCase
from django.utils import timezone

from tutorials.models import TutorialRegistration
from tutorials.tests import factories
from tutorials.tests.test_tutorial_choice import _make_order_item


class TutorialRegistrationTests(TestCase):
    def setUp(self):
        self.student = factories.make_student()
        self.sp = factories.make_store_product()
        self.event = factories.make_event(store_product=self.sp)
        self.session = factories.make_session(event=self.event)
        self.order_item = _make_order_item(self.student, self.sp)

    def test_creates_registration_active_by_default(self):
        reg = TutorialRegistration.objects.create(
            student=self.student, tutorial_session=self.session,
            order_item=self.order_item,
        )
        self.assertTrue(reg.is_active)
        self.assertIsNone(reg.deactivated_at)

    def test_default_manager_excludes_inactive(self):
        reg = TutorialRegistration.objects.create(
            student=self.student, tutorial_session=self.session,
            order_item=self.order_item,
        )
        reg.is_active = False
        reg.deactivated_at = timezone.now()
        reg.save()
        self.assertEqual(TutorialRegistration.objects.count(), 0)
        self.assertEqual(TutorialRegistration.objects_all.count(), 1)

    def test_partial_unique_active_per_student_session(self):
        TutorialRegistration.objects.create(
            student=self.student, tutorial_session=self.session,
            order_item=self.order_item,
        )
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                TutorialRegistration.objects.create(
                    student=self.student, tutorial_session=self.session,
                    order_item=self.order_item,
                )

    def test_inactive_row_does_not_block_new_active_row(self):
        old = TutorialRegistration.objects.create(
            student=self.student, tutorial_session=self.session,
            order_item=self.order_item,
        )
        old.is_active = False
        old.deactivated_at = timezone.now()
        old.save()
        new = TutorialRegistration.objects.create(
            student=self.student, tutorial_session=self.session,
            order_item=self.order_item,
        )
        self.assertNotEqual(old.pk, new.pk)
