"""Search app configuration."""
from django.apps import AppConfig


class SearchConfig(AppConfig):
    """Configuration for the search app."""

    name = 'search'
    verbose_name = 'Product Search'
    default_auto_field = 'django.db.models.BigAutoField'
