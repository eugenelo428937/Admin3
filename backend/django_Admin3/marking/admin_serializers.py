"""
Admin-panel serializers for marking models.

Returns nested shallow fields (student_ref, names, paper name) so the
frontend doesn't need separate requests to resolve FK labels.
"""
from rest_framework import serializers

from marking.models import (
    Marker,
    MarkingPaperSubmission,
    MarkingPaperGrading,
    MarkingPaperFeedback,
)


class MarkerAdminSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_full_name = serializers.SerializerMethodField()

    class Meta:
        model = Marker
        fields = ('id', 'initial', 'user', 'user_email', 'user_full_name',
                  'created_at', 'updated_at')

    def get_user_full_name(self, obj):
        name = obj.user.get_full_name()
        return name or obj.user.username


class MarkingPaperSubmissionAdminSerializer(serializers.ModelSerializer):
    student_ref = serializers.IntegerField(
        source='student.student_ref', read_only=True,
    )
    marking_paper_name = serializers.CharField(
        source='marking_paper.name', read_only=True,
    )

    class Meta:
        model = MarkingPaperSubmission
        fields = ('id', 'student', 'student_ref', 'marking_paper',
                  'marking_paper_name', 'marking_voucher', 'order_item',
                  'submission_date', 'hub_download_date',
                  'created_at', 'updated_at')


class MarkingPaperGradingAdminSerializer(serializers.ModelSerializer):
    marker_initial = serializers.CharField(
        source='marker.initial', read_only=True,
    )
    allocate_by_name = serializers.SerializerMethodField()

    class Meta:
        model = MarkingPaperGrading
        fields = ('id', 'submission', 'marker', 'marker_initial',
                  'allocate_date', 'allocate_by', 'allocate_by_name',
                  'submission_date', 'hub_download_date', 'hub_upload_date',
                  'score', 'created_at', 'updated_at')

    def get_allocate_by_name(self, obj):
        return str(obj.allocate_by)


class MarkingPaperFeedbackAdminSerializer(serializers.ModelSerializer):
    grade_display = serializers.CharField(
        source='get_grade_display', read_only=True,
    )

    class Meta:
        model = MarkingPaperFeedback
        fields = ('id', 'grading', 'grade', 'grade_display', 'comments',
                  'submission_date', 'hub_download_date',
                  'created_at', 'updated_at')
