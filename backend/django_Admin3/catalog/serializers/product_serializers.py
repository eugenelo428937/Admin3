"""
Product serializers for the catalog API.

Location: catalog/serializers/product_serializers.py
Models: catalog.models.Product, catalog.models.ProductVariation

Contract (from contracts/serializers.md):
- ProductVariationSerializer: id, variation_type, name, description
- ProductSerializer: id, fullname, shortname, product_name, description, code,
                     type, variations, created_at, updated_at, is_active, buy_both
- type is computed from product groups
- variations is a nested list of ProductVariation objects
"""
from rest_framework import serializers

from catalog.models import (
    Product,
    ProductVariation,
    ProductProductVariation,
    ProductBundle,
    ProductBundleProduct,
    ProductVariationRecommendation,
)


class ProductVariationSerializer(serializers.ModelSerializer):
    """
    Serializer for ProductVariation model.

    Fields:
        id (int): Primary key
        variation_type (str): Type category (eBook, Printed, Hub, Marking, Tutorial)
        name (str): Variation display name
        description (str): Full description
        description_short (str): Short description
        code (str): Unique code
    """

    class Meta:
        model = ProductVariation
        fields = ['id', 'variation_type', 'name', 'description', 'description_short', 'code']


class ProductProductVariationAdminSerializer(serializers.ModelSerializer):
    """Admin serializer for ProductProductVariation CRUD."""

    class Meta:
        model = ProductProductVariation
        fields = ['id', 'product', 'product_variation']
        read_only_fields = ['id']


class ProductProductVariationDetailSerializer(serializers.ModelSerializer):
    """Read-only serializer for PPV with nested variation details."""
    variation_name = serializers.CharField(source='product_variation.name', read_only=True)
    variation_code = serializers.CharField(source='product_variation.code', read_only=True)
    variation_type = serializers.CharField(source='product_variation.variation_type', read_only=True)

    class Meta:
        model = ProductProductVariation
        fields = ['id', 'product', 'product_variation', 'variation_name', 'variation_code', 'variation_type']
        read_only_fields = ['id']


class ProductBundleAdminSerializer(serializers.ModelSerializer):
    """Admin serializer for ProductBundle CRUD."""

    class Meta:
        model = ProductBundle
        fields = [
            'id', 'bundle_name', 'subject', 'bundle_description',
            'is_featured', 'is_active', 'display_order',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ProductBundleProductAdminSerializer(serializers.ModelSerializer):
    """Admin serializer for ProductBundleProduct CRUD."""

    class Meta:
        model = ProductBundleProduct
        fields = [
            'id', 'bundle', 'product_product_variation',
            'default_price_type', 'quantity', 'sort_order', 'is_active',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ProductBundleProductDetailSerializer(serializers.ModelSerializer):
    """Read-only serializer for BundleProduct with nested product and variation details."""
    product_name = serializers.CharField(
        source='product_product_variation.product.shortname', read_only=True
    )
    product_code = serializers.CharField(
        source='product_product_variation.product.code', read_only=True
    )
    variation_name = serializers.CharField(
        source='product_product_variation.product_variation.name', read_only=True
    )
    variation_code = serializers.CharField(
        source='product_product_variation.product_variation.code', read_only=True
    )

    class Meta:
        model = ProductBundleProduct
        fields = [
            'id', 'bundle', 'product_product_variation',
            'product_name', 'product_code', 'variation_name', 'variation_code',
            'default_price_type', 'quantity', 'sort_order', 'is_active',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class RecommendationListSerializer(serializers.ModelSerializer):
    """Read-only list serializer with human-readable PPV labels."""
    source_product_code = serializers.CharField(
        source='product_product_variation.product.code', read_only=True
    )
    source_variation_name = serializers.CharField(
        source='product_product_variation.product_variation.name', read_only=True
    )
    recommended_product_code = serializers.CharField(
        source='recommended_product_product_variation.product.code', read_only=True
    )
    recommended_variation_name = serializers.CharField(
        source='recommended_product_product_variation.product_variation.name', read_only=True
    )

    class Meta:
        model = ProductVariationRecommendation
        fields = [
            'id',
            'product_product_variation',
            'source_product_code', 'source_variation_name',
            'recommended_product_product_variation',
            'recommended_product_code', 'recommended_variation_name',
            'created_at', 'updated_at',
        ]


class RecommendationAdminSerializer(serializers.ModelSerializer):
    """Admin serializer for ProductVariationRecommendation CRUD."""

    class Meta:
        model = ProductVariationRecommendation
        fields = [
            'id', 'product_product_variation',
            'recommended_product_product_variation',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate(self, data):
        """Prevent self-reference (source PPV == recommended PPV)."""
        ppv = data.get('product_product_variation')
        rec_ppv = data.get('recommended_product_product_variation')
        if ppv and rec_ppv and ppv == rec_ppv:
            raise serializers.ValidationError(
                "A product-variation combination cannot recommend itself."
            )
        return data


class ProductSerializer(serializers.ModelSerializer):
    """
    Serializer for Product model with computed type and nested variations.

    Provides:
    - product_name: Read-only alias for shortname (frontend compatibility)
    - type: Computed from product groups (Tutorial, Markings, or Material)
    - variations: Nested list of ProductVariation objects with prices

    Fields:
        id (int): Primary key
        fullname (str): Full product name
        shortname (str): Short display name
        product_name (str): Read-only alias for shortname
        description (str): Product description
        code (str): Product code
        type (str): Computed - "Tutorial", "Markings", or "Material"
        variations (list): Nested variation objects
        created_at (datetime): Creation timestamp (read-only)
        updated_at (datetime): Last update timestamp (read-only)
        is_active (bool): Active status
        buy_both (bool): Buy-both option flag
    """
    # Frontend compatibility: product_name aliases shortname
    product_name = serializers.CharField(source='shortname', read_only=True)

    # Computed fields
    type = serializers.SerializerMethodField()
    variations = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'fullname', 'shortname', 'product_name', 'description', 'code',
            'type', 'variations', 'created_at', 'updated_at', 'is_active', 'buy_both'
        ]
        read_only_fields = ['created_at', 'updated_at']

    def get_type(self, obj):
        """
        Determine product type based on product groups.

        Returns:
            str: "Tutorial" if product is in Tutorial group,
                 "Markings" if product is in Marking group,
                 "Material" otherwise (default)
        """
        group_names = [group.name for group in obj.groups.all()]

        if 'Tutorial' in group_names:
            return 'Tutorial'
        elif 'Marking' in group_names:
            return 'Markings'
        return 'Material'  # Default type

    def get_variations(self, obj):
        """
        Get product variations with their details.

        Returns:
            list: List of variation dicts with id, name, variation_type,
                  description, and prices (empty list placeholder)
        """
        variations = []
        for variation in obj.product_variations.all():
            variations.append({
                'id': variation.id,
                'name': variation.name,
                'variation_type': variation.variation_type,
                'description': variation.description,
                'prices': []  # Prices loaded separately if needed
            })
        return variations
