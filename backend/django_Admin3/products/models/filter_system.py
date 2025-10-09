from django.db import models
from django.contrib.auth.models import User
from django.core.cache import cache
from django.utils import timezone
from django.apps import apps
import json

class FilterGroup(models.Model):
    """
    Hierarchical filter groups (renamed from ProductGroup)
    This replaces acted_product_group and provides the tree structure
    """
    name = models.CharField(max_length=100)
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='children')
    code = models.CharField(max_length=100, unique=True, null=True, blank=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    display_order = models.IntegerField(default=0)
    
    class Meta:
        db_table = 'acted_filter_group'
        ordering = ['display_order', 'name']
        verbose_name = 'Filter Group'
        verbose_name_plural = 'Filter Groups'
    
    def __str__(self):
        return self.name
    
    def get_full_path(self):
        """Get the full hierarchical path"""
        path = [self.name]
        parent = self.parent
        while parent:
            path.insert(0, parent.name)
            parent = parent.parent
        return ' > '.join(path)
    
    def get_descendants(self, include_self=True):
        """Get all descendant groups"""
        descendants = []
        if include_self:
            descendants.append(self)
        
        for child in self.children.all():
            descendants.extend(child.get_descendants(include_self=True))
        
        return descendants
    
    def get_level(self):
        """Get the depth level in the hierarchy"""
        level = 0
        parent = self.parent
        while parent:
            level += 1
            parent = parent.parent
        return level

class FilterConfiguration(models.Model):
    """
    Enhanced filter configuration system
    This is the main configuration table
    """
    FILTER_TYPE_CHOICES = [
        ('subject', 'Subject'),
        ('filter_group', 'Filter Group'),  # Uses FilterGroup hierarchy
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
    name = models.CharField(max_length=100, unique=True, help_text='Internal name for the filter')
    display_label = models.CharField(max_length=100, help_text='User-facing label')
    description = models.TextField(blank=True, help_text='Description for admin users')
    filter_type = models.CharField(max_length=32, choices=FILTER_TYPE_CHOICES)
    filter_key = models.CharField(max_length=50, help_text='Key used in API requests')
    
    # UI Configuration
    ui_component = models.CharField(max_length=32, choices=UI_COMPONENT_CHOICES, default='multi_select')
    display_order = models.IntegerField(default=0, help_text='Order in which filters appear')
    
    # Behavior Configuration
    is_active = models.BooleanField(default=True)
    is_collapsible = models.BooleanField(default=True)
    is_expanded_by_default = models.BooleanField(default=False)
    is_required = models.BooleanField(default=False)
    allow_multiple = models.BooleanField(default=True)
    
    # Advanced Configuration (JSON fields)
    ui_config = models.JSONField(default=dict, blank=True, help_text='UI-specific configuration')
    validation_rules = models.JSONField(default=dict, blank=True, help_text='Validation rules')
    dependency_rules = models.JSONField(default=dict, blank=True, help_text='Dependencies on other filters')
    
    # Filter Groups (Many-to-Many relationship)
    filter_groups = models.ManyToManyField(FilterGroup, through='FilterConfigurationGroup', blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    
    class Meta:
        db_table = 'acted_filter_configuration'
        ordering = ['display_order', 'display_label']
        verbose_name = 'Filter Configuration'
        verbose_name_plural = 'Filter Configurations'
    
    def __str__(self):
        return f'{self.display_label} ({self.filter_type})'
    
    def get_ui_config(self):
        """Get UI configuration with defaults"""
        defaults = {
            'show_count': True,
            'show_select_all': False,
            'placeholder': f'Select {self.display_label.lower()}...',
            'search_placeholder': f'Search {self.display_label.lower()}...',
            'collapsible': self.is_collapsible,
            'expanded': self.is_expanded_by_default,
        }
        
        # Merge with custom config
        config = defaults.copy()
        config.update(self.ui_config)
        return config
    
    def get_filter_groups_tree(self):
        """Get associated filter groups as a tree structure"""
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
        """Check if this filter depends on another filter"""
        depends_on = self.dependency_rules.get('depends_on', [])
        return other_filter.name in depends_on

class FilterConfigurationGroup(models.Model):
    """
    Junction table linking filter configurations to filter groups
    Replaces acted_product_group_filter_groups
    """
    filter_configuration = models.ForeignKey(FilterConfiguration, on_delete=models.CASCADE)
    filter_group = models.ForeignKey(FilterGroup, on_delete=models.CASCADE)
    
    # Additional metadata for the relationship
    is_default = models.BooleanField(default=False, help_text='Is this a default option for the filter?')
    display_order = models.IntegerField(default=0, help_text='Order within this filter')
    
    class Meta:
        db_table = 'acted_filter_configuration_group'
        unique_together = [['filter_configuration', 'filter_group']]
        ordering = ['display_order', 'filter_group__name']
        verbose_name = 'Filter Configuration Group'
        verbose_name_plural = 'Filter Configuration Groups'
    
    def __str__(self):
        return f'{self.filter_configuration.display_label} -> {self.filter_group.name}'

class FilterPreset(models.Model):
    """
    Saved filter combinations for quick access
    """
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    filter_values = models.JSONField(default=dict, help_text='Saved filter values')
    is_public = models.BooleanField(default=False, help_text='Available to all users')
    
    # Usage tracking
    usage_count = models.IntegerField(default=0)
    last_used = models.DateTimeField(null=True, blank=True)
    
    # Metadata
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'acted_filter_preset'
        ordering = ['-usage_count', 'name']
        verbose_name = 'Filter Preset'
        verbose_name_plural = 'Filter Presets'
    
    def __str__(self):
        return self.name
    
    def increment_usage(self):
        """Increment usage count and update last used timestamp"""
        self.usage_count += 1
        self.last_used = timezone.now()
        self.save(update_fields=['usage_count', 'last_used'])

class FilterUsageAnalytics(models.Model):
    """
    Track filter usage for analytics and optimization
    """
    filter_configuration = models.ForeignKey(FilterConfiguration, on_delete=models.CASCADE)
    filter_value = models.CharField(max_length=100, help_text='The actual filter value used')
    usage_count = models.IntegerField(default=0)
    last_used = models.DateTimeField(auto_now=True)
    
    # Optional user tracking
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    session_id = models.CharField(max_length=100, blank=True, help_text='Session ID for anonymous users')
    
    class Meta:
        db_table = 'acted_filter_usage_analytics'
        unique_together = [['filter_configuration', 'filter_value']]
        indexes = [
            models.Index(fields=['filter_configuration', '-usage_count']),
            models.Index(fields=['last_used']),
        ]
        verbose_name = 'Filter Usage Analytics'
        verbose_name_plural = 'Filter Usage Analytics'
    
    def __str__(self):
        return f'{self.filter_configuration.display_label}: {self.filter_value} ({self.usage_count}x)'

# Helper functions for data migration
def migrate_old_product_groups():
    """
    Migrate data from acted_product_group to acted_filter_group
    """
    from django.db import connection
    
    with connection.cursor() as cursor:
        # Copy data from old table to new table
        cursor.execute("""
            INSERT INTO acted_filter_group (id, name, parent_id, code, description, is_active, display_order)
            SELECT id, name, parent_id, name, '', true, id
            FROM acted_product_group
            ON CONFLICT (id) DO NOTHING;
        """)

def setup_main_category_filter():
    """
    Set up the MAIN_CATEGORY filter using the new system
    """
    from django.db import connection
    
    # Create the main category filter configuration
    filter_config, created = FilterConfiguration.objects.get_or_create(
        name='main_category',
        defaults={
            'display_label': 'Main Category',
            'description': 'Filter by main product categories (Materials, Marking, Tutorial)',
            'filter_type': 'filter_group',
            'filter_key': 'main_category',
            'ui_component': 'multi_select',
            'display_order': 1,
            'is_active': True,
            'is_collapsible': True,
            'is_expanded_by_default': True,
            'allow_multiple': True,
            'ui_config': {
                'show_count': True,
                'show_hierarchy': False,
                'show_select_all': True,
                'include_children': True,
            }
        }
    )
    
    if created:
        # Link to the main category groups (Material, Marking, Tutorial)
        main_categories = FilterGroup.objects.filter(parent__isnull=True)
        for category in main_categories:
            FilterConfigurationGroup.objects.get_or_create(
                filter_configuration=filter_config,
                filter_group=category,
                defaults={'is_default': True}
            ) 

    return filter_config