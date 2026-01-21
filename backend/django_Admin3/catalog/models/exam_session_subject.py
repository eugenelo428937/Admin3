"""ExamSessionSubject model for the catalog app.

Migrated from exam_sessions_subjects/models.py to catalog/models/exam_session_subject.py.
Table: acted.catalog_exam_session_subjects

This model associates exam sessions with subjects, defining which subjects are available
for each exam session period. The store.Product model will link directly to this model.
"""
from django.db import models


class ExamSessionSubject(models.Model):
    """
    Associates an exam session with a subject.

    Defines which subjects are available for each examination period.
    Related to :model:`store.Product` for purchasable items and
    :model:`store.Bundle` for product bundles.

    **Usage Example**::

        ess = ExamSessionSubject.objects.get(
            exam_session__session_code='2025-04',
            subject__code='CM2'
        )
        products = ess.store_products.filter(is_active=True)
    """

    exam_session = models.ForeignKey(
        'catalog.ExamSession',
        on_delete=models.CASCADE,
        related_name='exam_session_subjects',
        help_text="The exam session period"
    )
    subject = models.ForeignKey(
        'catalog.Subject',
        on_delete=models.CASCADE,
        related_name='exam_session_subjects',
        help_text="The subject available in this session"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this combination is active"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = '"acted"."catalog_exam_session_subjects"'
        unique_together = ('exam_session', 'subject')
        verbose_name = 'Exam Session Subject'
        verbose_name_plural = 'Exam Session Subjects'

    def __str__(self):
        return f"{self.exam_session.session_code} - {self.subject.code}"
