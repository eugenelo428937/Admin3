from django.db import models
from administrate.models import Location

class Venue(models.Model):
    """
    Model representing venues synchronized from Administrate API
    """
    external_id = models.CharField(max_length=255, unique=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    location = models.ForeignKey(
        Location, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        to_field='external_id',
        related_name='venues'
    )
    
    # Tracking fields
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name
        
    class Meta:
        app_label = 'administrate'
        db_table = '"adm"."venues"'
        verbose_name = 'Venue'
        verbose_name_plural = 'Venues'
