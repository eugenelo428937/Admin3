"""Django app configuration for catalog.exam_session nested app."""
from django.apps import AppConfig


class ExamSessionConfig(AppConfig):
    """Configuration for the ExamSession nested app."""

    name = 'catalog.exam_session'
    label = 'catalog_exam_sessions'
    default_auto_field = 'django.db.models.BigAutoField'
    verbose_name = 'Catalog - Exam Sessions'
