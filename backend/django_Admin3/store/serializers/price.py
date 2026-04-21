"""Price serializers for the store app."""
from rest_framework import serializers
from rest_framework.validators import UniqueTogetherValidator
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
        # Release B (Task 22): the model-level unique_together is now
        # (purchasable, price_type). Because the serializer exposes the
        # legacy `product` FK (not `purchasable`), DRF's auto-generated
        # UniqueTogetherValidator cannot operate. Price.save() guarantees
        # purchasable_id == product_id (MTI parent pointer), so validating
        # (product, price_type) is equivalent and keeps duplicate POSTs
        # returning 400 instead of leaking an IntegrityError.
        validators = [
            UniqueTogetherValidator(
                queryset=Price.objects.all(),
                fields=('product', 'price_type'),
            ),
        ]


class PriceListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for price lists."""

    class Meta:
        model = Price
        fields = ['id', 'price_type', 'amount', 'currency']
