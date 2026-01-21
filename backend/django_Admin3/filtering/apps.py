"""Filtering app configuration."""
from django.apps import AppConfig


class FilteringConfig(AppConfig):
    """Configuration for the filtering app."""
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'filtering'
    verbose_name = 'Product Filtering'
