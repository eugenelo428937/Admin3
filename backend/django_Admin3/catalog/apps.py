from django.apps import AppConfig


class CatalogConfig(AppConfig):
    """Configuration for the catalog app.

    The catalog app consolidates domain models from subjects, exam_sessions,
    and products apps into a single location with the acted schema.
    """
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'catalog'
    verbose_name = 'Catalog'
