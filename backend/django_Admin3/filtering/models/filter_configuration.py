"""FilterConfiguration model for dynamic filter setup.

Defines available filters with UI configuration and behavior.

Table: "acted"."filter_configurations"
"""
from django.db import models
from django.contrib.auth.models import User


class FilterConfiguration(models.Model):
    """
    Enhanced filter configuration for dynamic UI rendering.

    Defines filter behavior, UI component type, and validation rules.

    **Usage Example**::

        from filtering.models import FilterConfiguration

        # Get active filters ordered for display
        filters = FilterConfiguration.objects.filter(is_active=True).order_by('display_order')

        for f in filters:
            print(f.display_label, f.ui_component)
    """
    FILTER_TYPE_CHOICES = [
        ('subject', 'Subject'),
        ('filter_group', 'Filter Group'),
        ('product_variation', 'Product Variation'),
        ('tutorial_format', 'Tutorial Format'),
        ('bundle', 'Bundle'),
        ('custom_field', 'Custom Field'),
        ('computed', 'Computed Filter'),
        ('date_range', 'Date Range'),
        ('numeric_range', 'Numeric Range'),
    ]

    UI_COMPONENT_CHOICES = [
        ('multi_select', 'Multi-Select Checkboxes'),
        ('single_select', 'Single Select Dropdown'),
        ('checkbox', 'Single Checkbox'),
        ('radio_buttons', 'Radio Buttons'),
        ('toggle_buttons', 'Toggle Buttons'),
        ('search_select', 'Searchable Select'),
        ('tree_select', 'Hierarchical Tree Select'),
        ('range_slider', 'Range Slider'),
        ('date_picker', 'Date Picker'),
        ('tag_input', 'Tag Input'),
    ]

    # Basic Configuration
    name = models.CharField(
        max_length=100,
        unique=True,
        help_text='Internal name for the filter'
    )
    display_label = models.CharField(
        max_length=100,
        help_text='User-facing label'
    )
    description = models.TextField(
        blank=True,
        help_text='Description for admin users'
    )
    filter_type = models.CharField(
        max_length=32,
        choices=FILTER_TYPE_CHOICES,
        help_text='Type of filter'
    )
    filter_key = models.CharField(
        max_length=50,
        help_text='Key used in API requests'
    )

    # UI Configuration
    ui_component = models.CharField(
        max_length=32,
        choices=UI_COMPONENT_CHOICES,
        default='multi_select',
        help_text='UI component type'
    )
    display_order = models.IntegerField(
        default=0,
        help_text='Order in which filters appear'
    )

    # Behavior Configuration
    is_active = models.BooleanField(default=True)
    is_collapsible = models.BooleanField(default=True)
    is_expanded_by_default = models.BooleanField(default=False)
    is_required = models.BooleanField(default=False)
    allow_multiple = models.BooleanField(default=True)

    # Advanced Configuration (JSON fields)
    ui_config = models.JSONField(
        default=dict,
        blank=True,
        help_text='UI-specific configuration'
    )
    validation_rules = models.JSONField(
        default=dict,
        blank=True,
        help_text='Validation rules'
    )
    dependency_rules = models.JSONField(
        default=dict,
        blank=True,
        help_text='Dependencies on other filters'
    )

    # Filter Groups (Many-to-Many relationship)
    filter_groups = models.ManyToManyField(
        'filtering.FilterGroup',
        through='filtering.FilterConfigurationGroup',
        blank=True
    )

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='filtering_configurations'
    )

    class Meta:
        db_table = '"acted"."filter_configurations"'
        ordering = ['display_order', 'display_label']
        verbose_name = 'Filter Configuration'
        verbose_name_plural = 'Filter Configurations'

    def __str__(self):
        return f'{self.display_label} ({self.filter_type})'

    def get_ui_config(self):
        """Get UI configuration with defaults."""
        defaults = {
            'show_count': True,
            'show_select_all': False,
            'placeholder': f'Select {self.display_label.lower()}...',
            'search_placeholder': f'Search {self.display_label.lower()}...',
            'collapsible': self.is_collapsible,
            'expanded': self.is_expanded_by_default,
        }
        config = defaults.copy()
        config.update(self.ui_config)
        return config

    def get_filter_groups_tree(self):
        """Get associated filter groups as a tree structure."""
        groups = self.filter_groups.all().select_related('parent')

        # Build tree structure
        tree = {}
        for group in groups:
            if group.parent_id not in tree:
                tree[group.parent_id] = []
            tree[group.parent_id].append({
                'id': group.id,
                'name': group.name,
                'code': group.code,
                'level': group.get_level(),
                'children': []
            })

        # Build hierarchical structure
        def build_tree(parent_id=None):
            return tree.get(parent_id, [])

        return build_tree()

    def is_dependent_on(self, other_filter):
        """Check if this filter depends on another filter."""
        depends_on = self.dependency_rules.get('depends_on', [])
        return other_filter.name in depends_on


class FilterConfigurationGroup(models.Model):
    """
    Junction table linking filter configurations to filter groups.

    Table: "acted"."filter_configuration_groups"
    """
    filter_configuration = models.ForeignKey(
        FilterConfiguration,
        on_delete=models.CASCADE
    )
    filter_group = models.ForeignKey(
        'filtering.FilterGroup',
        on_delete=models.CASCADE
    )
    is_default = models.BooleanField(
        default=False,
        help_text='Is this a default option for the filter?'
    )
    display_order = models.IntegerField(
        default=0,
        help_text='Order within this filter'
    )

    class Meta:
        db_table = '"acted"."filter_configuration_groups"'
        unique_together = [['filter_configuration', 'filter_group']]
        ordering = ['display_order', 'filter_group__name']
        verbose_name = 'Filter Configuration Group'
        verbose_name_plural = 'Filter Configuration Groups'

    def __str__(self):
        return f'{self.filter_configuration.display_label} -> {self.filter_group.name}'
