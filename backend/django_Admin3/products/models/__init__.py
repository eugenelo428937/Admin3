# products/models/__init__.py
from .products import Product, ProductVariation
from .product_group import ProductGroup
from django.db import models

class ProductProductVariation(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    product_variation = models.ForeignKey(ProductVariation, on_delete=models.CASCADE)
    class Meta:
        unique_together = ("product", "product_variation")
        db_table = "acted_product_productvariation"

__all__ = ['ProductGroup', 'Product', 'ProductVariation']
