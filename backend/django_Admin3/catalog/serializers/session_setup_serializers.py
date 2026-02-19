"""Serializers for the session setup copy/create endpoint."""
from rest_framework import serializers

from catalog.models import ExamSession, ExamSessionSubject


class CopyProductsRequestSerializer(serializers.Serializer):
    """Validates request data for the copy-products endpoint."""

    new_exam_session_id = serializers.IntegerField(
        help_text="ID of the newly created exam session"
    )
    previous_exam_session_id = serializers.IntegerField(
        help_text="ID of the previous exam session to copy from"
    )

    def validate_new_exam_session_id(self, value):
        if not ExamSession.objects.filter(id=value).exists():
            raise serializers.ValidationError(
                f"Exam session {value} does not exist."
            )
        if not ExamSessionSubject.objects.filter(exam_session_id=value).exists():
            raise serializers.ValidationError(
                f"No exam session subjects found for session {value}. "
                "Complete Step 2 first."
            )
        return value

    def validate_previous_exam_session_id(self, value):
        if not ExamSession.objects.filter(id=value).exists():
            raise serializers.ValidationError(
                f"Exam session {value} does not exist."
            )
        return value


class CopyProductsResponseSerializer(serializers.Serializer):
    """Serializes the response from the copy-products endpoint."""

    products_created = serializers.IntegerField()
    prices_created = serializers.IntegerField()
    bundles_created = serializers.IntegerField()
    bundle_products_created = serializers.IntegerField()
    skipped_subjects = serializers.ListField(child=serializers.CharField())
    message = serializers.CharField()


class SessionDataCountsSerializer(serializers.Serializer):
    """Serializes counts of existing data for a session."""

    exam_session_subjects = serializers.IntegerField()
    products = serializers.IntegerField()
    bundles = serializers.IntegerField()
    has_data = serializers.BooleanField()


class DeactivateSessionRequestSerializer(serializers.Serializer):
    """Validates request data for the deactivate-session-data endpoint."""

    exam_session_id = serializers.IntegerField(
        help_text="ID of the exam session to deactivate data for"
    )

    def validate_exam_session_id(self, value):
        if not ExamSession.objects.filter(id=value).exists():
            raise serializers.ValidationError(
                f"Exam session {value} does not exist."
            )
        return value


class DeactivateSessionResponseSerializer(serializers.Serializer):
    """Serializes the response from the deactivate-session-data endpoint."""

    exam_session_subjects_deactivated = serializers.IntegerField()
    products_deactivated = serializers.IntegerField()
    prices_deactivated = serializers.IntegerField()
    bundles_deactivated = serializers.IntegerField()
    bundle_products_deactivated = serializers.IntegerField()
