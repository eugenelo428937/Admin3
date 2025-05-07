# products/models/__init__.py
from .product_category import ProductCategory
from .product_subcategory import ProductSubcategory
from .products import Product, ProductVariation
from .product_main_category import ProductMainCategory
from .product_group import ProductGroup
from django.db import models

class ProductProductCategory(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    product_category = models.ForeignKey(ProductCategory, on_delete=models.CASCADE)
    class Meta:
        unique_together = ("product", "product_category")
        db_table = 'acted_product_productcategory'

class ProductProductSubcategory(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    product_subcategory = models.ForeignKey(ProductSubcategory, on_delete=models.CASCADE)
    class Meta:
        unique_together = ("product", "product_subcategory")
        db_table = 'acted_product_productsubcategory'

class ProductProductMainCategory(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    product_main_category = models.ForeignKey(ProductMainCategory, on_delete=models.CASCADE)
    class Meta:
        unique_together = ("product", "product_main_category")
        db_table = 'acted_product_productmaincategory'

class ProductProductVariation(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    product_variation = models.ForeignKey(ProductVariation, on_delete=models.CASCADE)
    class Meta:
        unique_together = ("product", "product_variation")
        db_table = "acted_product_productvariation"

__all__ = ['ProductGroup', 'Product', 'ProductVariation']
