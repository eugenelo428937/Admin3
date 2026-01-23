"""
Filtering serializers.

Serializers for filter groups and related models.
"""
from rest_framework import serializers
from .models import FilterGroup, ProductGroupFilter


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
