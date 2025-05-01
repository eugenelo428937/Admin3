from django.db import models
from .product_main_category import ProductMainCategory
from .product_category import ProductCategory

class ProductSubcategory(models.Model):
    product_category = models.ForeignKey(
        ProductCategory,
        on_delete=models.PROTECT,
        related_name='subcategories'
    )
    name = models.CharField(max_length=50)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'acted_product_subcategories'
        verbose_name = 'Product Subcategory'
        verbose_name_plural = 'Product Subcategories'
        unique_together = ['product_category', 'name']

    def __str__(self):
        return f"{self.product_category.name} - {self.name}"
