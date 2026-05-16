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

        Code generation is now owned by each subclass:
        - MaterialProduct.save() generates {subject}/{variation_code}{product_code}/{exam_session}
        - TutorialProduct.save() / MarkingProduct.save() generate their own codes.

        By the time we reach this parent save(), product_code is already
        set by the subclass.

        Legacy-kwarg fallback: when a caller uses
        ``Product(product_product_variation=ppv)`` the PPV is stashed on
        ``_pending_ppv`` via the property setter (kind defaults to
        ``material``). If we reach Product.save() with a pending PPV and
        kind='material', we delegate to MaterialProduct.save() so the
        subclass row gets created with its PPV column populated.
        """
        if not self.kind:
            raise ValueError(
                'Phase 5: store.Product requires kind to be set explicitly. '
                'Use MaterialProduct/TutorialProduct/MarkingProduct subclasses '
                'which set kind in their own save() methods, or pass '
                'kind=Purchasable.Kind.MATERIAL/TUTORIAL/MARKING.'
            )

        # If the caller used the legacy product_product_variation kwarg on
        # a bare Product with kind='material', materialise the row as a
        # MaterialProduct so the PPV FK column gets populated. For
        # tutorial/marking kinds, the pending PPV is dropped (those
        # subclasses don't store PPVs anymore).
        pending_ppv = getattr(self, '_pending_ppv', None)
        if (
            pending_ppv is not None
            and type(self).__name__ == 'Product'
            and self.kind == self.Kind.MATERIAL
        ):
            from store.models.material_product import MaterialProduct
            # Promote to MaterialProduct. Copy the attribute set, drop our
            # transient slot, and save through the subclass.
            mp = MaterialProduct(
                kind=self.kind,
                code=getattr(self, 'code', '') or '',
                name=self.name,
                description=self.description,
                is_active=self.is_active,
                dynamic_pricing=self.dynamic_pricing,
                is_addon=self.is_addon,
                vat_classification=self.vat_classification or '',
                exam_session_subject=self.exam_session_subject,
                product_code=self.product_code or '',
                product_product_variation=pending_ppv,
            )
            mp.save(*args, **kwargs)
            # Mirror the saved PK / product_code back to self so callers
            # holding the original instance see the persisted state.
            self.pk = mp.pk
            self.product_code = mp.product_code
            self.code = mp.code
            # Clear the pending slot so subsequent saves do not retry.
            self._pending_ppv = None
            return

        if self.product_code:
            # Mirror product_code to Purchasable.code
            self.code = self.product_code
        super().save(*args, **kwargs)

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

    @property
    def product_product_variation(self):
        """Phase 5: backward-compat accessor delegating to
        ``MaterialProduct.product_product_variation``.

        The FK was moved off the ``Product`` parent in migration 0024 and
        now lives exclusively on ``MaterialProduct``. Tutorial and Marking
        subclasses have no PPV (their variation semantics live in
        ``TutorialProduct.format`` / ``tutorial_location`` and
        ``MarkingProduct.marking_template`` respectively), so this returns
        ``None`` for non-Material rows.

        The bare ``except Exception`` swallows both
        ``MaterialProduct.DoesNotExist`` (raised by the reverse OneToOne
        accessor for non-Material rows) and ``AttributeError`` (defensive).

        Pending writes (set via the setter before ``save()`` runs) are
        kept on the in-memory ``_pending_ppv`` slot so callers using the
        legacy kwarg pattern ``Product(product_product_variation=ppv)``
        see the value back before it lands on the DB row.
        """
        pending = getattr(self, '_pending_ppv', None)
        if pending is not None:
            return pending
        try:
            return self.materialproduct.product_product_variation
        except Exception:
            return None

    @product_product_variation.setter
    def product_product_variation(self, value):
        """Phase 5 backward-compat setter.

        Allows legacy callers like ``Product(product_product_variation=ppv)``
        or ``Product.objects.create(product_product_variation=ppv, ...)`` to
        continue working. The value is stashed on the instance and applied
        in :meth:`save` by creating/updating the corresponding
        ``MaterialProduct`` row.

        For bare ``store.Product`` callers, setting a non-null PPV implies
        ``kind='material'``; the setter sets ``kind`` automatically if it
        has not been set yet. Subclass instances (Tutorial/Marking) leave
        their kind alone — they don't store PPV anyway, so the pending
        value is harmless and the subclass's own save() generates the
        product_code.

        Callers passing ``product_product_variation=None`` clear the
        pending write but do NOT delete an existing MaterialProduct row.
        """
        self._pending_ppv = value
        # Only default kind for bare Product instances. Subclasses set
        # their own kind in their save() method.
        if (
            value is not None
            and not self.kind
            and type(self).__name__ == 'Product'
        ):
            self.kind = self.Kind.MATERIAL
