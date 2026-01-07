"""
Exam session serializers for the catalog API.

Location: catalog/serializers/exam_session_serializers.py
Model: catalog.models.ExamSession

Contract (from contracts/serializers.md):
- Fields: id, session_code, start_date, end_date, create_date, modified_date
- create_date and modified_date are read-only
"""
from rest_framework import serializers

from catalog.models import ExamSession


class ExamSessionSerializer(serializers.ModelSerializer):
    """
    Serializer for ExamSession model.

    Timestamps (create_date, modified_date) are read-only as they are
    auto-managed by Django.

    Fields:
        id (int): Primary key
        session_code (str): Session identifier (e.g., "2026-04")
        start_date (datetime): Session start date
        end_date (datetime): Session end date
        create_date (datetime): Auto-set on creation (read-only)
        modified_date (datetime): Auto-updated on save (read-only)
    """

    class Meta:
        model = ExamSession
        fields = ['id', 'session_code', 'start_date', 'end_date', 'create_date', 'modified_date']
        read_only_fields = ['create_date', 'modified_date']
