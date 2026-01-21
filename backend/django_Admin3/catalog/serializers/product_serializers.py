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

from catalog.models import Product, ProductVariation


class ProductVariationSerializer(serializers.ModelSerializer):
    """
    Serializer for ProductVariation model.

    Fields:
        id (int): Primary key
        variation_type (str): Type category (eBook, Printed, Hub, Marking, Tutorial)
        name (str): Variation display name
        description (str): Full description
    """

    class Meta:
        model = ProductVariation
        fields = ['id', 'variation_type', 'name', 'description']


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
