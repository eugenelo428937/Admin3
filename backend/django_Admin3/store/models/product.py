"""Product model for the store app.

A purchasable item available for sale in a specific exam session.
Links directly to catalog.ExamSessionSubject and catalog.ProductProductVariation,
eliminating the redundant ESSP intermediate table.

Table: acted.products
"""
from django.db import models


class Product(models.Model):
    """
    A purchasable product available in the store.

    Links an exam session subject directly to a product variation,
    replacing the old 4-table chain (ESSP → ESSPV) with a direct 2-join structure.

    **Usage Example**::

        product = Product.objects.get(product_code='CM2/PCSM01P/2025-04')
        prices = product.prices.all()
        ess = product.exam_session_subject
    """

    exam_session_subject = models.ForeignKey(
        'catalog.ExamSessionSubject',
        on_delete=models.CASCADE,
        related_name='store_products',
        help_text='The exam session subject this product is available for'
    )
    product_product_variation = models.ForeignKey(
        'catalog_products.ProductProductVariation',
        on_delete=models.CASCADE,
        related_name='store_products',
        help_text='The product variation (template + variation combination)'
    )
    product_code = models.CharField(
        max_length=64,
        unique=True,
        help_text='Unique auto-generated product code'
    )
    is_active = models.BooleanField(
        default=True,
        help_text='Whether product is available for purchase'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = '"acted"."products"'
        unique_together = ('exam_session_subject', 'product_product_variation')
        verbose_name = 'Store Product'
        verbose_name_plural = 'Store Products'

    def save(self, *args, **kwargs):
        """Auto-generate product_code if not provided."""
        if not self.product_code:
            self.product_code = self._generate_product_code()
        super().save(*args, **kwargs)

    def _generate_product_code(self):
        """
        Generate product code from related entities.

        Format depends on variation type:
        - Material/Marking (eBook, Printed, Marking):
            {subject_code}/{variation_code}{product_code}/{exam_session_code}
            Example: CB1/PC/2025-04 (Printed Combined Pack)
        - Tutorial/Other:
            {subject_code}/{prefix}{product_code}{variation_code}/{exam_session_code}
            Example: CB1/TLONCB1_f2f_3/2025-04-472 (Tutorial London)
        """
        ess = self.exam_session_subject
        ppv = self.product_product_variation

        subject_code = ess.subject.code
        exam_code = ess.exam_session.session_code
        product_code = ppv.product.code
        variation = ppv.product_variation
        variation_code = variation.code if variation.code else ''

        # Material and Marking products: simpler format without prefix
        if variation.variation_type in ('eBook', 'Printed', 'Marking'):
            return f"{subject_code}/{variation_code}{product_code}/{exam_code}"

        # Tutorial and other products: keep prefix format with ID suffix for uniqueness
        prefix = variation.variation_type[0].upper() if variation.variation_type else ''
        return f"{subject_code}/{prefix}{product_code}{variation_code}/{exam_code}-{self.pk}"

    def __str__(self):
        return self.product_code

    # ─────────────────────────────────────────────────────────────────────────
    # Backward-compatible properties for cart/order code migration
    # These allow existing code using item.product.product to work unchanged
    # ─────────────────────────────────────────────────────────────────────────

    @property
    def product(self):
        """
        Access the catalog.Product through the product_product_variation.

        This provides backward compatibility with code that used
        `cart_item.product.product` when product was an ESSP.

        Returns:
            catalog.Product: The master product template
        """
        return self.product_product_variation.product

    @property
    def product_variation(self):
        """
        Access the catalog.ProductVariation through the product_product_variation.

        Returns:
            catalog.ProductVariation: The variation type (eBook, Printed, etc.)
        """
        return self.product_product_variation.product_variation

    @property
    def variations(self):
        """
        Backward-compatible property for accessing variations.

        In the old ESSP structure, variations were accessed via
        `essp.variations.all()`. This property provides a compatible
        queryset interface.

        Returns:
            QuerySet: Single-item queryset containing this product
        """
        # Return a queryset containing just this product
        # This maintains compatibility with code that called .first() or iterated
        return Product.objects.filter(pk=self.pk)
