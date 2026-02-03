"""Django app configuration for catalog.products.recommendation nested app."""
from django.apps import AppConfig


class RecommendationConfig(AppConfig):
    """Configuration for the Product Recommendation nested app."""

    name = 'catalog.products.recommendation'
    label = 'catalog_products_recommendations'
    default_auto_field = 'django.db.models.BigAutoField'
    verbose_name = 'Catalog - Product Recommendations'
