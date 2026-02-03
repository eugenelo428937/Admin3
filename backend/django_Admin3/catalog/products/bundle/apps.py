"""Django app configuration for catalog.products.bundle nested app."""
from django.apps import AppConfig


class BundleConfig(AppConfig):
    """Configuration for the Product Bundle nested app."""

    name = 'catalog.products.bundle'
    label = 'catalog_products_bundles'
    default_auto_field = 'django.db.models.BigAutoField'
    verbose_name = 'Catalog - Product Bundles'
