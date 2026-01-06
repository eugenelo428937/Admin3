"""Subject model for the catalog app.

Migrated from subjects/models.py to catalog/models/subject.py.
Table: acted.catalog_subjects
"""
from django.db import models


class Subject(models.Model):
    """
    Stores an academic subject for actuarial exams and courses.

    Subjects represent the core academic units (e.g., CB1, CM2, SA1) that
    students study and take exams for. Related to :model:`catalog.ProductBundle`
    for subject-specific product bundles and :model:`exam_sessions_subjects.ExamSessionSubject`
    for exam session availability.

    **Usage Example**::

        subject = Subject.objects.get(code='CM2')
        bundles = subject.bundles.filter(is_active=True)
    """

    code = models.CharField(
        max_length=10,
        unique=True,
        help_text="Unique subject code (e.g., CB1, CM2, SA1)"
    )
    description = models.TextField(
        blank=True,
        null=True,
        help_text="Full description of the subject"
    )
    active = models.BooleanField(
        default=True,
        help_text="Whether this subject is currently active"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.code}: {self.description}"

    class Meta:
        db_table = '"acted"."catalog_subjects"'
        verbose_name = 'Subject'
        verbose_name_plural = 'Subjects'
        ordering = ['code']
