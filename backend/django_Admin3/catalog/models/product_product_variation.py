"""ProductProductVariation junction model for the catalog app.

Migrated from products/models/__init__.py to catalog/models/product_product_variation.py.
Table: acted.catalog_product_product_variations
"""
from django.db import models


class ProductProductVariation(models.Model):
    """
    Junction table linking :model:`catalog.Product` to :model:`catalog.ProductVariation`.

    This through model manages the many-to-many relationship between products
    and their available variations. Each record represents a specific product-variation
    combination that can be purchased.

    **Related Models**:

    - :model:`catalog.Product` - The product
    - :model:`catalog.ProductVariation` - The variation type
    - :model:`catalog.ProductBundleProduct` - Bundle inclusions using this combination
    - :model:`exam_sessions_subjects_products.ExamSessionSubjectProductVariation` - Session pricing

    **Usage Example**::

        # Get all eBook variations for a product
        ppv = ProductProductVariation.objects.filter(
            product__code='CM2-CSM',
            product_variation__variation_type='eBook'
        ).first()
    """

    product = models.ForeignKey(
        'catalog.Product',
        on_delete=models.CASCADE,
        help_text="The product"
    )
    product_variation = models.ForeignKey(
        'catalog.ProductVariation',
        on_delete=models.CASCADE,
        help_text="The variation type for this product"
    )

    class Meta:
        db_table = '"acted"."catalog_product_product_variations"'
        unique_together = ('product', 'product_variation')
        verbose_name = 'Product Product Variation'
        verbose_name_plural = 'Product Product Variations'

    def __str__(self):
        return f"{self.product} - {self.product_variation}"
