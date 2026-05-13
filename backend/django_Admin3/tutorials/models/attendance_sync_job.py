"""Queue model for pushing attendance data to Administrate.

Each row represents one batched ``recordAttendances`` mutation that the
``sync_attendance_to_administrate`` cron command will drain. Failures are
retried with backoff up to ``max_attempts`` times; successes are kept
for auditing.

Why a separate table (not EmailQueue)
-------------------------------------
``EmailQueue`` is shaped around recipient lists + rendered templates;
this queue is shaped around GraphQL payloads + retry semantics tied to
a specific tutorial session. Reusing EmailQueue would couple two
unrelated concerns and break its admin/list views. The two pipelines
do share the same retry pattern, so this model intentionally mirrors
``EmailQueue``'s status/attempts/next_retry_at fields.
"""
from __future__ import annotations

from django.db import models
from django.utils import timezone


class AttendanceSyncJob(models.Model):
    STATUS_PENDING = 'pending'
    STATUS_PROCESSING = 'processing'
    STATUS_SENT = 'sent'
    STATUS_FAILED = 'failed'
    STATUS_RETRY = 'retry'
    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending'),
        (STATUS_PROCESSING, 'Processing'),
        (STATUS_SENT, 'Sent'),
        (STATUS_FAILED, 'Failed'),
        (STATUS_RETRY, 'Retry Scheduled'),
    ]

    session = models.ForeignKey(
        'tutorials.TutorialSessions',
        on_delete=models.CASCADE,
        related_name='attendance_sync_jobs',
    )
    # List of {registration_id, student_ref, status, [attended]} dicts.
    # `status` is the local TutorialAttendance status; the service maps
    # it to Administrate's boolean `attended` at send time.
    payload = models.JSONField(default=list)

    status = models.CharField(
        max_length=16, choices=STATUS_CHOICES, default=STATUS_PENDING,
    )
    attempts = models.PositiveIntegerField(default=0)
    max_attempts = models.PositiveIntegerField(default=5)

    error_message = models.TextField(blank=True, default='')
    administrate_response = models.JSONField(
        default=dict, blank=True,
        help_text='Most recent raw GraphQL response (data + errors).',
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    next_retry_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        app_label = 'tutorials'
        db_table = '"acted"."attendance_sync_jobs"'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'next_retry_at']),
            models.Index(fields=['session', 'status']),
        ]
        verbose_name = 'Attendance Sync Job'
        verbose_name_plural = 'Attendance Sync Jobs'

    def __str__(self) -> str:
        return f'AttendanceSyncJob(session={self.session_id}, {self.status})'

    def can_retry(self) -> bool:
        """Job is eligible for another send attempt."""
        return (
            self.status in (self.STATUS_FAILED, self.STATUS_RETRY)
            and self.attempts < self.max_attempts
        )

    def mark_failed(self, error_message: str, *, response=None) -> None:
        """Record a failure: bump attempts, set ``failed`` status.

        Use :py:meth:`schedule_retry` instead when ``can_retry()`` is true
        and you want the cron to pick this row up again later. Keeping the
        two transitions separate mirrors ``EmailQueue`` and avoids
        overloading one method with policy decisions.
        """
        self.error_message = error_message or ''
        if response is not None:
            self.administrate_response = response
        self.attempts = (self.attempts or 0) + 1
        self.processed_at = timezone.now()
        self.status = self.STATUS_FAILED
        self.save(update_fields=[
            'status', 'attempts', 'error_message',
            'administrate_response', 'processed_at',
        ])

    def schedule_retry(self, delay_minutes: int = 5) -> None:
        """Push this job back into the queue with a deferred next_retry_at."""
        from datetime import timedelta
        self.status = self.STATUS_RETRY
        self.next_retry_at = timezone.now() + timedelta(minutes=delay_minutes)
        self.save(update_fields=['status', 'next_retry_at'])

    def mark_sent(self, response: dict | None = None) -> None:
        """Transition to sent and clear any prior error."""
        self.status = self.STATUS_SENT
        self.error_message = ''
        if response is not None:
            self.administrate_response = response
        self.processed_at = timezone.now()
        self.save(update_fields=[
            'status', 'error_message', 'administrate_response', 'processed_at',
        ])
