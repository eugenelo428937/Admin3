"""
Filtering serializers.

Serializers for filter groups and related models.
"""
from rest_framework import serializers
from .models import FilterGroup


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
