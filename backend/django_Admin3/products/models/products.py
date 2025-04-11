from django.db import models
from django.core.exceptions import ValidationError
from products.models import ProductType, ProductSubtype

class Product(models.Model):
    PRODUCT_TYPE_CHOICES = [
        ('Materials', 'Materials'),
        ('Tutorials', 'Tutorials'),
        ('Marking', 'Marking'),
    ]

    code = models.CharField(max_length=50, unique=True)
    fullname = models.CharField(max_length=255)
    shortname = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    product_type = models.ForeignKey(
        ProductType,
        on_delete=models.PROTECT,
        related_name='products'
    )
    product_subtype = models.ForeignKey(
        ProductSubtype,
        on_delete=models.PROTECT,
        related_name='products'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    
    def clean(self):
        if self.product_subtype and self.product_subtype.product_type != self.product_type:
            raise ValidationError({
                'product_subtype': 'Selected subtype does not match the product type'
            })

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.code} - {self.shortname}"
    
    class Meta:
        db_table = 'acted_products' 
        verbose_name = 'Product'
        verbose_name_plural = 'Products'
        ordering = ['code']
