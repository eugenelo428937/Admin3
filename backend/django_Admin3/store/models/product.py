"""Product — MTI subclass of Purchasable for ESS-based store items.

A purchasable linking an exam session subject to a product variation.
Shares a PK with its parent Purchasable row (via MTI).

Table: acted.products
"""
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
        """Phase 5: parent-class save. Each subclass (Material/Tutorial/
        Marking) sets kind explicitly in its own save(). If a caller
        instantiates a bare Product without setting kind, raise ValueError
        — there is no longer a meaningful default for store products.

        Code generation:
        - Tutorial/Marking subclasses generate product_code in their own
          save() before calling super(), so by the time we reach this
          method, product_code is already set.
        - Material rows: while migration 0024 has NOT yet landed, PPV is
          still on the Product parent, so material code generation works
          here. After 0024, MaterialProduct.save() will own this path
          (with PPV now on the subclass).
        """
        if not self.kind:
            raise ValueError(
                'Phase 5: store.Product requires kind to be set explicitly. '
                'Use MaterialProduct/TutorialProduct/MarkingProduct subclasses '
                'which set kind in their own save() methods, or pass '
                'kind=Purchasable.Kind.MATERIAL/TUTORIAL/MARKING.'
            )
        # Material code generation (pre-Task-4 location). Subclass save()
        # for Tutorial/Marking already set product_code, so this only runs
        # for Material rows whose code wasn't pre-set.
        if not self.product_code and self.kind == self.Kind.MATERIAL:
            ppv_id = getattr(self, 'product_product_variation_id', None)
            if ppv_id:
                self.product_code = self._generate_material_code()
                self.code = self.product_code
        if not self.product_code:
            # product_code is still not set — mirror whatever is already there
            # or let super handle it
            pass
        else:
            # Mirror product_code to Purchasable.code
            self.code = self.product_code
        super().save(*args, **kwargs)

    def _generate_material_code(self):
        """Material product code: {subject}/{variation_code}{product_code}/{exam_session}.

        Lives on Product (parent) for now because PPV is still on the
        parent until migration 0024. Will move to MaterialProduct.save()
        when the field moves.
        """
        ess = self.exam_session_subject
        ppv = self.product_product_variation
        subject_code = ess.subject.code
        exam_code = ess.exam_session.session_code
        cat_product_code = ppv.product.code
        variation_code = ppv.product_variation.code or ''
        return f"{subject_code}/{variation_code}{cat_product_code}/{exam_code}"

    def __str__(self):
        return self.product_code

    @classmethod
    def available_for_listing(cls):
        """Subclass-typed convenience: return ``store.Product`` instances
        that should appear in customer listings (browse/search/navbar).

        Wraps ``Purchasable.objects.available_for_listing()`` so callers
        can access subclass fields (exam_session_subject,
        product_product_variation, ...) without a downcast. Drops the
        exam-session date window — see :meth:`available_now` for the
        purchase-side counterpart.
        """
        from store.models.purchasable import Purchasable
        return cls.objects.filter(
            pk__in=Purchasable.objects.available_for_listing().values('pk')
        )

    @classmethod
    def available_now(cls, *, at=None):
        """Subclass-typed convenience: return ``store.Product`` instances
        that are currently available for **purchase** (8-condition
        predicate including the exam-session date window).

        Equivalent to filtering ``Purchasable.objects.available_now()``
        to ``kind='product'`` rows. Use for cart/checkout server-side
        gating, not for listing — see :meth:`available_for_listing`.
        """
        from store.models.purchasable import Purchasable
        return cls.objects.filter(
            pk__in=Purchasable.objects.available_now(at=at).values('pk')
        )

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
