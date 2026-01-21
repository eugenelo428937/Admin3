from django.apps import AppConfig


class StoreConfig(AppConfig):
    """Configuration for the store app.

    The store app contains purchasable items (products, prices, bundles) that
    link to catalog master data. This replaces the exam_sessions_subjects_products
    app with a cleaner two-join architecture.
    """
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'store'
    verbose_name = 'Store'
