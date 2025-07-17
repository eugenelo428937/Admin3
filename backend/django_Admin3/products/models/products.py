from django.db import models
from django.core.exceptions import ValidationError
from .filter_system import FilterGroup
from .product_variation import ProductVariation

class Product(models.Model):
    
    fullname = models.CharField(max_length=255)
    shortname = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    code = models.CharField(max_length=10)
    
    groups = models.ManyToManyField(FilterGroup, related_name='products', through='ProductProductGroup')
    product_variations = models.ManyToManyField(
        ProductVariation,
        through='ProductProductVariation',
        related_name='products',
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    
    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.shortname}"
    
    class Meta:
        db_table = 'acted_products' 
        verbose_name = 'Product'
        verbose_name_plural = 'Products'
        ordering = ['shortname']

class ProductProductGroup(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    product_group = models.ForeignKey(FilterGroup, on_delete=models.CASCADE)
    
    class Meta:
        unique_together = ("product", "product_group")
        db_table = 'acted_product_productgroup'
