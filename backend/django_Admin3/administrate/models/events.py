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
    """adm.sessions: thin bridge between Administrate and acted.tutorial_sessions.

    Per the session+learner webhook expansion (2026-05-18), this model
    carries ONLY the join key and the FK to the master row. All session
    data (title, sequence, dates, instructors, url, cancelled) lives on
    `acted.tutorial_sessions`. Mirrors the `adm.Event` thin-bridge
    refactor (PR #120, 2026-05-15).

    The bridge exists so that:
      - Administrate `Session Created/Updated/Deleted` webhooks can
        deduplicate by `external_id` without touching the master's
        column set.
      - Attendance sync can hop directly from a tutorial session to its
        Administrate id without going through the parent event.
    """

    # Administrate Integration — opaque Administrate session ID, cached
    # lazily by the attendance-sync service on first successful lookup
    # OR written eagerly by the Session Created webhook handler.
    external_id = models.CharField(
        max_length=50, null=True, blank=True, unique=True,
    )

    # The master row carrying every session field. Cross-schema FK
    # (adm -> acted). SET_NULL on delete so deleting the master row
    # doesn't cascade-kill the bridge (which may still be referenced
    # by inbound webhook receipt history in `adm.webhook_inbox`).
    tutorial_session = models.ForeignKey(
        'tutorials.TutorialSessions',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='adm_sessions',
    )

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'administrate'
        db_table = '"adm"."sessions"'
        ordering = ['external_id']
        verbose_name = 'Administrate Session Bridge'
        verbose_name_plural = 'Administrate Session Bridges'

    def __str__(self):
        if self.tutorial_session_id and self.tutorial_session:
            return (
                f"adm.Session[{self.external_id}] -> "
                f"{self.tutorial_session.title} (seq {self.tutorial_session.sequence})"
            )
        return f"adm.Session[{self.external_id}] (unlinked)"
