"""Bundle serializers for the store app."""
from rest_framework import serializers
from store.models import Bundle, BundleProduct


class BundleComponentPriceSerializer(serializers.Serializer):
    """Serializer for prices within a bundle component."""
    price_type = serializers.CharField()
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, coerce_to_string=True)
    currency = serializers.CharField()


class BundleComponentProductSerializer(serializers.Serializer):
    """Serializer for the nested product object within a component."""
    id = serializers.IntegerField()
    fullname = serializers.CharField()


class BundleComponentProductVariationSerializer(serializers.Serializer):
    """Serializer for the nested product variation within a component."""
    id = serializers.IntegerField()
    name = serializers.CharField()
    variation_type = serializers.CharField(allow_null=True)
    description_short = serializers.CharField(allow_null=True)


class BundleComponentSerializer(serializers.ModelSerializer):
    """
    Serializer for bundle components (products within a bundle).

    Returns nested product, product_variation, and prices data
    expected by the frontend bundleService.js.
    """
    product_code = serializers.CharField(
        source='product.product_code',
        read_only=True
    )
    exam_session_product_id = serializers.IntegerField(
        source='product.id',
        read_only=True
    )
    product = serializers.SerializerMethodField()
    product_variation = serializers.SerializerMethodField()
    prices = serializers.SerializerMethodField()

    class Meta:
        model = BundleProduct
        fields = [
            'id',
            'product_code',
            'exam_session_product_id',
            'product',
            'product_variation',
            'prices',
            'default_price_type',
            'quantity',
            'sort_order',
        ]

    def get_product(self, obj):
        """Get nested product object with id and fullname."""
        store_product = obj.product
        ppv = getattr(store_product, 'product_product_variation', None)

        # Get product info from the linked catalog product if available
        if ppv and ppv.product:
            return {
                'id': ppv.product.id,
                'fullname': ppv.product.fullname or store_product.product_code,
            }

        # Fallback to store product
        return {
            'id': store_product.id,
            'fullname': store_product.product_code,
        }

    def get_product_variation(self, obj):
        """Get nested product variation object if available."""
        store_product = obj.product
        ppv = getattr(store_product, 'product_product_variation', None)

        if ppv and ppv.product_variation:
            pv = ppv.product_variation
            return {
                'id': pv.id,
                'name': pv.name,
                'variation_type': pv.variation_type,
                'description_short': pv.description_short,
            }
        return None

    def get_prices(self, obj):
        """Get prices for this component."""
        store_product = obj.product
        prices = store_product.prices.all()
        return [
            {
                'price_type': price.price_type,
                'amount': str(price.amount),
                'currency': price.currency,
            }
            for price in prices
        ]


class BundleProductSerializer(serializers.ModelSerializer):
    """Legacy serializer for products within a bundle (simple format)."""
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

    Returns 'components' field with nested product/variation/prices data
    expected by the frontend bundleService.js for cart processing.
    """
    name = serializers.CharField(read_only=True)
    description = serializers.CharField(read_only=True)
    bundle_name = serializers.CharField(source='name', read_only=True)
    components = serializers.SerializerMethodField()
    components_count = serializers.SerializerMethodField()
    subject_code = serializers.CharField(
        source='exam_session_subject.subject.code',
        read_only=True
    )
    exam_session_code = serializers.CharField(
        source='exam_session_subject.exam_session.session_code',
        read_only=True
    )

    class Meta:
        model = Bundle
        fields = [
            'id',
            'name',
            'bundle_name',
            'description',
            'is_active',
            'display_order',
            'subject_code',
            'exam_session_code',
            'bundle_template',
            'exam_session_subject',
            'components',
            'components_count',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']

    def get_components(self, obj):
        """Get active bundle products as components with full nested data."""
        active_products = obj.bundle_products.filter(
            is_active=True
        ).select_related(
            'product__product_product_variation__product',
            'product__product_product_variation__product_variation',
        ).prefetch_related(
            'product__prices'
        ).order_by('sort_order')

        return BundleComponentSerializer(active_products, many=True).data

    def get_components_count(self, obj):
        """Get count of active components."""
        return obj.bundle_products.filter(is_active=True).count()


class BundleListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for bundle lists."""
    name = serializers.CharField(read_only=True)
    product_count = serializers.SerializerMethodField()

    class Meta:
        model = Bundle
        fields = ['id', 'name', 'is_active', 'display_order', 'product_count']

    def get_product_count(self, obj):
        return obj.bundle_products.filter(is_active=True).count()
