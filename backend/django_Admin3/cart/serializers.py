from rest_framework import serializers
from .models import Cart, CartItem, ActedOrder, ActedOrderItem

class CartItemSerializer(serializers.ModelSerializer):
    subject_code = serializers.CharField(source='product.exam_session_subject.subject.code', read_only=True)
    product_name = serializers.CharField(source='product.product.fullname', read_only=True)
    product_code = serializers.CharField(source='product.product.code', read_only=True)
    exam_session_code = serializers.CharField(source='product.exam_session_subject.exam_session.session_code', read_only=True)
    product_type = serializers.SerializerMethodField()
    current_product = serializers.IntegerField(source='product.id', read_only=True)
    product_id = serializers.IntegerField(source='product.product.id', read_only=True)

    class Meta:
        model = CartItem
        fields = ['id', 'current_product', 'product_id', 'product_name', 'product_code', 'subject_code', 'exam_session_code', 'product_type', 'quantity', 'price_type', 'actual_price', 'metadata', 'is_marking', 'has_expired_deadline']

    def get_product_type(self, obj):
        """Determine product type based on product name or group"""
        product_name = obj.product.product.fullname.lower()
        
        if hasattr(obj.product.product, 'group_name') and obj.product.product.group_name:
            group_name = obj.product.product.group_name.lower()
            if 'tutorial' in group_name:
                return 'tutorial'
            elif 'marking' in group_name:
                return 'marking'
        
        # Fallback to product name if group_name is not available
        if 'tutorial' in product_name:
            return 'tutorial'
        elif 'marking' in product_name:
            return 'marking'
        
        return 'material'

class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)

    class Meta:
        model = Cart
        fields = ['id', 'user', 'session_key', 'items', 'created_at', 'updated_at', 'has_marking']

class ActedOrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.product.fullname', read_only=True)
    product_code = serializers.CharField(source='product.product.code', read_only=True)
    subject_code = serializers.CharField(source='product.exam_session_subject.subject.code', read_only=True)
    exam_session_code = serializers.CharField(source='product.exam_session_subject.exam_session.session_code', read_only=True)
    product_type = serializers.SerializerMethodField()

    class Meta:
        model = ActedOrderItem
        fields = ['id', 'product', 'product_name', 'product_code', 'subject_code', 'exam_session_code', 'product_type', 'quantity', 'price_type', 'actual_price', 'metadata']

    def get_product_type(self, obj):
        """Determine product type based on product name or group"""
        product_name = obj.product.product.fullname.lower()
        
        if hasattr(obj.product.product, 'group_name') and obj.product.product.group_name:
            group_name = obj.product.product.group_name.lower()
            if 'tutorial' in group_name:
                return 'tutorial'
            elif 'marking' in group_name:
                return 'marking'
        
        # Fallback to product name if group_name is not available
        if 'tutorial' in product_name:
            return 'tutorial'
        elif 'marking' in product_name:
            return 'marking'
        
        return 'material'

class ActedOrderSerializer(serializers.ModelSerializer):
    items = ActedOrderItemSerializer(many=True, read_only=True)
    user = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = ActedOrder
        fields = ['id', 'user', 'created_at', 'updated_at', 'items']
