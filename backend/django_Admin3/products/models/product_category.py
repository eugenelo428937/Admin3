# products/models.py
from django.db import models
from .product_main_category import ProductMainCategory

class ProductCategory(models.Model):
    name = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    main_category = models.ForeignKey(
        ProductMainCategory,
        on_delete=models.CASCADE,
        related_name='categories',
        null=True,
        blank=True
    )

    def __str__(self):
        return self.name

    class Meta:
        db_table = 'acted_product_category'
        verbose_name = 'Product Category'
        verbose_name_plural = 'Product Categories'

