"""FilterGroup model for flat product filtering.

Provides flat groups for organizing product filters.

Table: "acted"."filter_groups"
"""
from django.db import models


class FilterGroup(models.Model):
    """
    Flat filter groups for product categorization.

    Products are mapped to groups via the filter_product_product_groups
    join table (one row per group a product belongs to).

    **Usage Example**::

        from filtering.models import FilterGroup

        # Get all active groups
        groups = FilterGroup.objects.filter(is_active=True)
    """
    name = models.CharField(
        max_length=100,
        help_text='Display name for the filter group'
    )
    code = models.CharField(
        max_length=100,
        unique=True,
        null=True,
        blank=True,
        help_text='Unique code identifier'
    )
    description = models.TextField(
        blank=True,
        help_text='Description of the filter group'
    )
    is_active = models.BooleanField(
        default=True,
        help_text='Whether group is available for filtering'
    )
    display_order = models.IntegerField(
        default=0,
        help_text='Sort order for display'
    )

    class Meta:
        db_table = '"acted"."filter_groups"'
        ordering = ['display_order', 'name']
        verbose_name = 'Filter Group'
        verbose_name_plural = 'Filter Groups'

    def __str__(self):
        return self.name
