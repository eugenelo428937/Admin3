from django.contrib import admin
from .models import Cart, CartItem, CartFee


@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'session_key', 'created_at', 'updated_at')
    search_fields = ('user__username', 'session_key')
    list_filter = ('created_at', 'updated_at')


@admin.register(CartItem)
class CartItemAdmin(admin.ModelAdmin):
    list_display = ('id', 'cart', 'product', 'quantity', 'price_type', 'actual_price', 'added_at')
    search_fields = ('cart__user__username', 'cart__session_key')
    list_filter = ('price_type', 'added_at')


@admin.register(CartFee)
class CartFeeAdmin(admin.ModelAdmin):
    list_display = ('id', 'cart', 'fee_type', 'name', 'amount_display', 'is_refundable', 'applied_at')
    search_fields = ('cart__user__username', 'name', 'description')
    list_filter = ('fee_type', 'is_refundable', 'applied_at', 'currency')
    raw_id_fields = ('cart',)
    readonly_fields = ('applied_at',)

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('cart__user')
