"""Unified serializers for combined product and bundle listings.

These serializers provide a consistent format for displaying both
individual products and bundles in the store product listing, with
an `is_bundle` flag to distinguish between them.
"""
from rest_framework import serializers
from store.models import Product, Bundle


class UnifiedProductSerializer(serializers.ModelSerializer):
    """
    Serializer for store.Product in unified listing format.

    Provides product data with is_bundle=False for frontend rendering.
    """
    is_bundle = serializers.SerializerMethodField()
    name = serializers.SerializerMethodField()
    subject_code = serializers.CharField(
        source='exam_session_subject.subject.code',
        read_only=True
    )
    subject_name = serializers.CharField(
        source='exam_session_subject.subject.description',
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
    variation_name = serializers.CharField(
        source='product_product_variation.product_variation.name',
        read_only=True
    )
    product_name = serializers.CharField(
        source='product_product_variation.product.fullname',
        read_only=True
    )
    product_shortname = serializers.CharField(
        source='product_product_variation.product.shortname',
        read_only=True
    )

    class Meta:
        model = Product
        fields = [
            'id',
            'product_code',
            'is_active',
            'is_bundle',
            'name',
            'subject_code',
            'subject_name',
            'session_code',
            'variation_type',
            'variation_name',
            'product_name',
            'product_shortname',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['product_code', 'created_at', 'updated_at']

    def get_is_bundle(self, obj):
        """Products are never bundles."""
        return False

    def get_name(self, obj):
        """Get display name from product variation."""
        ppv = obj.product_product_variation
        if ppv and ppv.product:
            return ppv.product.fullname
        return obj.product_code


class BundleComponentPriceSerializer(serializers.Serializer):
    """Serializer for price data within a bundle component."""
    price_type = serializers.CharField(read_only=True)
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    currency = serializers.CharField(read_only=True)


class BundleComponentSerializer(serializers.Serializer):
    """
    Serializer for individual products within a bundle.

    Returns data in the format BundleCard.js expects:
    - product: { id, fullname }
    - product_variation: { id, name, variation_type }
    - prices: [{ price_type, amount, currency }]
    """
    id = serializers.IntegerField(source='product.id', read_only=True)
    product_code = serializers.CharField(source='product.product_code', read_only=True)
    product = serializers.SerializerMethodField()
    product_variation = serializers.SerializerMethodField()
    prices = serializers.SerializerMethodField()
    default_price_type = serializers.CharField(read_only=True)
    quantity = serializers.IntegerField(read_only=True)
    sort_order = serializers.IntegerField(read_only=True)

    def get_product(self, obj):
        """Get nested product object with fullname."""
        ppv = obj.product.product_product_variation
        if ppv and ppv.product:
            return {
                'id': ppv.product.id,
                'fullname': ppv.product.fullname,
            }
        return {
            'id': obj.product.id,
            'fullname': obj.product.product_code,
        }

    def get_product_variation(self, obj):
        """Get nested product_variation object."""
        ppv = obj.product.product_product_variation
        if ppv and ppv.product_variation:
            return {
                'id': ppv.product_variation.id,
                'name': ppv.product_variation.name,
                'variation_type': ppv.product_variation.variation_type,
            }
        return None

    def get_prices(self, obj):
        """Get prices array for the bundle component's store product."""
        prices = obj.product.prices.all()
        return BundleComponentPriceSerializer(prices, many=True).data


class UnifiedBundleSerializer(serializers.ModelSerializer):
    """
    Serializer for store.Bundle in unified listing format.

    Provides bundle data with is_bundle=True for frontend rendering.
    Includes nested components (products in the bundle).
    """
    is_bundle = serializers.SerializerMethodField()
    # Use computed name property which returns override or template name
    name = serializers.CharField(read_only=True)
    # Alias for BundleCard.js compatibility (expects bundle_name)
    bundle_name = serializers.CharField(source='name', read_only=True)
    description = serializers.CharField(read_only=True)
    subject_code = serializers.CharField(
        source='exam_session_subject.subject.code',
        read_only=True
    )
    subject_name = serializers.CharField(
        source='exam_session_subject.subject.description',
        read_only=True
    )
    session_code = serializers.CharField(
        source='exam_session_subject.exam_session.session_code',
        read_only=True
    )
    # Alias for BundleCard.js compatibility (expects exam_session_code)
    exam_session_code = serializers.CharField(
        source='exam_session_subject.exam_session.session_code',
        read_only=True
    )
    product_count = serializers.SerializerMethodField()
    # Alias for BundleCard.js compatibility (expects components_count)
    components_count = serializers.SerializerMethodField()
    components = serializers.SerializerMethodField()
    # Include bundle template info
    bundle_template_id = serializers.IntegerField(
        source='bundle_template.id',
        read_only=True
    )
    is_featured = serializers.BooleanField(
        source='bundle_template.is_featured',
        read_only=True
    )

    class Meta:
        model = Bundle
        fields = [
            'id',
            'is_active',
            'is_bundle',
            'name',
            'bundle_name',  # Alias for BundleCard.js
            'description',
            'subject_code',
            'subject_name',
            'session_code',
            'exam_session_code',  # Alias for BundleCard.js
            'display_order',
            'product_count',
            'components_count',  # Alias for BundleCard.js
            'components',
            'bundle_template_id',
            'is_featured',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']

    def get_is_bundle(self, obj):
        """Bundles are always bundles."""
        return True

    def get_product_count(self, obj):
        """Get count of active products in this bundle."""
        return obj.bundle_products.filter(is_active=True).count()

    def get_components_count(self, obj):
        """Alias for product_count for BundleCard.js compatibility."""
        return obj.bundle_products.filter(is_active=True).count()

    def get_components(self, obj):
        """Get the products included in this bundle."""
        bundle_products = obj.bundle_products.filter(
            is_active=True
        ).select_related(
            'product__product_product_variation__product',
            'product__product_product_variation__product_variation',
        ).prefetch_related(
            'product__prices',  # Prefetch prices to avoid N+1 queries
        ).order_by('sort_order')
        return BundleComponentSerializer(bundle_products, many=True).data
