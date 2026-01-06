"""ProductBundle model for the catalog app.

Migrated from products/models/bundle_product.py to catalog/models/product_bundle.py.
Table: acted.catalog_product_bundles
"""
from django.db import models


class ProductBundle(models.Model):
    """
    Stores bundle packages for subjects containing multiple product variations.

    Bundles are pre-configured packages of products for a specific :model:`catalog.Subject`.
    They allow students to purchase multiple related products (e.g., Course Notes + Marking)
    together. Bundle contents are managed through :model:`catalog.ProductBundleProduct`.

    **Related Models**:

    - :model:`catalog.Subject` - The subject this bundle is for
    - :model:`catalog.ProductBundleProduct` - Products included in this bundle
    - :model:`catalog.ProductProductVariation` - Product-variation combinations in the bundle
    - :model:`exam_sessions_subjects_products.ExamSessionSubjectBundle` - Session availability

    **Usage Example**::

        # Get all active bundles for subject CM2
        bundles = ProductBundle.objects.filter(
            subject__code='CM2',
            is_active=True
        ).prefetch_related('bundle_products')
    """

    bundle_name = models.CharField(
        max_length=255,
        help_text="Name of the bundle (e.g., 'CM1 Materials & Marking Bundle')"
    )
    subject = models.ForeignKey(
        'catalog.Subject',
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
        'catalog.ProductProductVariation',
        through='catalog.ProductBundleProduct',
        related_name='bundles',
        help_text="Product variations included in this bundle"
    )

    class Meta:
        db_table = '"acted"."catalog_product_bundles"'
        unique_together = ['subject', 'bundle_name']
        ordering = ['subject__code', 'display_order', 'bundle_name']
        verbose_name = 'Product Bundle'
        verbose_name_plural = 'Product Bundles'

    def __str__(self):
        return f"{self.subject.code} - {self.bundle_name}"
