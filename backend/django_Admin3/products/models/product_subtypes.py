
from django.db import models
from products.models import ProductType

class ProductSubtype(models.Model):
    product_type = models.ForeignKey(
        ProductType,
        on_delete=models.PROTECT,
        related_name='subtypes'
    )
    name = models.CharField(max_length=50)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'acted_product_subtypes'
        verbose_name = 'Product Subtype'
        verbose_name_plural = 'Product Subtypes'
        unique_together = ['product_type', 'name']

    def __str__(self):
        return f"{self.product_type.name} - {self.name}"
