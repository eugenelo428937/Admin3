"""
Django Admin configuration for Address Analytics models.
"""

from django.contrib import admin
from django.utils.html import format_html
from .models import AddressLookupLog


@admin.register(AddressLookupLog)
class AddressLookupLogAdmin(admin.ModelAdmin):
    """
    Admin interface for AddressLookupLog model.

    Displays address lookup analytics with search, filters, and performance metrics.
    """

    list_display = (
        'postcode',
        'lookup_timestamp',
        'api_provider',
        'cache_hit_display',
        'success_display',
        'response_time_ms',
        'result_count',
    )

    list_filter = (
        'api_provider',
        'cache_hit',
        'success',
        'lookup_timestamp',
    )

    search_fields = (
        'postcode',
        'search_query',
        'error_message',
    )

    readonly_fields = (
        'postcode',
        'search_query',
        'lookup_timestamp',
        'cache_hit',
        'response_time_ms',
        'result_count',
        'api_provider',
        'success',
        'error_message',
    )

    fieldsets = (
        ('Lookup Information', {
            'fields': ('postcode', 'search_query', 'lookup_timestamp')
        }),
        ('Performance Metrics', {
            'fields': ('api_provider', 'cache_hit', 'response_time_ms', 'result_count')
        }),
        ('Status', {
            'fields': ('success', 'error_message')
        }),
    )

    date_hierarchy = 'lookup_timestamp'

    ordering = ['-lookup_timestamp']

    def cache_hit_display(self, obj):
        """Display cache hit status with visual indicator."""
        if obj.cache_hit:
            return format_html('<span style="color: green;">✓ Cached</span>')
        return format_html('<span style="color: orange;">API Call</span>')
    cache_hit_display.short_description = 'Cache'

    def success_display(self, obj):
        """Display success status with visual indicator."""
        if obj.success:
            return format_html('<span style="color: green;">✓ Success</span>')
        return format_html('<span style="color: red;">✗ Failed</span>')
    success_display.short_description = 'Status'

    def has_add_permission(self, request):
        """Disable manual creation of log entries."""
        return False

    def has_change_permission(self, request, obj=None):
        """Make log entries read-only."""
        return False

    def has_delete_permission(self, request, obj=None):
        """Allow deletion for cleanup purposes."""
        return True
