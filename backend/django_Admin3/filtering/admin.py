"""Filtering app admin configuration."""
from django.contrib import admin
from .models import (
    FilterGroup,
    FilterConfiguration,
    FilterConfigurationGroup,
    FilterPreset,
    FilterUsageAnalytics,
)


class FilterGroupChildrenInline(admin.TabularInline):
    """Inline for child filter groups."""
    model = FilterGroup
    fk_name = 'parent'
    extra = 0
    fields = ['name', 'code', 'is_active', 'display_order']
    show_change_link = True


@admin.register(FilterGroup)
class FilterGroupAdmin(admin.ModelAdmin):
    """Admin for FilterGroup model."""
    list_display = ['name', 'code', 'parent', 'is_active', 'display_order', 'get_level']
    list_filter = ['is_active', 'parent']
    search_fields = ['name', 'code']
    ordering = ['display_order', 'name']
    inlines = [FilterGroupChildrenInline]

    @admin.display(description='Level')
    def get_level(self, obj):
        return obj.get_level()


class FilterConfigurationGroupInline(admin.TabularInline):
    """Inline for filter configuration groups."""
    model = FilterConfigurationGroup
    extra = 0
    autocomplete_fields = ['filter_group']


@admin.register(FilterConfiguration)
class FilterConfigurationAdmin(admin.ModelAdmin):
    """Admin for FilterConfiguration model."""
    list_display = ['display_label', 'name', 'filter_type', 'ui_component', 'is_active', 'display_order']
    list_filter = ['filter_type', 'ui_component', 'is_active']
    search_fields = ['name', 'display_label', 'description']
    ordering = ['display_order', 'display_label']
    inlines = [FilterConfigurationGroupInline]
    fieldsets = [
        ('Basic', {
            'fields': ['name', 'display_label', 'description', 'filter_type', 'filter_key']
        }),
        ('UI Configuration', {
            'fields': ['ui_component', 'display_order', 'is_collapsible', 'is_expanded_by_default']
        }),
        ('Behavior', {
            'fields': ['is_active', 'is_required', 'allow_multiple']
        }),
        ('Advanced (JSON)', {
            'classes': ['collapse'],
            'fields': ['ui_config', 'validation_rules', 'dependency_rules']
        }),
        ('Metadata', {
            'classes': ['collapse'],
            'fields': ['created_by', 'created_at', 'updated_at']
        }),
    ]
    readonly_fields = ['created_at', 'updated_at']


@admin.register(FilterConfigurationGroup)
class FilterConfigurationGroupAdmin(admin.ModelAdmin):
    """Admin for FilterConfigurationGroup junction table."""
    list_display = ['filter_configuration', 'filter_group', 'is_default', 'display_order']
    list_filter = ['filter_configuration', 'is_default']
    autocomplete_fields = ['filter_configuration', 'filter_group']


@admin.register(FilterPreset)
class FilterPresetAdmin(admin.ModelAdmin):
    """Admin for FilterPreset model."""
    list_display = ['name', 'created_by', 'is_public', 'usage_count', 'last_used']
    list_filter = ['is_public', 'created_by']
    search_fields = ['name', 'description']
    readonly_fields = ['usage_count', 'last_used', 'created_at']


@admin.register(FilterUsageAnalytics)
class FilterUsageAnalyticsAdmin(admin.ModelAdmin):
    """Admin for FilterUsageAnalytics model."""
    list_display = ['filter_configuration', 'filter_value', 'usage_count', 'last_used', 'user']
    list_filter = ['filter_configuration', 'user']
    search_fields = ['filter_value']
    readonly_fields = ['last_used']
