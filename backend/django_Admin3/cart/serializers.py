from rest_framework import serializers
from .models import Cart, CartItem

class CartItemSerializer(serializers.ModelSerializer):
    subject_code = serializers.CharField(source='product.exam_session_subject.subject.code', read_only=True)
    product_name = serializers.CharField(source='product.product.fullname', read_only=True)
    product_code = serializers.CharField(source='product.product.code', read_only=True)

    class Meta:
        model = CartItem
        fields = ['id', 'product', 'product_name', 'product_code', 'subject_code', 'quantity']

class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)

    class Meta:
        model = Cart
        fields = ['id', 'user', 'session_key', 'items', 'created_at', 'updated_at']
