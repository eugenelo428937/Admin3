"""
Django Admin configuration for Address Cache models.
"""

from django.contrib import admin
from django.utils.html import format_html
from .models import CachedAddress


@admin.register(CachedAddress)
class CachedAddressAdmin(admin.ModelAdmin):
    """
    Admin interface for CachedAddress model.

    Displays cached address entries with search, filters, and inline viewing.
    """

    list_display = (
        'postcode',
        'created_at',
        'expires_at',
        'hit_count',
        'is_expired_display',
        'address_count'
    )

    list_filter = (
        'created_at',
        'expires_at',
    )

    search_fields = (
        'postcode',
        'search_query',
    )

    readonly_fields = (
        'created_at',
        'expires_at',
        'hit_count',
        'response_data_display',
        'formatted_addresses_display',
    )

    fieldsets = (
        ('Postcode Information', {
            'fields': ('postcode', 'search_query')
        }),
        ('Cache Metadata', {
            'fields': ('created_at', 'expires_at', 'hit_count')
        }),
        ('Response Data', {
            'fields': ('response_data_display', 'formatted_addresses_display'),
            'classes': ('collapse',)
        }),
    )

    date_hierarchy = 'created_at'

    ordering = ['-created_at']

    def is_expired_display(self, obj):
        """Display whether the cache entry is expired."""
        if obj.is_expired():
            return format_html('<span style="color: red;">Expired</span>')
        return format_html('<span style="color: green;">Valid</span>')
    is_expired_display.short_description = 'Status'

    def address_count(self, obj):
        """Display the number of addresses in the formatted response."""
        try:
            addresses = obj.formatted_addresses.get('addresses', [])
            return len(addresses)
        except:
            return 0
    address_count.short_description = 'Addresses'

    def response_data_display(self, obj):
        """Pretty-print JSON response data."""
        import json
        try:
            return format_html('<pre>{}</pre>', json.dumps(obj.response_data, indent=2))
        except:
            return str(obj.response_data)
    response_data_display.short_description = 'Postcoder Response (JSON)'

    def formatted_addresses_display(self, obj):
        """Pretty-print formatted addresses."""
        import json
        try:
            return format_html('<pre>{}</pre>', json.dumps(obj.formatted_addresses, indent=2))
        except:
            return str(obj.formatted_addresses)
    formatted_addresses_display.short_description = 'Formatted Addresses (JSON)'
