"""Serializer for the admin marking-submission list table."""
from rest_framework import serializers

from marking.models import MarkingPaperSubmission


class MarkingSubmissionListSerializer(serializers.ModelSerializer):
    """One row per MarkingPaperSubmission with derived status and labels."""

    student_ref = serializers.IntegerField(source='student.student_ref', read_only=True)
    student_name = serializers.SerializerMethodField()
    subject_code = serializers.SerializerMethodField()
    product_code = serializers.SerializerMethodField()
    paper_name = serializers.CharField(source='marking_paper.name', read_only=True)
    sequences = serializers.IntegerField(source='marking_paper.sequences', read_only=True)
    is_voucher = serializers.SerializerMethodField()
    marker = serializers.SerializerMethodField()
    submission_date = serializers.DateTimeField(read_only=True)
    allocate_date = serializers.SerializerMethodField()
    graded_date = serializers.SerializerMethodField()
    feedback_date = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    status_label = serializers.SerializerMethodField()

    class Meta:
        model = MarkingPaperSubmission
        fields = (
            'id',
            'student_ref',
            'student_name',
            'subject_code',
            'product_code',
            'paper_name',
            'sequences',
            'is_voucher',
            'marker',
            'submission_date',
            'allocate_date',
            'graded_date',
            'feedback_date',
            'status',
            'status_label',
        )

    # ── name / labels ────────────────────────────────────────────────
    def get_student_name(self, obj):
        user = obj.student.user
        full = (user.get_full_name() or '').strip()
        return full or user.username

    def _store_product(self, obj):
        purchasable = obj.marking_paper.purchasable if obj.marking_paper_id else None
        if not purchasable:
            return None
        try:
            return purchasable.product
        except Exception:
            return None

    def get_subject_code(self, obj):
        product = self._store_product(obj)
        if not product:
            return None
        try:
            return product.exam_session_subject.subject.code
        except AttributeError:
            return None

    def get_product_code(self, obj):
        product = self._store_product(obj)
        return getattr(product, 'product_code', None) if product else None

    def get_is_voucher(self, obj):
        return obj.redeemed_voucher_id is not None

    def get_marker(self, obj):
        grading = getattr(obj, 'grading', None)
        if not grading:
            return None
        marker = grading.marker
        user = marker.user
        return {
            'id': marker.id,
            'initial': marker.initial,
            'legacy_id': marker.legacy_id,
            'name': (user.get_full_name() or user.username),
        }

    # ── dates ────────────────────────────────────────────────────────
    def get_allocate_date(self, obj):
        grading = getattr(obj, 'grading', None)
        return grading.allocate_date if grading else None

    def get_graded_date(self, obj):
        grading = getattr(obj, 'grading', None)
        return grading.graded_date if grading else None

    def get_feedback_date(self, obj):
        grading = getattr(obj, 'grading', None)
        feedback = getattr(grading, 'feedback', None) if grading else None
        return feedback.feedback_date if feedback else None

    # ── derived status ───────────────────────────────────────────────
    def _resolve_status(self, obj):
        grading = getattr(obj, 'grading', None)
        if not grading:
            return ('new', None)
        feedback = getattr(grading, 'feedback', None)
        if feedback and feedback.feedback_date:
            return ('feedback_received', feedback.feedback_date)
        if grading.graded_date:
            return ('marked', grading.graded_date)
        if grading.allocate_date:
            return ('allocated', grading.allocate_date)
        return ('new', None)

    def get_status(self, obj):
        return self._resolve_status(obj)[0]

    def get_status_label(self, obj):
        status, dt = self._resolve_status(obj)
        marker_payload = self.get_marker(obj)
        marker_label = ''
        if marker_payload:
            marker_label = f"{marker_payload['name']} ({marker_payload['initial']})"

        if status == 'new':
            return f"New — {obj.submission_date.strftime('%Y-%m-%d')}" if obj.submission_date else 'New'
        if status == 'allocated':
            return f"Allocated to {marker_label} — {dt.strftime('%Y-%m-%d')}"
        if status == 'marked':
            return f"Marked by {marker_label} — {dt.strftime('%Y-%m-%d')}"
        if status == 'feedback_received':
            return f"Feedback received — {dt.strftime('%Y-%m-%d')}"
        return status
