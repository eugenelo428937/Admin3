"""Product serializers for the store app."""
from rest_framework import serializers
from store.models import Product


class ProductSerializer(serializers.ModelSerializer):
    """
    Serializer for store.Product model.

    Provides product data with related ESS and PPV information.
    """
    subject_code = serializers.CharField(
        source='exam_session_subject.subject.code',
        read_only=True
    )
    session_code = serializers.CharField(
        source='exam_session_subject.exam_session.session_code',
        read_only=True
    )
    variation_type = serializers.CharField(
        source='product_product_variation.product_variation.variation_type',
        read_only=True
    )
    product_name = serializers.CharField(
        source='product_product_variation.product.fullname',
        read_only=True
    )

    class Meta:
        model = Product
        fields = [
            'id',
            'product_code',
            'is_active',
            'subject_code',
            'session_code',
            'variation_type',
            'product_name',
            'exam_session_subject',
            'product_product_variation',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['product_code', 'created_at', 'updated_at']


class ProductListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for product lists."""
    subject_code = serializers.CharField(
        source='exam_session_subject.subject.code',
        read_only=True
    )

    class Meta:
        model = Product
        fields = ['id', 'product_code', 'subject_code', 'is_active']
