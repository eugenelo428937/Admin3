from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils import timezone
from django.db.models import Count, Q
import json

from .models import (
    UtilsRegion, UtilsCountrys, UtilsCountryRegion
)


# ============================================================================
# VAT Models Admin (Phase 1: Database Foundation)
# ============================================================================

@admin.register(UtilsRegion)
class UtilsRegionAdmin(admin.ModelAdmin):
    """Admin interface for VAT regions."""
    list_display = ['code', 'name', 'description', 'active']
    list_editable = ['active']
    search_fields = ['code', 'name']
    list_filter = ['active']
    ordering = ['code']
    readonly_fields = ['created_at', 'updated_at']

    fieldsets = (
        ('Region Information', {
            'fields': ('code', 'name', 'description')
        }),
        ('Status', {
            'fields': ('active',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )


@admin.register(UtilsCountrys)
class UtilsCountrysAdmin(admin.ModelAdmin):
    """Admin interface for VAT countries with inline vat_percent editing."""
    list_display = ['code', 'name', 'vat_percent', 'active']
    list_editable = ['vat_percent', 'active']
    search_fields = ['code', 'name']
    list_filter = ['active']
    ordering = ['name']
    readonly_fields = ['created_at', 'updated_at']

    fieldsets = (
        ('Country Information', {
            'fields': ('code', 'name')
        }),
        ('VAT Configuration', {
            'fields': ('vat_percent', 'active'),
            'description': (
                'VAT percentage (e.g., 20.00 for 20%). '
                'Changes take effect immediately for new calculations.'
            )
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )

    def get_queryset(self, request):
        """Optimize queryset."""
        qs = super().get_queryset(request)
        return qs.select_related()

    def save_model(self, request, obj, form, change):
        """Log VAT rate changes for audit."""
        if change and 'vat_percent' in form.changed_data:
            # Log VAT rate change
            import logging
            logger = logging.getLogger('vat.admin')
            logger.info(
                f"VAT rate changed for {obj.code} ({obj.name}): "
                f"{form.initial['vat_percent']}% → {obj.vat_percent}% "
                f"by {request.user.username}"
            )

        super().save_model(request, obj, form, change)


@admin.register(UtilsCountryRegion)
class UtilsCountryRegionAdmin(admin.ModelAdmin):
    """Admin interface for country-region mappings with date filters."""
    list_display = [
        'country',
        'region',
        'effective_from',
        'effective_to',
        'is_current'
    ]
    list_filter = ['region', 'effective_from']
    search_fields = ['country__code', 'country__name', 'region__code']
    date_hierarchy = 'effective_from'
    ordering = ['country__name', '-effective_from']
    readonly_fields = ['created_at', 'updated_at']

    fieldsets = (
        ('Mapping', {
            'fields': ('country', 'region')
        }),
        ('Effective Dates', {
            'fields': ('effective_from', 'effective_to'),
            'description': (
                'Set effective date range for this mapping. '
                'Leave effective_to blank for ongoing mappings.'
            )
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )

    def get_queryset(self, request):
        """Optimize queryset with select_related."""
        qs = super().get_queryset(request)
        return qs.select_related('country', 'region')

    def save_model(self, request, obj, form, change):
        """Validate effective date ranges."""
        # Check for overlapping date ranges
        overlapping = UtilsCountryRegion.objects.filter(
            country=obj.country,
            effective_from__lte=obj.effective_to or '9999-12-31',
            effective_to__gte=obj.effective_from
        ).exclude(pk=obj.pk)

        if overlapping.exists():
            from django.contrib import messages
            messages.warning(
                request,
                f"Warning: Overlapping date range detected for {obj.country.code}. "
                f"Please verify effective dates."
            )

        super().save_model(request, obj, form, change)


# ============================================================================
# Email Admin Classes - MOVED TO email_system app (20260115-util-refactoring)
# ============================================================================
# The email admin classes have been moved to the email_system app:
# from email_system.admin import EmailTemplateAdmin, EmailQueueAdmin, etc.
# ============================================================================
