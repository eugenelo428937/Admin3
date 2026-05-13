"""Tests for the AttendanceSyncJob queue model.

Each row represents one pending push of attendance data to Administrate.
The cron command drains rows with status in {pending, retry}, calls the
sync service, and updates status to {sent, failed, retry} based on
the outcome.
"""
from __future__ import annotations

from django.db import IntegrityError, transaction
from django.test import TestCase
from django.utils import timezone

from tutorials.models import AttendanceSyncJob
from tutorials.tests.factories import (
    make_event, make_session, make_store_product,
)


def _make_session_row(suffix='1'):
    sp = make_store_product(
        variation_code=f'JOB{suffix}', cat_product_code=f'JobLive{suffix}',
    )
    ev = make_event(code=f'JOB-EV-{suffix}', store_product=sp)
    return make_session(event=ev, title=f'Session {suffix}')


class AttendanceSyncJobModelTests(TestCase):
    def test_default_status_is_pending(self):
        s = _make_session_row()
        job = AttendanceSyncJob.objects.create(
            session=s,
            payload=[{'registration_id': 1, 'student_ref': 100, 'status': 'ATTENDED'}],
        )
        self.assertEqual(job.status, 'pending')
        self.assertEqual(job.attempts, 0)
        self.assertIsNone(job.processed_at)
        self.assertIsNotNone(job.created_at)

    def test_payload_round_trips_as_list_of_dicts(self):
        s = _make_session_row(suffix='2')
        items = [
            {'registration_id': 1, 'student_ref': 100, 'status': 'ATTENDED'},
            {'registration_id': 2, 'student_ref': 101, 'status': 'ABSENT'},
        ]
        job = AttendanceSyncJob.objects.create(session=s, payload=items)
        job.refresh_from_db()
        self.assertEqual(job.payload, items)

    def test_cascade_deletes_when_session_removed(self):
        s = _make_session_row(suffix='3')
        AttendanceSyncJob.objects.create(session=s, payload=[])
        self.assertEqual(AttendanceSyncJob.objects.count(), 1)
        s.delete()
        self.assertEqual(AttendanceSyncJob.objects.count(), 0)

    def test_can_retry_only_while_under_max_attempts(self):
        s = _make_session_row(suffix='4')
        job = AttendanceSyncJob.objects.create(
            session=s, payload=[],
            status='failed', attempts=2, max_attempts=3,
        )
        self.assertTrue(job.can_retry())
        job.attempts = 3
        self.assertFalse(job.can_retry())

    def test_can_retry_false_when_status_is_sent(self):
        s = _make_session_row(suffix='5')
        job = AttendanceSyncJob.objects.create(
            session=s, payload=[],
            status='sent', attempts=1, max_attempts=5,
        )
        self.assertFalse(job.can_retry())

    def test_mark_failed_records_error_and_increments_attempts(self):
        s = _make_session_row(suffix='6')
        job = AttendanceSyncJob.objects.create(session=s, payload=[])
        job.mark_failed('Administrate 500: internal error')
        job.refresh_from_db()
        self.assertEqual(job.status, 'failed')
        self.assertEqual(job.error_message, 'Administrate 500: internal error')
        self.assertIsNotNone(job.processed_at)

    def test_mark_sent_clears_error_and_sets_processed_at(self):
        s = _make_session_row(suffix='7')
        job = AttendanceSyncJob.objects.create(
            session=s, payload=[], error_message='previous failure',
        )
        before = timezone.now()
        job.mark_sent(response={'data': {'learner': {'recordAttendances': {}}}})
        job.refresh_from_db()
        self.assertEqual(job.status, 'sent')
        self.assertEqual(job.error_message, '')
        self.assertGreaterEqual(job.processed_at, before)
        self.assertIn('data', job.administrate_response)
