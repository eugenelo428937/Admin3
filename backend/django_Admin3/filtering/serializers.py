"""
Filtering serializers.

Serializers for filter groups and related models.
"""
from rest_framework import serializers
from .models import FilterGroup, FilterConfigurationGroup


class FilterGroupSerializer(serializers.ModelSerializer):
    """Serializer for flat filter groups (parent hierarchy removed in migration 0012)."""

    class Meta:
        model = FilterGroup
        fields = ['id', 'name']


class FilterConfigurationGroupSerializer(serializers.Serializer):
    """Serializer for filter groups within a FilterConfiguration.

    Returns the group data needed for filter partitioning: id, name,
    code, display_order, is_default.
    """
    id = serializers.IntegerField(source='filter_group.id')
    name = serializers.CharField(source='filter_group.name')
    code = serializers.CharField(source='filter_group.code', allow_null=True)
    display_order = serializers.IntegerField()
    is_default = serializers.BooleanField()


class ProductGroupFilterSerializer(serializers.ModelSerializer):
    """Serializer for product group filters (flat model — parent hierarchy removed in migration 0012)."""
    groups = serializers.SerializerMethodField()

    class Meta:
        model = FilterGroup
        fields = ['id', 'name', 'groups']

    def get_groups(self, obj):
        return []


