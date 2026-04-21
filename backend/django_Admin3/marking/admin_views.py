"""Admin-panel ViewSets for the marking app.

Read-only endpoints surfaced at `/api/markings/admin-*/` and guarded by
`IsSuperUser`. Matches the pattern established in `students/admin_views.py`.
"""
from rest_framework import viewsets

from catalog.permissions import IsSuperUser
from marking.admin_serializers import (
    MarkerAdminSerializer,
    MarkingPaperFeedbackAdminSerializer,
    MarkingPaperGradingAdminSerializer,
    MarkingPaperSubmissionAdminSerializer,
)
from marking.models import (
    Marker,
    MarkingPaperFeedback,
    MarkingPaperGrading,
    MarkingPaperSubmission,
)


class MarkerAdminViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = MarkerAdminSerializer
    permission_classes = [IsSuperUser]

    def get_queryset(self):
        qs = Marker.objects.select_related('user').order_by('initial')
        params = self.request.query_params
        user_id = params.get('user')
        if user_id:
            qs = qs.filter(user_id=user_id)
        initial = params.get('initial')
        if initial:
            qs = qs.filter(initial__icontains=initial)
        return qs


class MarkingPaperSubmissionAdminViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = MarkingPaperSubmissionAdminSerializer
    permission_classes = [IsSuperUser]

    def get_queryset(self):
        qs = (
            MarkingPaperSubmission.objects
            .select_related('student__user', 'marking_paper',
                            'marking_voucher', 'order_item')
            .order_by('-submission_date')
        )
        params = self.request.query_params
        student = params.get('student')
        if student:
            qs = qs.filter(student_id=student)
        paper = params.get('marking_paper')
        if paper:
            qs = qs.filter(marking_paper_id=paper)
        gte = params.get('submission_date__gte')
        if gte:
            qs = qs.filter(submission_date__gte=gte)
        lte = params.get('submission_date__lte')
        if lte:
            qs = qs.filter(submission_date__lte=lte)
        return qs


class MarkingPaperGradingAdminViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = MarkingPaperGradingAdminSerializer
    permission_classes = [IsSuperUser]

    def get_queryset(self):
        qs = (
            MarkingPaperGrading.objects
            .select_related('submission__student__user', 'marker__user',
                            'allocate_by__user')
            .order_by('-allocate_date')
        )
        params = self.request.query_params
        marker = params.get('marker')
        if marker:
            qs = qs.filter(marker_id=marker)
        submission = params.get('submission')
        if submission:
            qs = qs.filter(submission_id=submission)
        score_gte = params.get('score__gte')
        if score_gte:
            qs = qs.filter(score__gte=score_gte)
        score_lte = params.get('score__lte')
        if score_lte:
            qs = qs.filter(score__lte=score_lte)
        alloc_gte = params.get('allocate_date__gte')
        if alloc_gte:
            qs = qs.filter(allocate_date__gte=alloc_gte)
        alloc_lte = params.get('allocate_date__lte')
        if alloc_lte:
            qs = qs.filter(allocate_date__lte=alloc_lte)
        return qs


class MarkingPaperFeedbackAdminViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = MarkingPaperFeedbackAdminSerializer
    permission_classes = [IsSuperUser]

    def get_queryset(self):
        qs = (
            MarkingPaperFeedback.objects
            .select_related('grading')
            .order_by('-submission_date')
        )
        params = self.request.query_params
        grade = params.get('grade')
        if grade:
            qs = qs.filter(grade=grade)
        grading = params.get('grading')
        if grading:
            qs = qs.filter(grading_id=grading)
        student = params.get('grading__submission__student')
        if student:
            qs = qs.filter(grading__submission__student_id=student)
        return qs
