from rest_framework import serializers
from .models import MarkingVoucher


class MarkingVoucherSerializer(serializers.ModelSerializer):
    """Serializer for marking vouchers"""
    
    is_available = serializers.ReadOnlyField()
    
    class Meta:
        model = MarkingVoucher
        fields = [
            'id', 'code', 'name', 'description', 'price',
            'is_active', 'expiry_date', 'is_available',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class AddMarkingVoucherToCartSerializer(serializers.Serializer):
    """Serializer for adding marking voucher to cart"""
    
    voucher_id = serializers.IntegerField()
    quantity = serializers.IntegerField(default=1, min_value=1)
    
    def validate_voucher_id(self, value):
        try:
            voucher = MarkingVoucher.objects.get(id=value)
            if not voucher.is_available:
                raise serializers.ValidationError("Voucher is not available")
        except MarkingVoucher.DoesNotExist:
            raise serializers.ValidationError("Voucher not found")
        return value
    
    def validate_quantity(self, value):
        if value < 1:
            raise serializers.ValidationError("Quantity must be at least 1")
        return value