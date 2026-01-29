"""
ExamSessionSubjectProduct model - junction table for exam sessions and products.

Moved from exam_sessions_subjects_products app as part of T087 cleanup (2026-01-16).

This model links an ExamSessionSubject to a catalog Product, representing
which products are available for which exam sessions.
"""
from django.db import models


class ExamSessionSubjectProduct(models.Model):
    """
    Junction table linking exam session subjects to catalog products.

    Represents which products are available for purchase in a given
    exam session for a specific subject.

    Used by the marking app to associate marking papers with products.
    """
    exam_session_subject = models.ForeignKey(
        'catalog.ExamSessionSubject',
        on_delete=models.CASCADE,
        related_name='exam_session_subject_products'
    )
    product = models.ForeignKey(
        'catalog_products.Product',
        on_delete=models.CASCADE,
        related_name='exam_session_subject_products'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'acted_exam_session_subject_products'
        unique_together = ('exam_session_subject', 'product')
        verbose_name = 'Exam Session Subject Product'
        verbose_name_plural = 'Exam Session Subject Products'

    def __str__(self):
        return f"{self.exam_session_subject} - {self.product.code}"
