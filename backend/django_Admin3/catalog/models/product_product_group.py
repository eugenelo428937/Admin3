"""ProductProductGroup junction model for the catalog app.

Migrated from products/models/products.py to catalog/models/product_product_group.py.
Table: acted.catalog_product_product_groups

Note: References products.FilterGroup which remains in the products app.
"""
from django.db import models


class ProductProductGroup(models.Model):
    """
    Junction table linking :model:`catalog.Product` to :model:`products.FilterGroup`.

    This through model manages the many-to-many relationship between products
    and filter groups used for categorization and filtering in the online store.
    Filter groups include categories like 'Core Study Materials', 'Revision Materials',
    'eBook', 'Printed', etc.

    **Related Models**:

    - :model:`catalog.Product` - The product being categorized
    - :model:`products.FilterGroup` - The filter/category group (remains in products app)

    **Usage Example**::

        # Get all products in the 'Core Study Materials' group
        groups = ProductProductGroup.objects.filter(
            product_group__name='Core Study Materials'
        ).select_related('product')
    """

    product = models.ForeignKey(
        'catalog.Product',
        on_delete=models.CASCADE,
        related_name='product_groups',
        help_text="The product being categorized"
    )
    product_group = models.ForeignKey(
        'filtering.FilterGroup',
        on_delete=models.CASCADE,
        related_name='catalog_product_product_groups',
        help_text="The filter group this product belongs to"
    )

    class Meta:
        db_table = '"acted"."catalog_product_product_groups"'
        unique_together = ('product', 'product_group')
        verbose_name = 'Product Product Group'
        verbose_name_plural = 'Product Product Groups'

    def __str__(self):
        return f"{self.product} - {self.product_group}"
