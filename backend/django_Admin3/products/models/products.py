from django.db import models
from django.core.exceptions import ValidationError
from .product_category import ProductCategory
from .product_subcategory import ProductSubcategory
from .product_variation import ProductVariation
from .product_main_category import ProductMainCategory

class Product(models.Model):
    PRODUCT_TYPE_CHOICES = [
        ('Materials', 'Materials'),
        ('Tutorials', 'Tutorials'),
        ('Marking', 'Marking'),
    ]

    fullname = models.CharField(max_length=255)
    shortname = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    product_categories = models.ManyToManyField(
        ProductCategory,
        through='ProductProductCategory',
        related_name='products'
    )
    product_subcategories = models.ManyToManyField(
        ProductSubcategory,
        through='ProductProductSubcategory',
        related_name='products'
    )
    product_main_categories = models.ManyToManyField(
        ProductMainCategory,
        through='ProductProductMainCategory',
        related_name='products'
    )
    product_variations = models.ManyToManyField(
        ProductVariation,
        through='ProductProductVariation',
        related_name='products',
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    
    def clean(self):
        if self.product_subcategories.exists():
            for subtype in self.product_subcategories.all():
                if subtype.product_category not in self.product_categories.all():
                    raise ValidationError({
                        'product_subcategories': 'Selected subcategory does not match any of the product categories'
                    })

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.shortname}"
    
    class Meta:
        db_table = 'acted_products' 
        verbose_name = 'Product'
        verbose_name_plural = 'Products'
        ordering = ['shortname']
