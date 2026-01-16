"""Price serializers for the store app."""
from rest_framework import serializers
from store.models import Price


class PriceSerializer(serializers.ModelSerializer):
    """
    Serializer for store.Price model.

    Provides pricing information for a product.
    """
    product_code = serializers.CharField(
        source='product.product_code',
        read_only=True
    )

    class Meta:
        model = Price
        fields = [
            'id',
            'product',
            'product_code',
            'price_type',
            'amount',
            'currency',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']


class PriceListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for price lists."""

    class Meta:
        model = Price
        fields = ['id', 'price_type', 'amount', 'currency']
