from rest_framework import serializers
from .models import Cart, CartItem, ActedOrder, ActedOrderItem

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

class ActedOrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.product.fullname', read_only=True)
    product_code = serializers.CharField(source='product.product.code', read_only=True)
    subject_code = serializers.CharField(source='product.exam_session_subject.subject.code', read_only=True)

    class Meta:
        model = ActedOrderItem
        fields = ['id', 'product', 'product_name', 'product_code', 'subject_code', 'quantity']

class ActedOrderSerializer(serializers.ModelSerializer):
    items = ActedOrderItemSerializer(many=True, read_only=True)
    user = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = ActedOrder
        fields = ['id', 'user', 'created_at', 'updated_at', 'items']
