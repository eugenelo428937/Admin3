from django.db import models
from django.utils import timezone

class Instructor(models.Model):
    """
    Model for instructors synced from the Administrate API.
    """
    external_id = models.CharField(max_length=255, unique=True)
    first_name = models.CharField(max_length=255)
    last_name = models.CharField(max_length=255)
    email = models.EmailField(max_length=255, blank=True, null=True)
    legacy_id = models.CharField(max_length=255, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_synced = models.DateTimeField(default=timezone.now)
        
    class Meta:
        app_label = 'administrate'
        db_table = 'adm.instructors'
        ordering = ['last_name', 'first_name']
        verbose_name = 'Instructor'
        verbose_name_plural = 'Instructors'
    
    def __str__(self):
        return self.name
    
    @property
    def name(self):
        """
        Returns the full name of the instructor.
        """
        return f"{self.first_name} {self.last_name}".strip()
    
    @property
    def short_name(self):
        """
        Returns a shorter version of the name, useful for displays with limited space.
        """
        if self.first_name and self.last_name:
            return f"{self.first_name[0]}. {self.last_name}"
        return self.name
    
    def mark_synced(self):
        """
        Update the last_synced timestamp to the current time.
        """
        self.last_synced = timezone.now()
        self.save(update_fields=['last_synced'])
    
    @classmethod
    def get_active_instructors(cls):
        """
        Returns a queryset of all active instructors.
        """
        return cls.objects.filter(is_active=True)
