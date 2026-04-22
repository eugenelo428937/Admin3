"""Price serializers for the store app."""
from rest_framework import serializers
from rest_framework.validators import UniqueTogetherValidator
from store.models import Price


class PriceSerializer(serializers.ModelSerializer):
    """
    Serializer for store.Price model.

    Provides pricing information for a purchasable.
    """
    purchasable_code = serializers.CharField(
        source='purchasable.code',
        read_only=True
    )
    # Release B back-compat: frontend pact contract + older clients still
    # read `product` as an id. `purchasable` (the new canonical field) is
    # populated from the same FK column, so this just mirrors it when the
    # purchasable is a store.Product — null otherwise.
    product = serializers.SerializerMethodField()

    def get_product(self, obj):
        if obj.purchasable_id is None:
            return None
        kind = getattr(obj.purchasable, 'kind', None)
        return obj.purchasable_id if kind == 'product' else None

    class Meta:
        model = Price
        fields = [
            'id',
            'product',
            'purchasable',
            'purchasable_code',
            'price_type',
            'amount',
            'currency',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']
        # Task 23 (Release B): model-level unique_together is
        # (purchasable, price_type). Mirror it at the serializer so
        # duplicate POSTs return 400 rather than leaking an IntegrityError.
        validators = [
            UniqueTogetherValidator(
                queryset=Price.objects.all(),
                fields=('purchasable', 'price_type'),
            ),
        ]


class PriceListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for price lists."""

    class Meta:
        model = Price
        fields = ['id', 'price_type', 'amount', 'currency']
