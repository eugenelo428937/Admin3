from django.db import models

class PriceLevel(models.Model):
    external_id = models.CharField(max_length=255, unique=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    last_synced = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'adm.pricelevels'
        verbose_name = 'Price Level'
        verbose_name_plural = 'Price Levels'
    
    def __str__(self):
        return self.name


class CustomField(models.Model):
    external_id = models.CharField(max_length=255, unique=True)
    name = models.CharField(max_length=255)
    field_type = models.CharField(max_length=50)
    description = models.TextField(blank=True, null=True)
    is_required = models.BooleanField(default=False)
    is_system = models.BooleanField(default=False)
    # e.g., 'EVENT', 'CONTACT', etc.
    entity_type = models.CharField(max_length=50)
    possible_values = models.JSONField(null=True, blank=True)
    last_synced = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'adm.customfields'
        verbose_name = 'Custom Field'
        verbose_name_plural = 'Custom Fields'
        indexes = [
            models.Index(fields=['entity_type']),
        ]

    def __str__(self):
        return f"{self.name} ({self.entity_type})"
