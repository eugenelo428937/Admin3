from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse, path
from django.http import HttpResponseRedirect
from django.contrib import messages
from django.shortcuts import render
from django.core.cache import cache
from django.db import models
import json

from products.models.filter_system import (
    FilterGroup,
    FilterConfiguration, 
    FilterConfigurationGroup,
    FilterPreset, 
    FilterUsageAnalytics
)
from products.services.filter_service import get_filter_service


# Custom admin for hierarchical display
class FilterGroupAdmin(admin.ModelAdmin):
    """Admin interface for hierarchical filter groups"""
    
    list_display = [
        'get_indented_name',
        'code', 
        'is_active',
        'display_order',
        'get_level',
        'get_children_count',
        'get_configurations_count'
    ]
    
    list_filter = ['is_active', 'parent']
    search_fields = ['name', 'code', 'description']
    ordering = ['parent__name', 'display_order', 'name']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'code', 'parent', 'description')
        }),
        ('Configuration', {
            'fields': ('is_active', 'display_order'),
            'classes': ('collapse',)
        })
    )
    
    def get_indented_name(self, obj):
        """Show hierarchical structure with indentation"""
        level = obj.get_level()
        indent = "&nbsp;&nbsp;&nbsp;&nbsp;" * level
        icon = "📁" if obj.children.exists() else "📄"
        return format_html(f'{indent}{icon} <strong>{obj.name}</strong>')
    get_indented_name.short_description = 'Name (Hierarchical)'
    get_indented_name.allow_tags = True
    
    def get_level(self, obj):
        """Show the hierarchy level"""
        return obj.get_level()
    get_level.short_description = 'Level'
    
    def get_children_count(self, obj):
        """Show number of child groups"""
        count = obj.children.count()
        if count > 0:
            return format_html(
                '<a href="{}?parent__id__exact={}">{} children</a>',
                reverse('admin:products_filtergroup_changelist'),
                obj.id,
                count
            )
        return "No children"
    get_children_count.short_description = 'Children'
    
    def get_configurations_count(self, obj):
        """Show number of filter configurations using this group"""
        count = obj.filterconfiguration_set.through.objects.filter(filter_group=obj).count()
        if count > 0:
            return format_html(
                '<a href="{}?filter_groups__id__exact={}">{} filters</a>',
                reverse('admin:products_filterconfiguration_changelist'),
                obj.id,
                count
            )
        return "No filters"
    get_configurations_count.short_description = 'Used in Filters'
    
    def get_queryset(self, request):
        """Optimize queryset with prefetch"""
        qs = super().get_queryset(request)
        return qs.select_related('parent').prefetch_related('children')


@admin.register(FilterGroup)
class FilterGroupAdminRegistered(FilterGroupAdmin):
    pass


class FilterConfigurationGroupInline(admin.TabularInline):
    """Inline admin for filter configuration groups"""
    model = FilterConfigurationGroup
    extra = 0
    autocomplete_fields = ['filter_group']
    
    fields = ['filter_group', 'is_default', 'display_order']
    ordering = ['display_order', 'filter_group__name']


