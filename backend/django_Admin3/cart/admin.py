from django.contrib import admin
from .models import Cart, CartItem, ActedOrder, ActedOrderItem

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
