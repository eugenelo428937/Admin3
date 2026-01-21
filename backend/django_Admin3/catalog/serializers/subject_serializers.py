"""
Subject serializers for the catalog API.

Location: catalog/serializers/subject_serializers.py
Model: catalog.models.Subject

Contract (from contracts/serializers.md):
- Fields: id, code, description, name
- name is a read-only alias for description (frontend compatibility)
"""
from rest_framework import serializers

from catalog.models import Subject


class SubjectSerializer(serializers.ModelSerializer):
    """
    Serializer for Subject model.

    Provides a `name` field that aliases `description` for frontend compatibility.
    The frontend uses `name` for display purposes, while the database stores
    the value in `description`.

    Fields:
        id (int): Primary key
        code (str): Subject code (e.g., "CM2"), max 10 chars
        description (str): Full subject name
        name (str): Read-only alias for description
    """
    # Frontend compatibility: name aliases description
    name = serializers.CharField(source='description', read_only=True)

    class Meta:
        model = Subject
        fields = ['id', 'code', 'description', 'name']
