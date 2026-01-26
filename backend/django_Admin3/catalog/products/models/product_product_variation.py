"""ProductProductVariation junction model for the catalog.products app.

Table: acted.catalog_product_product_variations
"""
from django.db import models


class ProductProductVariation(models.Model):
    """
    Junction table linking Product to ProductVariation.

    This through model manages the many-to-many relationship between products
    and their available variations. Each record represents a specific product-variation
    combination that can be purchased.

    **Usage Example**::

        # Get all eBook variations for a product
        ppv = ProductProductVariation.objects.filter(
            product__code='CM2-CSM',
            product_variation__variation_type='eBook'
        ).first()
    """

    product = models.ForeignKey(
        'catalog_products.Product',
        on_delete=models.CASCADE,
        help_text="The product"
    )
    product_variation = models.ForeignKey(
        'catalog_products.ProductVariation',
        on_delete=models.CASCADE,
        help_text="The variation type for this product"
    )

    class Meta:
        db_table = '"acted"."catalog_product_product_variations"'
        app_label = 'catalog_products'
        unique_together = ('product', 'product_variation')
        verbose_name = 'Product Product Variation'
        verbose_name_plural = 'Product Product Variations'

    def __str__(self):
        return f"{self.product} - {self.product_variation}"
