from django.contrib import admin
from .models import Cart, CartItem, CartFee, ActedOrder, ActedOrderItem, ActedOrderPayment

@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'session_key', 'created_at', 'updated_at')
    search_fields = ('user__username', 'session_key')
    list_filter = ('created_at', 'updated_at')

@admin.register(CartItem)
class CartItemAdmin(admin.ModelAdmin):
    list_display = ('id', 'cart', 'product', 'quantity', 'price_type', 'actual_price', 'added_at')
    search_fields = ('cart__user__username', 'cart__session_key', 'product__product_name')
    list_filter = ('price_type', 'added_at',)


@admin.register(CartFee)
class CartFeeAdmin(admin.ModelAdmin):
    list_display = ('id', 'cart', 'fee_type', 'name', 'amount_display', 'is_refundable', 'applied_at')
    search_fields = ('cart__user__username', 'name', 'description')
    list_filter = ('fee_type', 'is_refundable', 'applied_at', 'currency')
    raw_id_fields = ('cart',)
    readonly_fields = ('applied_at',)
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('cart__user')


@admin.register(ActedOrder)
class ActedOrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'created_at', 'updated_at')
    search_fields = ('user__username',)
    list_filter = ('created_at', 'updated_at')
    readonly_fields = ('created_at', 'updated_at')

@admin.register(ActedOrderItem)
class ActedOrderItemAdmin(admin.ModelAdmin):
    list_display = ('id', 'order', 'product', 'quantity', 'price_type', 'actual_price')
    search_fields = ('order__user__username', 'product__product_name')
    list_filter = ('price_type',)
    readonly_fields = ('order', 'product', 'quantity', 'price_type', 'actual_price')

@admin.register(ActedOrderPayment)
class ActedOrderPaymentAdmin(admin.ModelAdmin):
    list_display = ('id', 'order', 'payment_method', 'amount', 'status', 'created_at', 'transaction_id')
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
