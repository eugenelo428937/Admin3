"""Django app configuration for catalog.subject nested app."""
from django.apps import AppConfig


class SubjectConfig(AppConfig):
    """Configuration for the Subject nested app."""

    name = 'catalog.subject'
    label = 'catalog_subjects'
    default_auto_field = 'django.db.models.BigAutoField'
    verbose_name = 'Catalog - Subjects'
