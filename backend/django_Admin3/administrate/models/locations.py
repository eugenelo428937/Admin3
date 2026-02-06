from django.db import models


class Location(models.Model):
    external_id = models.CharField(max_length=255, unique=True)
    legacy_id = models.CharField(max_length=255, null=True, blank=True)
    tutorial_location = models.ForeignKey(
        'tutorials.TutorialLocation',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='adm_locations',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'administrate'
        db_table = '"adm"."locations"'
        ordering = ['external_id']
        verbose_name = 'Location'
        verbose_name_plural = 'Locations'

    def __str__(self):
        if self.tutorial_location:
            return str(self.tutorial_location)
        return f"Location-{self.external_id}"
