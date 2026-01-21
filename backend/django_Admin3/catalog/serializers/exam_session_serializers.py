"""
Exam session serializers for the catalog API.

Location: catalog/serializers/exam_session_serializers.py
Model: catalog.models.ExamSession

Contract (from contracts/serializers.md):
- Fields: id, session_code, start_date, end_date, create_date, modified_date
- create_date and modified_date are read-only
"""
from rest_framework import serializers

from catalog.models import ExamSession, ExamSessionSubject


class ExamSessionSubjectSerializer(serializers.ModelSerializer):
    """
    Serializer for ExamSessionSubject model.

    Used to serialize exam session and subject associations.

    Fields:
        id (int): Primary key
        exam_session (int): Foreign key to ExamSession
        subject (int): Foreign key to Subject
        is_active (bool): Whether this combination is active
        created_at (datetime): Auto-set on creation (read-only)
        updated_at (datetime): Auto-updated on save (read-only)
    """

    class Meta:
        model = ExamSessionSubject
        fields = ['id', 'exam_session', 'subject', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


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
