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
    location = models.CharField(max_length=255)
    venue = models.CharField(max_length=255)
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    sequence = models.PositiveIntegerField()
    url = models.URLField(max_length=500, null=True, blank=True)
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
