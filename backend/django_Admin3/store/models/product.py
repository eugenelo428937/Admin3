"""Product — MTI subclass of Purchasable for ESS-based store items.

A purchasable linking an exam session subject to a product variation.
Shares a PK with its parent Purchasable row (via MTI).

Table: acted.products
"""
import uuid

from django.db import models

from store.models.purchasable import Purchasable


class Product(Purchasable):
    """ESS-based store product (existing structure, now an MTI subclass).

    Links an exam session subject directly to a product variation,
    replacing the old 4-table chain (ESSP → ESSPV) with a direct 2-join structure.

    **Usage Example**::

        product = Product.objects.get(product_code='CM2/PCSM01P/2025-04')
        prices = product.prices.all()     # inherited reverse accessor
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

    class Meta:
        db_table = '"acted"."products"'
        # unique_together on (ess, ppv) was dropped to allow addon rows
        # (Purchasable.is_addon=True) to share the same catalog PPV as their
        # base product. Uniqueness is still enforced per-row via
        # Purchasable.code UNIQUE.
        verbose_name = 'Store Product'
        verbose_name_plural = 'Store Products'

    def save(self, *args, **kwargs):
        """Auto-generate product_code if not provided; mirror to Purchasable.code."""
        # Ensure Purchasable.kind is populated for MTI parent on insert.
        if not self.kind:
            self.kind = Purchasable.Kind.PRODUCT
        # Code generation path — material/marking codes don't need PK, so we
        # can compute pre-save; tutorial/other codes include the PK, so we
        # must save once to get the PK, then regenerate and update.
        if not self.product_code:
            variation_type = self.product_product_variation.product_variation.variation_type
            if variation_type in ('eBook', 'Printed', 'Marking'):
                self.product_code = self._generate_product_code()
                self.code = self.product_code
                super().save(*args, **kwargs)
            else:
                # Tutorial/other codes include PK; save first with a unique
                # placeholder to satisfy Purchasable.code's UNIQUE constraint,
                # then regenerate with real product_code once PK is known.
                if not self.code:
                    self.code = f'pending-{uuid.uuid4().hex}'
                super().save(*args, **kwargs)
                self.product_code = self._generate_product_code()
                self.code = self.product_code
                super().save(update_fields=['product_code', 'code'])
        else:
            # product_code already set — mirror it to Purchasable.code
            self.code = self.product_code
            super().save(*args, **kwargs)

    def _generate_product_code(self):
        """Generate product code from related entities.

        Format depends on variation type:
        - Material/Marking (eBook, Printed, Marking):
            {subject_code}/{variation_code}{product_code}/{exam_session_code}
            Example: CB1/PC/26 , CP1/MM1/26S
        - Tutorial/Other:
            {subject_code}/{location}/{variation_code}/{exam_session_code}
            Example: CB1/GSW/F2F_3F/26 (Tutorial Glasgow)

        Tutorial location is derived from the first linked TutorialEvent's
        TutorialLocation.code. A Product without an associated TutorialEvent
        cannot produce a valid tutorial code — raise ValueError so the
        caller fixes the data rather than silently producing a bad code.
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

        # Tutorial/other: location from first linked TutorialEvent.
        # Local import avoids circular dependency with tutorials app.
        from tutorials.models import TutorialEvents
        event = (
            TutorialEvents.objects
            .filter(store_product=self)
            .select_related('location')
            .first()
        )
        if event is None or event.location is None or not event.location.code:
            raise ValueError(
                f"Cannot generate tutorial product code for Product pk={self.pk}: "
                "no TutorialEvent with a TutorialLocation.code is linked. "
                "Create the event + location before saving the product."
            )
        return f"{subject_code}/{event.location.code}/{variation_code}/{exam_code}"

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
