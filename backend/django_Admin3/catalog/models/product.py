"""Product model for the catalog app.

Master product template definitions. This is NOT the purchasable product -
see store.Product for the actual purchasable items.

Migrated from products/models/products.py to catalog/models/product.py.
Table: acted.catalog_products
"""
from django.db import models


class Product(models.Model):
    """
    Master product template for study materials, tutorials, and markings.

    This model defines the product catalog (templates). Products are combined with
    :model:`catalog.ProductVariation` via :model:`catalog.ProductProductVariation`
    to create purchasable items in :model:`store.Product`.

    **IMPORTANT**: This is NOT the model for cart/checkout operations.
    For purchasable products, use :model:`store.Product` which links to this
    template via ProductProductVariation.

    **Related Models**:

    - :model:`catalog.ProductVariation` - Available variations (eBook, Printed, etc.)
    - :model:`catalog.ProductProductVariation` - Product-variation combinations
    - :model:`store.Product` - Purchasable products (links ESS + PPV)
    - :model:`catalog.ProductProductGroup` - Product-group assignments
    - :model:`products.FilterGroup` - Filter/category groups
    - :model:`catalog.ProductBundleProduct` - Bundle inclusions

    **Usage Example**::

        # Get catalog template
        template = Product.objects.get(code='CSM01')

        # Get purchasable store products using this template
        from store.models import Product as StoreProduct
        store_products = StoreProduct.objects.filter(
            product_product_variation__product=template
        )
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
        'filtering.FilterGroup',
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
