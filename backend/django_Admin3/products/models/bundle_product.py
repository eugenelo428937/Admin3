from django.db import models
from .products import Product
from .product_variation import ProductVariation
from subjects.models import Subject

class ProductBundle(models.Model):
    """
    Represents a bundle/package for a specific subject that contains multiple products.
    This is separate from the regular Product model.
    """
    bundle_name = models.CharField(
        max_length=255,
        help_text="Name of the bundle (e.g., 'CM1 Materials & Marking Bundle')"
    )
    subject = models.ForeignKey(
        Subject,
        on_delete=models.CASCADE,
        related_name='bundles',
        help_text="Subject this bundle is for"
    )
    bundle_description = models.TextField(
        null=True,
        blank=True,
        help_text="Description of what's included in the bundle"
    )    
    is_featured = models.BooleanField(
        default=False,
        help_text="Whether to feature this bundle prominently"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this bundle is currently available"
    )
    display_order = models.PositiveIntegerField(
        default=0,
        help_text="Order in which to display this bundle"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Many-to-many relationship with product variations through the mapping table
    product_variations = models.ManyToManyField(
        'ProductProductVariation',
        through='ProductBundleProduct',
        related_name='bundles',
        help_text="Product variations included in this bundle"
    )

    class Meta:
        db_table = 'acted_product_bundles'
        unique_together = ['subject', 'bundle_name']
        ordering = ['subject__code', 'display_order', 'bundle_name']
        verbose_name = 'Product Bundle'
        verbose_name_plural = 'Product Bundles'

    def __str__(self):
        return f"{self.subject.code} - {self.bundle_name}"

class ProductBundleProduct(models.Model):
    """
    Mapping table between bundles and their component product variations.
    Uses ProductProductVariation to ensure valid product-variation combinations.
    """
    bundle = models.ForeignKey(
        ProductBundle,
        on_delete=models.CASCADE,
        related_name='bundle_products',
        help_text="The bundle this product belongs to"
    )
    product_product_variation = models.ForeignKey(
        'ProductProductVariation',
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
        db_table = 'acted_product_bundle_products'
        unique_together = ['bundle', 'product_product_variation']
        ordering = ['sort_order', 'product_product_variation__product__shortname']
        verbose_name = 'Bundle Product'
        verbose_name_plural = 'Bundle Products'

    def __str__(self):
        ppv = self.product_product_variation
        return f"{self.bundle.bundle_name} → {ppv.product.shortname} ({ppv.product_variation.name})"
    
    @property
    def product(self):
        """Convenience property to get the product"""
        return self.product_product_variation.product
    
    @property  
    def product_variation(self):
        """Convenience property to get the product variation"""
        return self.product_product_variation.product_variation 