from django.db import models
from .product_group import ProductGroup

class ProductGroupFilter(models.Model):
    FILTER_TYPE_CHOICES = [
        ("type", "Product Type"),
        ("delivery", "Delivery Method"),
        ("custom", "Custom"),
    ]
    name = models.CharField(max_length=100)
    filter_type = models.CharField(max_length=32, choices=FILTER_TYPE_CHOICES)
    groups = models.ManyToManyField(ProductGroup, related_name="filter_groups")

    def __str__(self):
        return f"{self.name} ({self.filter_type})"

    class Meta:
        db_table = 'acted_product_group_filter'
        verbose_name = 'Product Group Filter'
        verbose_name_plural = 'Product Group Filters'
