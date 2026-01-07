"""
Products serializers - PARTIAL DEPRECATION.

This module contains:
1. Re-exports from catalog.serializers for backward compatibility (DEPRECATED)
2. Filter system serializers that remain in products app (NOT migrated)

DEPRECATED (use catalog.serializers instead):
- ProductSerializer, ProductVariationSerializer
- ProductBundleSerializer, ProductBundleProductSerializer
- ExamSessionSubjectBundleSerializer, ExamSessionSubjectBundleProductSerializer

NOT DEPRECATED (filter system - stays here):
- FilterGroupSerializer, FilterGroupThreeLevelSerializer
- ProductGroupFilterSerializer, FilterGroupWithProductsSerializer

See: specs/002-catalog-api-consolidation/
"""
import warnings

# ============================================================
# DEPRECATED - Re-exports from catalog (use catalog.serializers)
# ============================================================
from catalog.serializers import (
    ProductSerializer,
    ProductVariationSerializer,
    ProductBundleSerializer,
    ProductBundleProductSerializer,
    ExamSessionSubjectBundleSerializer,
    ExamSessionSubjectBundleProductSerializer,
)

# Emit deprecation warning for catalog re-exports
warnings.warn(
    "Importing ProductSerializer, ProductVariationSerializer, ProductBundleSerializer, "
    "ProductBundleProductSerializer, ExamSessionSubjectBundleSerializer, "
    "ExamSessionSubjectBundleProductSerializer from products.serializers is deprecated. "
    "Use 'from catalog.serializers import ...' instead.",
    DeprecationWarning,
    stacklevel=2
)

# ============================================================
# NOT DEPRECATED - Filter system serializers (stay in products app)
# ============================================================
from rest_framework import serializers
from .models import Product
from .models.filter_system import FilterGroup
from .models.product_group_filter import ProductGroupFilter


class FilterGroupSerializer(serializers.ModelSerializer):
    """Serializer for filter groups with recursive children."""
    children = serializers.SerializerMethodField()

    class Meta:
        model = FilterGroup
        fields = ['id', 'name', 'parent', 'children']

    def get_children(self, obj):
        return FilterGroupSerializer(obj.children.all(), many=True).data


class FilterGroupThreeLevelSerializer(serializers.ModelSerializer):
    """Serializer for filter groups up to three levels deep."""
    children = serializers.SerializerMethodField()

    class Meta:
        model = FilterGroup
        fields = ['id', 'name', 'parent', 'children']

    def get_children(self, obj):
        # Level 2
        return [
            {
                **FilterGroupThreeLevelSerializer(child).data,
                'children': [
                    FilterGroupThreeLevelSerializer(grandchild).data
                    for grandchild in child.children.all()
                ]
            }
            for child in obj.children.all()
        ]


class ProductGroupFilterSerializer(serializers.ModelSerializer):
    """Serializer for product group filters with associated groups."""
    groups = serializers.SerializerMethodField()

    class Meta:
        model = ProductGroupFilter
        fields = ['id', 'name', 'filter_type', 'groups']

    def get_groups(self, obj):
        return [
            {
                'id': group.id,
                'name': group.name,
                'parent': group.parent_id,
            }
            for group in obj.groups.all()
        ]


class FilterGroupWithProductsSerializer(serializers.ModelSerializer):
    """Serializer for filter groups with their products."""
    products = serializers.SerializerMethodField()

    class Meta:
        model = FilterGroup
        fields = ['id', 'name', 'products']

    def get_products(self, obj):
        # Get active products in this group (catalog_products is the related_name after catalog consolidation)
        products = obj.catalog_products.filter(is_active=True).order_by('shortname')
        return [
            {
                'id': product.id,
                'shortname': product.shortname,
                'fullname': product.fullname,
                'code': product.code,
            }
            for product in products
        ]


__all__ = [
    # Deprecated re-exports from catalog
    'ProductSerializer',
    'ProductVariationSerializer',
    'ProductBundleSerializer',
    'ProductBundleProductSerializer',
    'ExamSessionSubjectBundleSerializer',
    'ExamSessionSubjectBundleProductSerializer',
    # Filter system serializers (not deprecated)
    'FilterGroupSerializer',
    'FilterGroupThreeLevelSerializer',
    'ProductGroupFilterSerializer',
    'FilterGroupWithProductsSerializer',
]
