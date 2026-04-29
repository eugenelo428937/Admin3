from django.contrib import admin
from .models import IssuedVoucher, RedeemedVoucher


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


@admin.register(RedeemedVoucher)
class RedeemedVoucherAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'get_voucher_code', 'get_paper_name', 'redeemed_at', 'created_at',
    )
    list_filter = ('redeemed_at',)
    search_fields = (
        'issued_voucher__voucher_code',
        'marking_paper__name',
    )
    raw_id_fields = ('issued_voucher', 'marking_paper')
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('-redeemed_at',)
    list_per_page = 50

    @admin.display(description='Voucher code')
    def get_voucher_code(self, obj):
        return obj.issued_voucher.voucher_code

    @admin.display(description='Marking paper')
    def get_paper_name(self, obj):
        return obj.marking_paper.name
