"""Django app configuration for catalog.products nested app."""
from django.apps import AppConfig


class ProductsConfig(AppConfig):
    """Configuration for the Products nested app."""

    name = 'catalog.products'
    label = 'catalog_products'
    default_auto_field = 'django.db.models.BigAutoField'
    verbose_name = 'Catalog - Products'
