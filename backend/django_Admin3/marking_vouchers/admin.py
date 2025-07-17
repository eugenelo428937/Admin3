from django.contrib import admin
from django.utils.html import format_html
from .models import MarkingVoucher


@admin.register(MarkingVoucher)
class MarkingVoucherAdmin(admin.ModelAdmin):
    list_display = [
        'code', 'name', 'price', 'is_active', 'is_available',
        'expiry_date', 'created_at'
    ]
    list_filter = ['is_active', 'created_at', 'expiry_date']
    search_fields = ['code', 'name', 'description']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('code', 'name', 'description')
        }),
        ('Pricing', {
            'fields': ('price',)
        }),
        ('Availability', {
            'fields': ('is_active', 'expiry_date')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    def is_available(self, obj):
        """Display availability status with color coding"""
        if obj.is_available:
            return format_html(
                '<span style="color: green;">✓ Available</span>'
            )
        else:
            return format_html(
                '<span style="color: red;">✗ Not Available</span>'
            )
    is_available.short_description = 'Available'
