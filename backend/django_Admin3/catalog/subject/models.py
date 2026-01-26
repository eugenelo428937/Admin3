"""Subject model - standalone, no product dependencies.

Table: acted.catalog_subjects
"""
from django.db import models


class Subject(models.Model):
    """
    Stores an academic subject for actuarial exams and courses.

    Subjects represent the core academic units (e.g., CB1, CM2, SA1) that
    students study and take exams for. Related to :model:`catalog.ExamSessionSubject`
    for exam session availability.

    **Usage Example**::

        subject = Subject.objects.get(code='CM2')
        sessions = subject.exam_session_subjects.all()
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
        app_label = 'catalog_subjects'
        verbose_name = 'Subject'
        verbose_name_plural = 'Subjects'
        ordering = ['code']
