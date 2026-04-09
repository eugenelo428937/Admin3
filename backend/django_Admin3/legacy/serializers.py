"""Serializers for the legacy product archive."""
from rest_framework import serializers
from .models import LegacyProduct


class LegacyProductSerializer(serializers.ModelSerializer):
    """Flat serializer for legacy product search results."""

    class Meta:
        model = LegacyProduct
        fields = [
            'id',
            'subject_code',
            'delivery_format',
            'product_template_code',
            'session_code',
            'full_code',
            'legacy_product_name',
            'short_name',
            'normalized_name',
        ]
