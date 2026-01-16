"""BundleProduct model for the store app.

Individual products within a bundle, specifying quantities and display order.

Table: acted.bundle_products
"""
from django.db import models


class BundleProduct(models.Model):
    """
    A product within a store bundle.

    Links a store product to a bundle with quantity and ordering information.
    Uses the same price type choices as the Price model.

    **Usage Example**::

        bundle = Bundle.objects.get(id=1)
        for bp in bundle.bundle_products.filter(is_active=True):
            print(f"{bp.product.product_code}: {bp.quantity}x at {bp.default_price_type} price")
    """

    PRICE_TYPE_CHOICES = [
        ('standard', 'Standard'),
        ('retaker', 'Retaker'),
        ('reduced', 'Reduced Rate'),
        ('additional', 'Additional Copy'),
    ]

    bundle = models.ForeignKey(
        'store.Bundle',
        on_delete=models.CASCADE,
        related_name='bundle_products',
        help_text='The bundle this product belongs to'
    )
    product = models.ForeignKey(
        'store.Product',
        on_delete=models.CASCADE,
        related_name='bundle_memberships',
        help_text='The product included in this bundle'
    )
    default_price_type = models.CharField(
        max_length=20,
        choices=PRICE_TYPE_CHOICES,
        default='standard',
        help_text='Default price type to use for this product in the bundle'
    )
    quantity = models.PositiveIntegerField(
        default=1,
        help_text='Quantity of this product in the bundle'
    )
    sort_order = models.PositiveIntegerField(
        default=0,
        help_text='Display order within the bundle'
    )
    is_active = models.BooleanField(
        default=True,
        help_text='Whether this product is active in the bundle'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = '"acted"."bundle_products"'
        unique_together = ('bundle', 'product')
        verbose_name = 'Bundle Product'
        verbose_name_plural = 'Bundle Products'
        ordering = ['sort_order', 'created_at']

    def __str__(self):
        return f"{self.bundle.name} - {self.product.product_code} (x{self.quantity})"
