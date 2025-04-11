# products/models.py
from django.db import models

class ProductType(models.Model):
    name = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    class Meta:
        db_table = 'acted_product_types'
        verbose_name = 'Product Type'
        verbose_name_plural = 'Product Types'

