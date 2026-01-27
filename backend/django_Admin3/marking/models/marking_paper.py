"""
MarkingPaper model.

Updated 2026-01-16: Changed FK from exam_sessions_subjects_products to catalog
as part of T087 legacy app cleanup.
"""
from django.db import models
from catalog.models import ExamSessionSubjectProduct


class MarkingPaper(models.Model):
    """
    Marking paper with deadline information.

    Links to a catalog.ExamSessionSubjectProduct to identify which
    product/exam session/subject combination this marking paper belongs to.
    """
    exam_session_subject_product = models.ForeignKey(
        ExamSessionSubjectProduct,
        on_delete=models.CASCADE,
        related_name='marking_papers'
    )
    name = models.CharField(max_length=10)
    deadline = models.DateTimeField()
    recommended_submit_date = models.DateTimeField()

    class Meta:
        db_table = '"acted"."marking_paper"'

    def __str__(self):
        return f"{self.name} ({self.exam_session_subject_product})"
