"""Admin serializers for legacy order archive."""
from rest_framework import serializers
from .models import LegacyOrder, LegacyOrderItem


class LegacyOrderItemSerializer(serializers.ModelSerializer):
    """Nested serializer for order line items."""

    full_code = serializers.CharField(
        source='product.full_code', default=None, read_only=True,
    )
    legacy_product_name = serializers.CharField(
        source='product.legacy_product_name', default=None, read_only=True,
    )

    class Meta:
        model = LegacyOrderItem
        fields = [
            'id',
            'order_no',
            'full_code',
            'legacy_product_name',
            'quantity',
            'price',
            'free_of_charge',
            'is_retaker',
            'is_reduced',
            'is_additional',
            'is_reduced_rate',
        ]


class LegacyOrderSerializer(serializers.ModelSerializer):
    """Order header with nested items and resolved student info.

    student_ref is an integer (not FK).  The viewset annotates
    first_name, last_name, email from the auth_user join so we
    expose them as read-only SerializerMethodFields.
    """

    first_name = serializers.CharField(read_only=True)
    last_name = serializers.CharField(read_only=True)
    email = serializers.CharField(read_only=True)
    items = LegacyOrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = LegacyOrder
        fields = [
            'id',
            'student_ref',
            'first_name',
            'last_name',
            'email',
            'order_date',
            'delivery_pref',
            'items',
        ]
