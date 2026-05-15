"""Admin submission-list endpoint for the Marking page.

Returns one row per ``MarkingPaperSubmission`` with denormalised fields
(student, subject, product code, paper name, sequences, marker, dates)
and a derived ``status`` computed from the optional related grading and
feedback rows.

Status precedence (highest wins):
    feedback_received > marked > allocated > new
"""
from django.contrib.auth.models import User
from django.db.models import Q
from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from catalog.models import Subject
from catalog.permissions import IsSuperUser
from marking.models import (
    Marker,
    MarkingPaperSubmission,
)
from marking.admin_list_serializers import MarkingSubmissionListSerializer


class MarkingSubmissionListPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 200


class MarkingSubmissionListAdminViewSet(
    mixins.ListModelMixin,
    viewsets.GenericViewSet,
):
    """Read-only list of marking submissions with derived status.

    Query params (all optional, AND-combined):
        student_ref         — exact match on Student.student_ref
        student_name        — icontains on auth_user.first_name/last_name
        student_email       — icontains on auth_user.email
        subject             — Subject.code (exact, repeatable)
        product_code        — store.Product.product_code icontains
        sequence            — MarkingPaper.sequences (exact)
        marker              — Marker.id (exact)
        marker_legacy_id    — Marker.legacy_id (exact)
        voucher             — '1' / 'true' to show only voucher-redeemed rows
        submission_date_gte / submission_date_lte
        allocate_date_gte   / allocate_date_lte
        graded_date_gte     / graded_date_lte
        feedback_date_gte   / feedback_date_lte
        ordering            — defaults to '-submission_date'
    """

    serializer_class = MarkingSubmissionListSerializer
    permission_classes = [IsSuperUser]
    pagination_class = MarkingSubmissionListPagination

    def get_queryset(self):
        qs = (
            MarkingPaperSubmission.objects
            .select_related(
                'student__user',
                'marking_paper',
                'marking_paper__purchasable__product__exam_session_subject__subject',
                # Phase 4d: drop the legacy PPV chain in favour of MarkingTemplate.
                # MarkingPaper.marking_template is non-null as of Phase 4c (migration
                # 0021) — every paper belongs to exactly one MarkingTemplate series.
                'marking_paper__marking_template',
                'redeemed_voucher',
                'grading__marker__user',
                'grading__feedback',
            )
            .order_by('-submission_date')
        )

        params = self.request.query_params
        qs = self._apply_text_filters(qs, params)
        qs = self._apply_choice_filters(qs, params)
        qs = self._apply_date_filters(qs, params)
        return qs

    # ── filter helpers ──────────────────────────────────────────────────
    @staticmethod
    def _truthy(value: str) -> bool:
        return str(value).lower() in {'1', 'true', 'yes', 'on'}

    def _apply_text_filters(self, qs, params):
        ref = params.get('student_ref', '').strip()
        if ref.isdigit():
            qs = qs.filter(student__student_ref=int(ref))
        elif ref:
            qs = qs.filter(student__student_ref__icontains=ref)

        name = params.get('student_name', '').strip()
        if name:
            qs = qs.filter(
                Q(student__user__first_name__icontains=name)
                | Q(student__user__last_name__icontains=name)
            )

        email = params.get('student_email', '').strip()
        if email:
            qs = qs.filter(student__user__email__icontains=email)

        product_code = params.get('product_code', '').strip()
        if product_code:
            qs = qs.filter(
                marking_paper__purchasable__product__product_code__icontains=product_code
            )

        return qs

    def _apply_choice_filters(self, qs, params):
        subjects = params.getlist('subject') if hasattr(params, 'getlist') else []
        if subjects:
            qs = qs.filter(
                marking_paper__purchasable__product__exam_session_subject__subject__code__in=subjects
            )

        sequence = params.get('sequence', '').strip()
        if sequence.isdigit():
            qs = qs.filter(marking_paper__sequences=int(sequence))

        marker = params.get('marker', '').strip()
        if marker.isdigit():
            qs = qs.filter(grading__marker_id=int(marker))

        legacy = params.get('marker_legacy_id', '').strip()
        if legacy.isdigit():
            qs = qs.filter(grading__marker__legacy_id=int(legacy))

        voucher = params.get('voucher', '').strip()
        if voucher and self._truthy(voucher):
            qs = qs.filter(redeemed_voucher__isnull=False)
        return qs

    def _apply_date_filters(self, qs, params):
        date_filters = {
            'submission_date': 'submission_date',
            'allocate_date': 'grading__allocate_date',
            'graded_date': 'grading__graded_date',
            'feedback_date': 'grading__feedback__feedback_date',
        }
        for key, lookup in date_filters.items():
            gte = params.get(f'{key}_gte', '').strip()
            lte = params.get(f'{key}_lte', '').strip()
            if gte:
                qs = qs.filter(**{f'{lookup}__gte': gte})
            if lte:
                qs = qs.filter(**{f'{lookup}__lte': lte})
        return qs

    # ── filter-options endpoint ────────────────────────────────────────
    @action(detail=False, methods=['get'], url_path='filter-options')
    def filter_options(self, request):
        """Return the option lists used to populate filter dropdowns."""
        subjects = list(
            Subject.objects.filter(active=True)
            .order_by('code')
            .values('code', 'description')
        )
        markers = [
            {
                'id': m.id,
                'initial': m.initial,
                'legacy_id': m.legacy_id,
                'name': (m.user.get_full_name() or m.user.username),
            }
            for m in Marker.objects.select_related('user').order_by('initial')
        ]
        sequences = sorted(
            MarkingPaperSubmission.objects
            .exclude(marking_paper__sequences__isnull=True)
            .values_list('marking_paper__sequences', flat=True)
            .distinct()
        )
        return Response({
            'subjects': subjects,
            'markers': markers,
            'sequences': sequences,
        })
