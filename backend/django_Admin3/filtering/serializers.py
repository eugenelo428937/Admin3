"""
Filtering serializers.

Serializers for filter groups and related models.
"""
from rest_framework import serializers
from .models import FilterGroup, FilterConfigurationGroup


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


class FilterConfigurationGroupSerializer(serializers.Serializer):
    """Serializer for filter groups within a FilterConfiguration.

    Returns the group data needed for filter partitioning: id, name,
    code, display_order, is_default, parent_id.
    """
    id = serializers.IntegerField(source='filter_group.id')
    name = serializers.CharField(source='filter_group.name')
    code = serializers.CharField(source='filter_group.code', allow_null=True)
    display_order = serializers.IntegerField()
    is_default = serializers.BooleanField()
    parent_id = serializers.IntegerField(source='filter_group.parent_id', allow_null=True)


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
