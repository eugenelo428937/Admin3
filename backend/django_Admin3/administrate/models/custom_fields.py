from django.db import models
from django.contrib.postgres.fields import ArrayField

class CustomField(models.Model):
    external_id = models.CharField(max_length=255)
    label = models.CharField(max_length=255)
    field_type = models.CharField(max_length=50)
    description = models.TextField(blank=True, null=True)
    is_required = models.BooleanField(default=False)
    roles = ArrayField(
        models.CharField(max_length=255),
        blank=True,
        null=True,
        default=list
    )
    entity_type = models.CharField(max_length=50)
    last_synced = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'administrate'
        db_table = 'adm.custom_fields'
        verbose_name = 'Custom Field'
        verbose_name_plural = 'Custom Fields'
        indexes = [
            models.Index(fields=['entity_type'],
                         name='custom_field_entity_idx'),
        ]

    def __str__(self):
        return f"{self.label} ({self.entity_type})"
