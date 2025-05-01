# products/apps.py
from django.apps import AppConfig

class ProductsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'products'

    def ready(self):
        import products.models.product_category
        import products.models.product_subtypes
        import products.models.products
        import products.models.product_main_category
