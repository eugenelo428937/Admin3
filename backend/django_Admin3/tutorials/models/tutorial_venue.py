"""
TutorialVenue model.

A specific venue within a location (e.g., "Conference Room A" within "London").
"""
from django.db import models


class TutorialVenue(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    location = models.ForeignKey(
        'tutorials.TutorialLocation',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='venues',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'tutorials'
        db_table = '"acted"."tutorial_venues"'
        ordering = ['name']
        verbose_name = 'Tutorial Venue'
        verbose_name_plural = 'Tutorial Venues'

    def __str__(self):
        return self.name
