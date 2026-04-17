"""ProductProductGroup junction model for the filtering app.

Junction table linking catalog.ProductProductVariation to filtering.FilterGroup.
Table: acted.filter_product_product_groups
"""
from django.db import models


class ProductProductGroup(models.Model):
    """
    Junction table linking :model:`catalog_products.ProductProductVariation`
    to :model:`filtering.FilterGroup`.

    This through model manages the many-to-many relationship between
    product-variation combinations and filter groups used for categorization
    and filtering in the online store. By linking at the PPV level (rather
    than the catalog.Product template level), each variation can carry its
    own filter groups — e.g., "CM2 CSM + eBook" belongs to the "eBook"
    group while "CM2 CSM + Printed" belongs to the "Printed" group.

    **Related Models**:

    - :model:`catalog_products.ProductProductVariation` - The product-variation being categorized
    - :model:`filtering.FilterGroup` - The filter/category group

    **Usage Example**::

        # Get all PPVs in the 'Core Study Materials' group
        from filtering.models import ProductProductGroup
        groups = ProductProductGroup.objects.filter(
            product_group__name='Core Study Materials'
        ).select_related('product_product_variation')
    """

    product_product_variation = models.ForeignKey(
        'catalog_products.ProductProductVariation',
        on_delete=models.CASCADE,
        related_name='product_groups',
        help_text="The product-variation combination being categorized"
    )
    product_group = models.ForeignKey(
        'filtering.FilterGroup',
        on_delete=models.CASCADE,
        related_name='product_product_groups',
        help_text="The filter group this product-variation belongs to"
    )

    class Meta:
        db_table = '"acted"."filter_product_product_groups"'
        app_label = 'filtering'
        unique_together = ('product_product_variation', 'product_group')
        verbose_name = 'Product Product Group'
        verbose_name_plural = 'Product Product Groups'

    def __str__(self):
        return f"{self.product_product_variation} - {self.product_group}"
