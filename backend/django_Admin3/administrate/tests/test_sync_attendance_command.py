"""Tests for the ``sync_attendance_to_administrate`` management command.

The command drains AttendanceSyncJob rows whose status is pending or
retry (and whose next_retry_at has elapsed) by calling
``AdministrateAttendanceSyncService.sync_job`` once per row.
"""
from __future__ import annotations

from datetime import timedelta
from io import StringIO
from unittest import mock

from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone

from tutorials.models import AttendanceSyncJob
from tutorials.tests.factories import (
    make_event, make_session, make_store_product,
)


_SERVICE = (
    'administrate.management.commands.sync_attendance_to_administrate'
    '.AdministrateAttendanceSyncService'
)


def _make_session_row(suffix='1'):
    # Use the suffix value directly (truncated to fit the 10-char column
    # cap) as a deterministic short tag. The old `hash(suffix) % 1000`
    # approach hit a duplicate-key violation on CI when Python's random
    # hash seed produced a collision across the four suffix values.
    tag = suffix[:8].upper()
    sp = make_store_product(
        variation_code=tag, cat_product_code=f'DR{tag}',
    )
    ev = make_event(code=f'DRN-EV-{tag}', store_product=sp)
    return make_session(event=ev, title=f'Session {suffix}')


class SyncAttendanceCommandTests(TestCase):
    def _run(self, **kwargs):
        out = StringIO()
        call_command(
            'sync_attendance_to_administrate', stdout=out, stderr=out, **kwargs,
        )
        return out.getvalue()

    @mock.patch(_SERVICE)
    def test_drains_only_pending_and_due_retry_jobs(self, MockSvc):
        # sent jobs should be ignored
        sent_job = AttendanceSyncJob.objects.create(
            session=_make_session_row(suffix='sent'), payload=[],
            status='sent',
        )
        # pending job — eligible
        pending_job = AttendanceSyncJob.objects.create(
            session=_make_session_row(suffix='pending'), payload=[],
            status='pending',
        )
        # retry job whose next_retry_at has elapsed — eligible
        due_retry_job = AttendanceSyncJob.objects.create(
            session=_make_session_row(suffix='due'), payload=[],
            status='retry',
            next_retry_at=timezone.now() - timedelta(minutes=5),
        )
        # retry job not yet due — ineligible
        future_retry_job = AttendanceSyncJob.objects.create(
            session=_make_session_row(suffix='future'), payload=[],
            status='retry',
            next_retry_at=timezone.now() + timedelta(minutes=30),
        )

        MockSvc.return_value.sync_job.return_value = True
        out = self._run()

        # Exactly two jobs should have been processed (pending + due_retry).
        self.assertEqual(MockSvc.return_value.sync_job.call_count, 2)
        called_ids = {
            call.args[0].id for call in MockSvc.return_value.sync_job.call_args_list
        }
        self.assertIn(pending_job.id, called_ids)
        self.assertIn(due_retry_job.id, called_ids)
        self.assertNotIn(sent_job.id, called_ids)
        self.assertNotIn(future_retry_job.id, called_ids)
        self.assertIn('processed=2', out)

    @mock.patch(_SERVICE)
    def test_failed_job_within_attempt_limit_schedules_retry(self, MockSvc):
        """A job that returns False from sync_job AND has attempts < max
        should be moved into 'retry' state with a next_retry_at in the future.
        """
        job = AttendanceSyncJob.objects.create(
            session=_make_session_row(suffix='retry-able'), payload=[],
            status='failed', attempts=1, max_attempts=5,
            # IMPORTANT: failed within attempt limit → service drains it.
            # Actually, the cron filter is status in (pending, retry); 'failed'
            # is terminal. To get a retry-able candidate we start as 'retry'.
        )
        # Re-create with status='retry' so the cron drain picks it up
        job.status = 'retry'
        job.next_retry_at = timezone.now() - timedelta(minutes=1)
        job.save()

        # sync_job returns False AND calls mark_failed internally — simulate
        # by having the mock mutate the row and return False.
        def fake_sync(j):
            j.attempts += 1
            j.error_message = 'simulated'
            j.status = 'failed'
            j.save()
            return False
        MockSvc.return_value.sync_job.side_effect = fake_sync

        self._run()

        job.refresh_from_db()
        # Command should have promoted the failed job back to 'retry'
        # because attempts (2) < max_attempts (5).
        self.assertEqual(job.status, 'retry')
        self.assertIsNotNone(job.next_retry_at)
        self.assertGreater(job.next_retry_at, timezone.now())

    @mock.patch(_SERVICE)
    def test_failed_job_at_attempt_limit_stays_failed(self, MockSvc):
        """If attempts == max_attempts after sync, the cron must NOT
        reschedule — the row stays 'failed' and an admin has to intervene.
        """
        job = AttendanceSyncJob.objects.create(
            session=_make_session_row(suffix='exhausted'), payload=[],
            status='retry', attempts=4, max_attempts=5,
            next_retry_at=timezone.now() - timedelta(minutes=1),
        )

        def fake_sync(j):
            j.attempts += 1  # 4 → 5 (hits max)
            j.status = 'failed'
            j.save()
            return False
        MockSvc.return_value.sync_job.side_effect = fake_sync

        self._run()

        job.refresh_from_db()
        self.assertEqual(job.status, 'failed')
        # No retry scheduled — next_retry_at unchanged (still in the past).
        self.assertLess(job.next_retry_at, timezone.now())

    @mock.patch(_SERVICE)
    def test_dry_run_does_not_call_service(self, MockSvc):
        AttendanceSyncJob.objects.create(
            session=_make_session_row(suffix='dry'), payload=[],
            status='pending',
        )
        out = self._run(dry_run=True)
        MockSvc.return_value.sync_job.assert_not_called()
        self.assertIn('DRY-RUN', out.upper())

    @mock.patch(_SERVICE)
    def test_limit_argument_caps_drain_count(self, MockSvc):
        for i in range(5):
            AttendanceSyncJob.objects.create(
                session=_make_session_row(suffix=f'L{i}'), payload=[],
                status='pending',
            )
        MockSvc.return_value.sync_job.return_value = True
        self._run(limit=2)
        self.assertEqual(MockSvc.return_value.sync_job.call_count, 2)
