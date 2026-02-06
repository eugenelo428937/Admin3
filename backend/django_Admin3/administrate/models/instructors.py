from django.db import models
from django.utils import timezone


class Instructor(models.Model):
    """
    Model for instructors synced from the Administrate API.
    """
    external_id = models.CharField(max_length=255, unique=True)
    legacy_id = models.CharField(max_length=255, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    tutorial_instructor = models.ForeignKey(
        'tutorials.TutorialInstructor',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='adm_instructors',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_synced = models.DateTimeField(default=timezone.now)

    class Meta:
        app_label = 'administrate'
        db_table = '"adm"."instructors"'
        ordering = ['external_id']
        verbose_name = 'Instructor'
        verbose_name_plural = 'Instructors'

    def __str__(self):
        if self.tutorial_instructor:
            return str(self.tutorial_instructor)
        return f"Instructor-{self.external_id}"

    def mark_synced(self):
        """Update the last_synced timestamp to the current time."""
        self.last_synced = timezone.now()
        self.save(update_fields=['last_synced'])

    @classmethod
    def get_active_instructors(cls):
        """Returns a queryset of all active instructors."""
        return cls.objects.filter(is_active=True)
