from django.contrib import admin
from .models import (
    Order, OrderItem, Payment, OrderAcknowledgment,
    OrderPreference, OrderContact, OrderDelivery,
)


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ('item_type', 'product', 'quantity', 'actual_price',
                       'net_amount', 'vat_amount', 'gross_amount', 'vat_rate')


class PaymentInline(admin.StackedInline):
    model = Payment
    extra = 0
    readonly_fields = ('created_at', 'updated_at', 'processed_at')


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'subtotal', 'vat_amount', 'total_amount', 'created_at')
    search_fields = ('user__username', 'user__email')
    list_filter = ('created_at', 'vat_country')
    readonly_fields = ('created_at', 'updated_at')
    inlines = [OrderItemInline, PaymentInline]


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ('id', 'order', 'item_type', 'quantity', 'actual_price',
                    'net_amount', 'vat_amount', 'gross_amount')
    search_fields = ('order__user__username',)
    list_filter = ('item_type', 'price_type')
    readonly_fields = ('order', 'product', 'quantity', 'actual_price')


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('id', 'order', 'payment_method', 'amount', 'status',
                    'created_at', 'transaction_id')
    list_filter = ('payment_method', 'status', 'created_at')
    search_fields = ('order__user__username', 'transaction_id')
    readonly_fields = ('created_at', 'updated_at', 'processed_at')
    fieldsets = (
        ('Order Information', {
            'fields': ('order', 'payment_method', 'amount', 'currency')
        }),
        ('Transaction Details', {
            'fields': ('transaction_id', 'status', 'processed_at')
        }),
        ('Client Information', {
            'fields': ('client_ip', 'user_agent')
        }),
        ('Opayo Response', {
            'fields': ('opayo_response', 'opayo_status_code', 'opayo_status_detail')
        }),
        ('Error Information', {
            'fields': ('error_message', 'error_code')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
        ('Additional Data', {
            'fields': ('metadata',)
        })
    )


@admin.register(OrderAcknowledgment)
class OrderAcknowledgmentAdmin(admin.ModelAdmin):
    list_display = ('id', 'order', 'order_user', 'acknowledgment_type',
                    'is_accepted', 'title', 'accepted_at')
    list_filter = ('acknowledgment_type', 'is_accepted', 'accepted_at')
    search_fields = ('order__user__username', 'order__user__email', 'title')
    readonly_fields = ('accepted_at',)
    raw_id_fields = ('order',)

    def order_user(self, obj):
        return obj.order.user.username
    order_user.short_description = 'User'
    order_user.admin_order_field = 'order__user__username'

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('order__user')


@admin.register(OrderPreference)
class OrderPreferenceAdmin(admin.ModelAdmin):
    list_display = ('id', 'order', 'preference_type', 'preference_key', 'is_submitted')
    list_filter = ('preference_type', 'is_submitted')
    search_fields = ('order__user__username', 'preference_key')
    raw_id_fields = ('order',)


@admin.register(OrderContact)
class OrderContactAdmin(admin.ModelAdmin):
    list_display = ('id', 'order', 'email_address', 'mobile_phone', 'created_at')
    search_fields = ('order__user__username', 'email_address')
    raw_id_fields = ('order',)


@admin.register(OrderDelivery)
class OrderDeliveryAdmin(admin.ModelAdmin):
    list_display = ('id', 'order', 'delivery_address_type',
                    'invoice_address_type', 'created_at')
    list_filter = ('delivery_address_type', 'invoice_address_type')
    raw_id_fields = ('order',)