@admin.register(FilterConfiguration)
class FilterConfigurationAdmin(admin.ModelAdmin):
    """Enhanced admin interface for filter configurations"""
    
    list_display = [
        'display_label', 
        'filter_type', 
        'filter_key',
        'ui_component',
        'display_order', 
        'is_active',
        'get_groups_count',
        'get_usage_stats',
        'test_filter'
    ]
    
    list_filter = [
        'filter_type', 
        'ui_component', 
        'is_active', 
        'is_collapsible',
        'is_expanded_by_default',
        'allow_multiple'
    ]
    
    search_fields = ['name', 'display_label', 'description']
    ordering = ['display_order', 'display_label']
    
    fieldsets = (
        ('Basic Configuration', {
            'fields': ('name', 'display_label', 'description', 'filter_type', 'filter_key')
        }),
        ('UI Configuration', {
            'fields': ('ui_component', 'display_order', 'is_active'),
        }),
        ('Behavior', {
            'fields': (
                'is_collapsible', 
                'is_expanded_by_default', 
                'is_required', 
                'allow_multiple'
            ),
            'classes': ('collapse',)
        }),
        ('Advanced Configuration', {
            'fields': ('ui_config', 'validation_rules', 'dependency_rules'),
            'classes': ('collapse',),
            'description': 'JSON configuration for advanced settings'
        }),
        ('Associated Groups', {
            'fields': (),
            'description': 'Filter groups associated with this configuration (managed via inline below)'
        }),
        ('Metadata', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    readonly_fields = ['created_at', 'updated_at']
    inlines = [FilterConfigurationGroupInline]
    
    def get_urls(self):
        """Add custom URLs for filter management"""
        urls = super().get_urls()
        custom_urls = [
            path('test-filter/<int:filter_id>/', 
                 self.admin_site.admin_view(self.test_filter_view), 
                 name='test_filter'),
            path('reload-configurations/', 
                 self.admin_site.admin_view(self.reload_configurations_view), 
                 name='reload_configurations'),
            path('clear-cache/', 
                 self.admin_site.admin_view(self.clear_cache_view), 
                 name='clear_cache'),
        ]
        return custom_urls + urls
    
    def get_groups_count(self, obj):
        """Show number of associated filter groups"""
        count = obj.filter_groups.count()
        if count > 0:
            return format_html(
                '<a href="{}?filter_configuration__id__exact={}">{} groups</a>',
                reverse('admin:products_filterconfigurationgroup_changelist'),
                obj.id,
                count
            )
        return "No groups"
    get_groups_count.short_description = 'Groups'
    
    def get_usage_stats(self, obj):
        """Show usage statistics"""
        total_usage = FilterUsageAnalytics.objects.filter(
            filter_configuration=obj
        ).aggregate(
            total=models.Sum('usage_count')
        )['total'] or 0
        
        if total_usage > 0:
            return format_html(
                '<a href="{}">{} uses</a>',
                reverse('admin:products_filterusageanalytics_changelist') + f'?filter_configuration__id={obj.id}',
                total_usage
            )
        return "No usage"
    get_usage_stats.short_description = 'Usage'
    
    def test_filter(self, obj):
        """Test filter functionality"""
        return format_html(
            '<a class="button" href="{}">Test</a>',
            reverse('admin:test_filter', args=[obj.id])
        )
    test_filter.short_description = 'Test'
    
    def test_filter_view(self, request, filter_id):
        """Test filter functionality"""
        filter_config = FilterConfiguration.objects.get(id=filter_id)
        
        if request.method == 'POST':
            # Process test
            test_values = request.POST.getlist('test_values')
            
            try:
                from exam_sessions_subjects_products.models import ExamSessionSubjectProduct
                service = get_filter_service()
                
                base_queryset = ExamSessionSubjectProduct.objects.all()
                filtered_queryset = service.apply_filters(
                    base_queryset, 
                    {filter_config.name: test_values}
                )
                
                result = {
                    'total_before': base_queryset.count(),
                    'total_after': filtered_queryset.count(),
                    'test_values': test_values,
                    'sample_results': list(filtered_queryset.values(
                        'id', 'product__shortname', 'exam_session_subject__subject__code'
                    )[:10])
                }
                
                context = {
                    'filter_config': filter_config,
                    'test_result': result,
                    'filter_options': service.get_filter_options([filter_config.name]).get(filter_config.name, [])
                }
                
            except Exception as e:
                messages.error(request, f"Filter test failed: {str(e)}")
                context = {
                    'filter_config': filter_config,
                    'error': str(e)
                }
        else:
            # Show test form
            try:
                service = get_filter_service()
                filter_options = service.get_filter_options([filter_config.name]).get(filter_config.name, [])
                
                context = {
                    'filter_config': filter_config,
                    'filter_options': filter_options[:20]  # Limit for display
                }
            except Exception as e:
                messages.error(request, f"Could not load filter options: {str(e)}")
                context = {
                    'filter_config': filter_config,
                    'error': str(e)
                }
        
        return render(request, 'admin/refactored_filter_test.html', context)
    
    def reload_configurations_view(self, request):
        """Reload filter configurations"""
        try:
            service = get_filter_service()
            service.reload_configurations()
            messages.success(request, "Filter configurations reloaded successfully")
        except Exception as e:
            messages.error(request, f"Failed to reload configurations: {str(e)}")
        
        return HttpResponseRedirect(reverse('admin:products_filterconfiguration_changelist'))
    
    def clear_cache_view(self, request):
        """Clear filter cache"""
        try:
            service = get_filter_service()
            service.invalidate_cache()
            messages.success(request, "Filter cache cleared successfully")
        except Exception as e:
            messages.error(request, f"Failed to clear cache: {str(e)}")
        
        return HttpResponseRedirect(reverse('admin:products_filterconfiguration_changelist'))
    
    def save_model(self, request, obj, form, change):
        """Save model with user tracking"""
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
        
        # Clear cache when configuration changes
        try:
            service = get_filter_service()
            service.invalidate_cache([obj.name])
        except Exception as e:
            messages.warning(request, f"Configuration saved but cache clear failed: {str(e)}")


@admin.register(FilterConfigurationGroup)
class FilterConfigurationGroupAdmin(admin.ModelAdmin):
    """Admin interface for filter configuration group relationships"""
    
    list_display = [
        'filter_configuration',
        'filter_group',
        'get_group_path', 
        'is_default',
        'display_order'
    ]
    
    list_filter = [
        'filter_configuration', 
        'is_default',
        'filter_group__parent'
    ]
    
    search_fields = [
        'filter_configuration__display_label',
        'filter_group__name',
        'filter_group__code'
    ]
    
    ordering = ['filter_configuration__display_order', 'display_order', 'filter_group__name']
    
    autocomplete_fields = ['filter_configuration', 'filter_group']
    
    def get_group_path(self, obj):
        """Show the full path of the filter group"""
        return obj.filter_group.get_full_path()
    get_group_path.short_description = 'Group Path'
    
    def get_queryset(self, request):
        """Optimize queryset"""
        qs = super().get_queryset(request)
        return qs.select_related(
            'filter_configuration', 
            'filter_group', 
            'filter_group__parent'
        )


@admin.register(FilterPreset)
class FilterPresetAdmin(admin.ModelAdmin):
    """Admin interface for filter presets"""
    
    list_display = [
        'name', 
        'created_by', 
        'is_public',
        'usage_count',
        'last_used',
        'created_at',
        'get_filter_summary'
    ]
    
    list_filter = ['is_public', 'created_by', 'created_at']
    search_fields = ['name', 'description']
    ordering = ['-usage_count', 'name']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'description', 'is_public')
        }),
        ('Filter Values', {
            'fields': ('filter_values',),
            'description': 'JSON representation of filter values'
        }),
        ('Usage Statistics', {
            'fields': ('usage_count', 'last_used'),
            'classes': ('collapse',)
        })
    )
    
    readonly_fields = ['usage_count', 'last_used', 'created_at']
    
    def get_filter_summary(self, obj):
        """Show summary of filters in this preset"""
        filter_values = obj.filter_values
        if not filter_values:
            return "No filters"
        
        summary = []
        for filter_name, values in filter_values.items():
            if values:
                summary.append(f"{filter_name}: {len(values)} selected")
        
        return "; ".join(summary) if summary else "No filters"
    get_filter_summary.short_description = 'Filter Summary'
    
    def save_model(self, request, obj, form, change):
        """Save model with user tracking"""
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(FilterUsageAnalytics)
class FilterUsageAnalyticsAdmin(admin.ModelAdmin):
    """Admin interface for filter usage analytics"""
    
    list_display = [
        'filter_configuration', 
        'filter_value', 
        'usage_count',
        'last_used',
        'user',
        'get_value_label'
    ]
    
    list_filter = [
        'filter_configuration', 
        'last_used',
        'user'
    ]
    
    search_fields = ['filter_value', 'session_id']
    ordering = ['-usage_count', '-last_used']
    readonly_fields = ['last_used']
    
    def get_value_label(self, obj):
        """Try to get a human-readable label for the filter value"""
        try:
            service = get_filter_service()
            options = service.get_filter_options([obj.filter_configuration.name])
            filter_options = options.get(obj.filter_configuration.name, [])
            
            for option in filter_options:
                if str(option.get('value')) == obj.filter_value or str(option.get('id')) == obj.filter_value:
                    return option.get('label', obj.filter_value)
            
            return obj.filter_value
        except Exception:
            return obj.filter_value
    get_value_label.short_description = 'Readable Value'
    
    def has_add_permission(self, request):
        """Disable manual addition of analytics"""
        return False
    
    def has_change_permission(self, request, obj=None):
        """Make analytics read-only"""
        return request.user.is_superuser


# Bulk actions
def clear_filter_cache_action(modeladmin, request, queryset):
    """Clear cache for selected filters"""
    service = get_filter_service()
    filter_names = [obj.name for obj in queryset]
    service.invalidate_cache(filter_names)
    messages.success(request, f"Cache cleared for {len(filter_names)} filters")

clear_filter_cache_action.short_description = "Clear cache for selected filters"

FilterConfigurationAdmin.actions = [clear_filter_cache_action]