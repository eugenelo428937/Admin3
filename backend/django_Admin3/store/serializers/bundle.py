"""Bundle serializers for the store app."""
from rest_framework import serializers
from store.models import Bundle, BundleProduct


class BundleProductSerializer(serializers.ModelSerializer):
    """Serializer for products within a bundle."""
    product_code = serializers.CharField(
        source='product.product_code',
        read_only=True
    )

    class Meta:
        model = BundleProduct
        fields = [
            'id',
            'product',
            'product_code',
            'default_price_type',
            'quantity',
            'sort_order',
            'is_active',
        ]


class BundleSerializer(serializers.ModelSerializer):
    """
    Serializer for store.Bundle model.

    Includes nested bundle products.
    """
    name = serializers.CharField(read_only=True)
    description = serializers.CharField(read_only=True)
    bundle_products = BundleProductSerializer(many=True, read_only=True)
    subject_code = serializers.CharField(
        source='exam_session_subject.subject.code',
        read_only=True
    )
    session_code = serializers.CharField(
        source='exam_session_subject.exam_session.session_code',
        read_only=True
    )

    class Meta:
        model = Bundle
        fields = [
            'id',
            'name',
            'description',
            'is_active',
            'display_order',
            'subject_code',
            'session_code',
            'bundle_template',
            'exam_session_subject',
            'bundle_products',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']


class BundleListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for bundle lists."""
    name = serializers.CharField(read_only=True)
    product_count = serializers.SerializerMethodField()

    class Meta:
        model = Bundle
        fields = ['id', 'name', 'is_active', 'display_order', 'product_count']

    def get_product_count(self, obj):
        return obj.bundle_products.filter(is_active=True).count()
