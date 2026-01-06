"""ExamSession model for the catalog app.

Migrated from exam_sessions/models.py to catalog/models/exam_session.py.
Table: acted.catalog_exam_sessions
"""
from django.db import models


class ExamSession(models.Model):
    """
    Stores an exam session period with start and end dates.

    Exam sessions represent the examination periods (e.g., April 2025, September 2025)
    during which students can take actuarial exams. Related to
    :model:`exam_sessions_subjects.ExamSessionSubject` for subject availability
    and :model:`exam_sessions_subjects_products.ExamSessionSubjectProduct` for
    products available in each session.

    **Usage Example**::

        session = ExamSession.objects.get(session_code='2025-04')
        available_subjects = session.exam_session_subjects.all()
    """

    session_code = models.CharField(
        max_length=50,
        null=False,
        help_text="Unique session identifier (e.g., 2025-04 for April 2025)"
    )
    start_date = models.DateTimeField(
        null=False,
        help_text="Start date of the exam session period"
    )
    end_date = models.DateTimeField(
        null=False,
        help_text="End date of the exam session period"
    )
    create_date = models.DateTimeField(auto_now_add=True)
    modified_date = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = '"acted"."catalog_exam_sessions"'
        verbose_name = 'Exam Session'
        verbose_name_plural = 'Exam Sessions'

    def __str__(self):
        return f"{self.session_code} ({self.start_date} - {self.end_date})"
