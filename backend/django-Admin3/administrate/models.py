from django.db import models
from django.contrib.postgres.fields import ArrayField

class PriceLevel(models.Model):
    external_id = models.CharField(max_length=255, unique=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    last_synced = models.DateTimeField(auto_now=True)
    
    class Meta:
        app_label = 'administrate'
        db_table = 'admpricelevels'
        verbose_name = 'Price Level'
        verbose_name_plural = 'Price Levels'
    
    def __str__(self):
        return self.name
    

class CustomField(models.Model):
    external_id = models.CharField(max_length=255, unique=True)
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
        db_table = 'admcustomfields'
        verbose_name = 'Custom Field'
        verbose_name_plural = 'Custom Fields'
        indexes = [
            models.Index(fields=['entity_type']),
            models.Index(fields=['external_id']),
        ]

    def __str__(self):
        return f"{self.label} ({self.entity_type})"
