from django.contrib import admin
from django.utils.html import format_html
from .models import MarkingVoucher, IssuedVoucher


@admin.register(IssuedVoucher)
class IssuedVoucherAdmin(admin.ModelAdmin):
    """Admin for issued voucher instances (one row per unit sold).

    Created automatically when an order with a marking-voucher line is
    confirmed (see orders.services.confirmation.confirm_order). Lifecycle
    is managed via IssuedVoucherService methods, not direct editing.
    """
    list_display = [
        'voucher_code', 'get_purchasable_code', 'status',
        'issued_at', 'expires_at', 'redeemed_at', 'cancelled_at',
    ]
    list_filter = ['status', 'issued_at', 'expires_at']
    search_fields = ['voucher_code', 'purchasable__code', 'purchasable__name']
    raw_id_fields = ['order_item', 'purchasable']
    readonly_fields = ['voucher_code', 'issued_at']
    ordering = ['-issued_at']
    list_per_page = 50

    fieldsets = (
        ('Identity', {
            'fields': ('voucher_code', 'purchasable', 'order_item')
        }),
        ('Lifecycle', {
            'fields': ('status', 'issued_at', 'expires_at')
        }),
        ('Redemption & Cancellation', {
            'fields': ('redeemed_at', 'cancelled_at', 'cancellation_reason'),
            'classes': ('collapse',),
        }),
    )

    @admin.display(description='Catalog SKU')
    def get_purchasable_code(self, obj):
        return obj.purchasable.code


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
