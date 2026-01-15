"""FilterPreset model for saved filter combinations.

Table: "acted"."filter_presets"
"""
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


class FilterPreset(models.Model):
    """
    Saved filter combinations for quick access.

    **Usage Example**::

        from filtering.models import FilterPreset

        # Get user's presets
        presets = FilterPreset.objects.filter(created_by=user)

        # Get public presets
        public_presets = FilterPreset.objects.filter(is_public=True)
    """
    name = models.CharField(
        max_length=100,
        help_text='Preset name'
    )
    description = models.TextField(
        blank=True,
        help_text='Description of the preset'
    )
    filter_values = models.JSONField(
        default=dict,
        help_text='Saved filter values'
    )
    is_public = models.BooleanField(
        default=False,
        help_text='Available to all users'
    )

    # Usage tracking
    usage_count = models.IntegerField(default=0)
    last_used = models.DateTimeField(null=True, blank=True)

    # Metadata
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='filtering_presets')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = '"acted"."filter_presets"'
        ordering = ['-usage_count', 'name']
        verbose_name = 'Filter Preset'
        verbose_name_plural = 'Filter Presets'

    def __str__(self):
        return self.name

    def increment_usage(self):
        """Increment usage count and update last used timestamp."""
        self.usage_count += 1
        self.last_used = timezone.now()
        self.save(update_fields=['usage_count', 'last_used'])
