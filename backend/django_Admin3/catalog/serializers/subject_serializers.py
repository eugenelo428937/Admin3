"""
Subject serializers for the catalog API.

Location: catalog/serializers/subject_serializers.py
Model: catalog.models.Subject

Contract (from contracts/serializers.md):
- Fields: id, code, description, name, active, subject_type, subject_type_display
- name is a read-only alias for description (frontend compatibility)
- subject_type_display is a read-only label sourced from get_subject_type_display
"""
from rest_framework import serializers

from catalog.models import Subject


class SubjectSerializer(serializers.ModelSerializer):
    """
    Serializer for Subject model.

    Provides a `name` field that aliases `description` for frontend compatibility.
    Provides a `subject_type_display` field that returns the human-readable
    label for the `subject_type` enum (e.g. 'UK Exam').

    Fields:
        id (int): Primary key
        code (str): Subject code (e.g., "CM2"), max 10 chars
        description (str): Full subject name
        name (str): Read-only alias for description
        active (bool): Whether the subject is currently active
        subject_type (str): One of 'UK', 'SA', 'CAA', 'PMS'
        subject_type_display (str): Read-only human label
    """
    # Frontend compatibility: name aliases description
    name = serializers.CharField(source='description', read_only=True)
    # Human-readable label for the subject_type enum (e.g. 'UK Exam')
    subject_type_display = serializers.CharField(
        source='get_subject_type_display', read_only=True
    )

    class Meta:
        model = Subject
        fields = [
            'id',
            'code',
            'description',
            'name',
            'active',
            'subject_type',
            'subject_type_display',
        ]
