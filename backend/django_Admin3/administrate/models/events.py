"""adm.events: thin bridge between Administrate and acted.tutorial_events.

Per the tutorial-events-as-master refactor (Phase 5, 2026-05-15), this
model carries ONLY the join key and the FK to the master row. All
event data (title, lifecycle_state, learning_mode, dates, capacity,
custom fields) lives on `acted.tutorial_events`.

The bridge exists so that:
  - Administrate webhooks can deduplicate by `external_id` without
    touching the master row's column set.
  - `adm.sessions` can FK to a row that's clearly Administrate-side.
  - Reverse lookups (Administrate id -> tutorial_events) are a single
    indexed join.

Plan: docs/superpowers/plans/2026-05-15-tutorial-events-as-master-refactor.md
"""

from django.db import models
from django.core.validators import URLValidator
from .instructors import Instructor


class Event(models.Model):
    """Bridge row: external_id + tutorial_event FK only."""

    # The Administrate event id (Relay base64). Unique because Administrate
    # never reuses ids and our dedupe relies on this being the join key.
    external_id = models.CharField(
        max_length=50, null=True, blank=True, unique=True,
    )

    # The master row carrying every event field. Cross-schema FK
    # (adm -> acted) — PostgreSQL handles natively. SET_NULL on delete
    # so deleting the master doesn't cascade-kill the bridge (which
    # may still be referenced by inbound webhook history).
    tutorial_event = models.ForeignKey(
        'tutorials.TutorialEvents',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='adm_events',
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'administrate'
        db_table = '"adm"."events"'
        ordering = ['external_id']
        verbose_name = 'Administrate Event Bridge'
        verbose_name_plural = 'Administrate Event Bridges'

    def __str__(self):
        if self.tutorial_event_id and self.tutorial_event:
            return f"adm.Event[{self.external_id}] -> {self.tutorial_event.code}"
        return f"adm.Event[{self.external_id}] (unlinked)"


class Session(models.Model):
    """Tutorial Session — individual day within a tutorial event.

    Still FKs to the (now thin) Event bridge so the Administrate id
    chain stays intact for attendance sync. The session-level data
    fields stay here for now; a future refactor may move them to
    `tutorials.TutorialSessions` parallel to the events refactor.
    """

    # Administrate Integration — opaque Administrate session ID, cached
    # lazily by the attendance-sync service on first successful lookup.
    external_id = models.CharField(
        max_length=50, null=True, blank=True, unique=True,
    )

    # Event relationship
    event = models.ForeignKey(
        Event, on_delete=models.CASCADE, related_name='sessions',
    )

    # Session Information
    title = models.CharField(max_length=255)
    day_number = models.PositiveIntegerField()  # Day 1, 2, 3, etc.

    # Classroom Schedule
    classroom_start_date = models.DateField()
    classroom_start_time = models.TimeField()
    classroom_end_date = models.DateField()
    classroom_end_time = models.TimeField()

    # Session Instructor (may differ from event primary instructor)
    session_instructor = models.ForeignKey(
        Instructor,
        on_delete=models.CASCADE,
        related_name='session_instructions',
    )

    # Session URL (for online sessions)
    session_url = models.URLField(
        max_length=500, blank=True, validators=[URLValidator()],
    )

    # Session Status
    cancelled = models.BooleanField(default=False)

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'administrate'
        db_table = '"adm"."sessions"'
        ordering = ['event', 'day_number']
        verbose_name = 'Tutorial Session'
        verbose_name_plural = 'Tutorial Sessions'
        unique_together = ['event', 'day_number']

    def __str__(self):
        # Prefer the master row's code; fall back to the bridge external_id
        # when the bridge is unlinked (legacy data).
        te = self.event.tutorial_event if self.event_id else None
        label = te.code if te else (self.event.external_id if self.event_id else '?')
        return f"{label} - Day {self.day_number} ({self.classroom_start_date})"

    @property
    def duration_hours(self):
        """Calculate the duration of the session in hours"""
        from datetime import datetime

        start_datetime = datetime.combine(
            self.classroom_start_date, self.classroom_start_time,
        )
        end_datetime = datetime.combine(
            self.classroom_end_date, self.classroom_end_time,
        )

        duration = end_datetime - start_datetime
        return duration.total_seconds() / 3600

    @property
    def is_today(self):
        """Check if this session is scheduled for today"""
        from datetime import date
        return self.classroom_start_date == date.today()

    @property
    def is_past(self):
        """Check if this session is in the past"""
        from datetime import date
        return self.classroom_start_date < date.today()

    @property
    def is_future(self):
        """Check if this session is in the future"""
        from datetime import date
        return self.classroom_start_date > date.today()
