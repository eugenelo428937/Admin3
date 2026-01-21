"""FilterGroup model for hierarchical product filtering.

Provides tree structure for organizing product filters.

Table: "acted"."filter_groups"
"""
from django.db import models


class FilterGroup(models.Model):
    """
    Hierarchical filter groups for product categorization.

    Supports parent-child relationships for nested filter hierarchies
    like Material > Study Text > eBook.

    **Usage Example**::

        from filtering.models import FilterGroup

        # Get root categories
        roots = FilterGroup.objects.filter(parent__isnull=True)

        # Get descendants of a group
        material_group = FilterGroup.objects.get(code='MATERIAL')
        descendants = material_group.get_descendants()
    """
    name = models.CharField(
        max_length=100,
        help_text='Display name for the filter group'
    )
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='children',
        help_text='Parent group for hierarchy'
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

    def get_full_path(self):
        """Get the full hierarchical path."""
        path = [self.name]
        parent = self.parent
        while parent:
            path.insert(0, parent.name)
            parent = parent.parent
        return ' > '.join(path)

    def get_descendants(self, include_self=True):
        """Get all descendant groups."""
        descendants = []
        if include_self:
            descendants.append(self)
        for child in self.children.all():
            descendants.extend(child.get_descendants(include_self=True))
        return descendants

    def get_level(self):
        """Get the depth level in the hierarchy."""
        level = 0
        parent = self.parent
        while parent:
            level += 1
            parent = parent.parent
        return level
