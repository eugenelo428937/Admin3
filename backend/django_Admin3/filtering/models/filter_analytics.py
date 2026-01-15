"""FilterUsageAnalytics model for tracking filter usage.

Table: "acted"."filter_usage_analytics"
"""
from django.db import models
from django.contrib.auth.models import User


class FilterUsageAnalytics(models.Model):
    """
    Track filter usage for analytics and optimization.

    **Usage Example**::

        from filtering.models import FilterUsageAnalytics

        # Get most used filters
        popular = FilterUsageAnalytics.objects.order_by('-usage_count')[:10]
    """
    filter_configuration = models.ForeignKey(
        'filtering.FilterConfiguration',
        on_delete=models.CASCADE
    )
    filter_value = models.CharField(
        max_length=100,
        help_text='The actual filter value used'
    )
    usage_count = models.IntegerField(default=0)
    last_used = models.DateTimeField(auto_now=True)

    # Optional user tracking
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='filtering_analytics'
    )
    session_id = models.CharField(
        max_length=100,
        blank=True,
        help_text='Session ID for anonymous users'
    )

    class Meta:
        db_table = '"acted"."filter_usage_analytics"'
        unique_together = [['filter_configuration', 'filter_value']]
        indexes = [
            models.Index(fields=['filter_configuration', '-usage_count']),
            models.Index(fields=['last_used']),
        ]
        verbose_name = 'Filter Usage Analytics'
        verbose_name_plural = 'Filter Usage Analytics'

    def __str__(self):
        return f'{self.filter_configuration.display_label}: {self.filter_value} ({self.usage_count}x)'
