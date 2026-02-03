"""
MarkingPaper model.

Updated 2026-01-27: Changed FK from catalog.ExamSessionSubjectProduct to
store.Product as part of schema migration to acted schema.
"""
from django.db import models


class MarkingPaper(models.Model):
    """
    Marking paper with deadline information.

    Links to a store.Product to identify which purchasable product
    this marking paper belongs to.


    **Backward Compatibility**:
    The `exam_session_subject_product` property provides compatibility with
    code that still expects the old ESSP reference.
    """
    store_product = models.ForeignKey(
        'store.Product',
        on_delete=models.CASCADE,
        related_name='marking_papers',
        null=True,
        blank=True,
        help_text='The store product this marking paper belongs to'
    )
    name = models.CharField(max_length=10)
    deadline = models.DateTimeField()
    recommended_submit_date = models.DateTimeField()

    class Meta:
        db_table = '"acted"."marking_paper"'

    # ─────────────────────────────────────────────────────────────────────────
    # Backward-compatible properties for ESSP access
    # ─────────────────────────────────────────────────────────────────────────

    @property
    def exam_session_subject_product(self):
        """
        Backward-compatible property for accessing ExamSessionSubjectProduct.

        Provides compatibility with existing code that expects ESSP access.
        Queries catalog.ExamSessionSubjectProduct matching the store product's
        exam_session_subject and product.

        Returns:
            ExamSessionSubjectProduct or None: The matching ESSP record
        """
        from catalog.models import ExamSessionSubjectProduct
        return ExamSessionSubjectProduct.objects.filter(
            exam_session_subject=self.store_product.exam_session_subject,
            product=self.store_product.product_product_variation.product
        ).first()

    def __str__(self):
        return f"{self.name} ({self.store_product})"
