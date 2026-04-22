"""
MarkingPaperSubmission model.

One row per (student, marking paper) — represents a student's submission
of an assignment or mock exam for marking. Data is imported from an
external hub system.
"""
from django.db import models


class MarkingPaperSubmission(models.Model):
    student = models.ForeignKey(
        'students.Student',
        on_delete=models.PROTECT,
        related_name='marking_submissions',
    )
    marking_paper = models.ForeignKey(
        'marking.MarkingPaper',
        on_delete=models.PROTECT,
        related_name='submissions',
    )
    # Post-merge (2026-04-22): originally pointed at marking_vouchers.MarkingVoucher,
    # retargeted to store.GenericItem (its catalog replacement — same SKU-level
    # semantics; GenericItem rows with kind='marking_voucher').
    marking_voucher = models.ForeignKey(
        'store.GenericItem',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='submissions',
    )
    order_item = models.ForeignKey(
        'orders.OrderItem',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='marking_submissions',
    )
    submission_date = models.DateTimeField()
    hub_download_date = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = '"acted"."marking_paper_submissions"'
        verbose_name = 'Marking Paper Submission'
        verbose_name_plural = 'Marking Paper Submissions'
        constraints = [
            models.UniqueConstraint(
                fields=['student', 'marking_paper'],
                name='uq_submission_student_paper',
            ),
        ]

    def __str__(self):
        return f'{self.student} — {self.marking_paper.name}'
