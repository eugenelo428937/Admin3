"""
Tutorial Sessions model.

Represents individual sessions within a tutorial event (e.g., Day 1, Day 2).
Each session has its own scheduling, location, and venue details.
"""
from django.db import models
from django.core.exceptions import ValidationError


class TutorialSessions(models.Model):
    """Individual session within a tutorial event."""

    tutorial_event = models.ForeignKey(
        'tutorials.TutorialEvents',
        on_delete=models.CASCADE,
        related_name='sessions',
    )
    title = models.CharField(max_length=255)
    instructors = models.ManyToManyField(
        'tutorials.TutorialInstructor',
        blank=True,
        related_name='sessions',
        db_table='"acted"."tutorial_session_instructors"',
    )
    venue = models.ForeignKey(
        'tutorials.TutorialVenue',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sessions',
    )
    location = models.ForeignKey(
        'tutorials.TutorialLocation',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sessions',
    )
    # Nullable since 2026-05-18: the Session GraphQL webhook payload does
    # not expose dates as typed fields (sessions inherit timing context
    # from the parent Event in Administrate's model). Sessions created via
    # webhook land with NULL dates and are filled by CSV bulk import. The
    # clean() validation below short-circuits when either date is None, so
    # the start<=end invariant still holds for rows that do have dates.
    start_date = models.DateTimeField(null=True, blank=True)
    end_date = models.DateTimeField(null=True, blank=True)
    sequence = models.PositiveIntegerField()
    url = models.URLField(max_length=500, null=True, blank=True)
    # Receives the cancellation state that previously lived on
    # `adm.sessions.cancelled` (dropped in the same PR as a redundant
    # column). The Session Deleted webhook flips this to True rather than
    # hard-deleting — preserves audit history and lets attendance rows
    # keep their FK.
    cancelled = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'tutorials'
        db_table = '"acted"."tutorial_sessions"'
        unique_together = [('tutorial_event', 'sequence')]
        ordering = ['sequence']
        verbose_name = 'Tutorial Session'
        verbose_name_plural = 'Tutorial Sessions'

    def clean(self):
        """Validate business rules before save."""
        super().clean()
        if self.start_date and self.end_date:
            if self.start_date > self.end_date:
                raise ValidationError({
                    'end_date': 'End date cannot be before start date.'
                })

    def __str__(self):
        return f"{self.title} (Seq {self.sequence})"
