"""Product model for the catalog app.

Migrated from products/models/products.py to catalog/models/product.py.
Table: acted.catalog_products
"""
from django.db import models


class Product(models.Model):
    """
    Stores master product definitions for study materials, tutorials, and markings.

    Products are the core catalog items that can be purchased. Each product can have
    multiple variations (eBook, Printed, etc.) via :model:`catalog.ProductVariation`
    and belongs to filter groups via :model:`products.FilterGroup` for categorization.
    Products are made available for purchase through
    :model:`exam_sessions_subjects_products.ExamSessionSubjectProduct`.

    **Related Models**:

    - :model:`catalog.ProductVariation` - Available variations (eBook, Printed, etc.)
    - :model:`catalog.ProductProductVariation` - Product-variation assignments
    - :model:`catalog.ProductProductGroup` - Product-group assignments
    - :model:`products.FilterGroup` - Filter/category groups
    - :model:`catalog.ProductBundleProduct` - Bundle inclusions

    **Usage Example**::

        product = Product.objects.get(code='CM2-CSM')
        variations = product.product_variations.all()
        groups = product.groups.all()
    """

    fullname = models.CharField(
        max_length=255,
        help_text="Full product name for display"
    )
    shortname = models.CharField(
        max_length=100,
        help_text="Short product name for compact display"
    )
    description = models.TextField(
        blank=True,
        null=True,
        help_text="Detailed product description"
    )
    code = models.CharField(
        max_length=10,
        help_text="Unique product code"
    )

    # M2M relationships - use string references to avoid circular imports
    groups = models.ManyToManyField(
        'products.FilterGroup',
        related_name='catalog_products',
        through='catalog.ProductProductGroup',
        help_text="Filter groups this product belongs to"
    )
    product_variations = models.ManyToManyField(
        'catalog.ProductVariation',
        through='catalog.ProductProductVariation',
        related_name='products',
        blank=True,
        help_text="Available variations for this product"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this product is available for purchase"
    )
    buy_both = models.BooleanField(
        default=False,
        help_text="Suggest purchasing both eBook and Printed versions"
    )

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.shortname}"

    class Meta:
        db_table = '"acted"."catalog_products"'
        verbose_name = 'Product'
        verbose_name_plural = 'Products'
        ordering = ['shortname']
