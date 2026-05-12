"""``python manage.py sync_attendance_to_administrate``.

Drains pending and due-retry ``AttendanceSyncJob`` rows by calling
``AdministrateAttendanceSyncService.sync_job`` per row. Failed rows whose
``attempts`` have not exhausted ``max_attempts`` are rescheduled with
exponential backoff; rows that hit the attempt cap stay ``failed`` and
require ops intervention via Django admin.

Run on cron / Task Scheduler — e.g. every 5 minutes:

    */5 * * * * cd /app && python manage.py sync_attendance_to_administrate

Flags
-----
``--dry-run``   Log what would be processed; do not call the sync service.
``--limit N``   Cap the number of jobs drained in one run (default 50).
"""
from __future__ import annotations

import logging
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db.models import Q
from django.utils import timezone

from administrate.services.attendance_sync_service import (
    AdministrateAttendanceSyncService,
)
from tutorials.models import AttendanceSyncJob

logger = logging.getLogger(__name__)


# Exponential backoff: 5m, 15m, 60m, 6h, 24h. Indexed by attempts.
BACKOFF_MINUTES = [5, 15, 60, 6 * 60, 24 * 60]


class Command(BaseCommand):
    help = 'Drain AttendanceSyncJob rows, pushing each to Administrate.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run', dest='dry_run', action='store_true',
            help='Log what would be processed; do not call the sync service.',
        )
        parser.add_argument(
            '--limit', dest='limit', type=int, default=50,
            help='Maximum number of jobs to process in one run (default 50).',
        )

    def handle(self, *args, **opts):
        limit = max(1, int(opts.get('limit') or 50))
        dry_run = bool(opts.get('dry_run'))

        now = timezone.now()
        # Pending jobs are always eligible. Retry jobs only when due.
        eligible = (
            AttendanceSyncJob.objects
            .filter(
                Q(status=AttendanceSyncJob.STATUS_PENDING)
                | Q(
                    status=AttendanceSyncJob.STATUS_RETRY,
                    next_retry_at__lte=now,
                )
                | Q(
                    status=AttendanceSyncJob.STATUS_RETRY,
                    next_retry_at__isnull=True,
                )
            )
            .order_by('created_at')[:limit]
        )

        processed = 0
        succeeded = 0
        rescheduled = 0
        exhausted = 0

        service = AdministrateAttendanceSyncService()

        for job in eligible:
            if dry_run:
                self.stdout.write(
                    f'DRY-RUN would process job={job.id} '
                    f'session={job.session_id} status={job.status} '
                    f'attempts={job.attempts}'
                )
                continue

            ok = self._process_one(service, job)
            processed += 1
            if ok:
                succeeded += 1
            else:
                # service.sync_job has already called mark_failed and
                # bumped attempts. Decide whether to reschedule.
                job.refresh_from_db()
                if job.can_retry():
                    delay = self._delay_minutes(job.attempts)
                    job.schedule_retry(delay_minutes=delay)
                    rescheduled += 1
                else:
                    exhausted += 1

        self.stdout.write(self.style.SUCCESS(
            f'Done. processed={processed} succeeded={succeeded} '
            f'rescheduled={rescheduled} exhausted={exhausted} '
            f'dry_run={dry_run}'
        ))

    # ---- helpers ----

    def _process_one(self, service, job) -> bool:
        try:
            return service.sync_job(job)
        except Exception as exc:  # noqa: BLE001
            logger.exception('sync_attendance_to_administrate crashed on job %s', job.id)
            job.mark_failed(f'Command-level crash: {type(exc).__name__}: {exc}')
            return False

    def _delay_minutes(self, attempts: int) -> int:
        """Backoff lookup with a clamped index."""
        idx = max(0, min(attempts - 1, len(BACKOFF_MINUTES) - 1))
        return BACKOFF_MINUTES[idx]
