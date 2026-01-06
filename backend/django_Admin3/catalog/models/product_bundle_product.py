"""ProductBundleProduct junction model for the catalog app.

Migrated from products/models/bundle_product.py to catalog/models/product_bundle_product.py.
Table: acted.catalog_product_bundle_products
"""
from django.db import models


class ProductBundleProduct(models.Model):
    """
    Through model linking :model:`catalog.ProductBundle` to :model:`catalog.ProductProductVariation`.

    This junction table manages the many-to-many relationship between bundles
    and their component products. Each record specifies which product-variation
    combination is included in a bundle, along with quantity, pricing, and display order.

    **Related Models**:

    - :model:`catalog.ProductBundle` - The parent bundle
    - :model:`catalog.ProductProductVariation` - The product-variation combination
    - :model:`catalog.Product` - Accessible via product_product_variation.product
    - :model:`catalog.ProductVariation` - Accessible via product_product_variation.product_variation

    **Price Types**:

    - ``standard`` - Regular price for new students
    - ``retaker`` - Discounted price for retaking students
    - ``additional`` - Price for additional copies

    **Usage Example**::

        # Get all products in a bundle with their variations
        bundle_products = ProductBundleProduct.objects.filter(
            bundle__bundle_name='CM2 Full Package',
            is_active=True
        ).select_related(
            'product_product_variation__product',
            'product_product_variation__product_variation'
        ).order_by('sort_order')

        for bp in bundle_products:
            print(f"{bp.product.shortname} ({bp.product_variation.name})")
    """

    bundle = models.ForeignKey(
        'catalog.ProductBundle',
        on_delete=models.CASCADE,
        related_name='bundle_products',
        help_text="The bundle this product belongs to"
    )
    product_product_variation = models.ForeignKey(
        'catalog.ProductProductVariation',
        on_delete=models.CASCADE,
        help_text="The specific product-variation combination included in the bundle"
    )
    default_price_type = models.CharField(
        max_length=20,
        default='standard',
        choices=[
            ('standard', 'Standard'),
            ('retaker', 'Retaker'),
            ('additional', 'Additional Copy'),
        ],
        help_text="Default price type for this product when added via bundle"
    )
    quantity = models.PositiveIntegerField(
        default=1,
        help_text="Number of this product to add when bundle is selected"
    )
    sort_order = models.PositiveIntegerField(
        default=0,
        help_text="Display order of this product within the bundle"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this product is currently active in the bundle"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = '"acted"."catalog_product_bundle_products"'
        unique_together = ['bundle', 'product_product_variation']
        ordering = ['sort_order', 'product_product_variation__product__shortname']
        verbose_name = 'Bundle Product'
        verbose_name_plural = 'Bundle Products'

    def __str__(self):
        ppv = self.product_product_variation
        return f"{self.bundle.bundle_name} → {ppv.product.shortname} ({ppv.product_variation.name})"

    @property
    def product(self):
        """Convenience property to get the product."""
        return self.product_product_variation.product

    @property
    def product_variation(self):
        """Convenience property to get the product variation."""
        return self.product_product_variation.product_variation
