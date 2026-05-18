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
        """Parent-class save. Each subclass (Material/Tutorial/Marking)
        sets kind explicitly in its own save(); bare ``Product.save()``
        with no kind raises ValueError because there is no meaningful
        default for store products.

        Code generation is owned by each subclass:
        - MaterialProduct.save() generates {subject}/{variation_code}{product_code}/{exam_session}
        - TutorialProduct.save() / MarkingProduct.save() generate their own codes.

        By the time we reach this parent save(), product_code is already
        set by the subclass.
        """
        if not self.kind:
            raise ValueError(
                'store.Product requires kind to be set explicitly. '
                'Use MaterialProduct/TutorialProduct/MarkingProduct subclasses '
                'which set kind in their own save() methods, or pass '
                'kind=Purchasable.Kind.MATERIAL/TUTORIAL/MARKING.'
            )

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

    def get_material_ppv(self):
        """Return MaterialProduct PPV for material rows, None otherwise.

        Explicit polymorphic accessor that replaces the legacy
        ``Product.product_product_variation`` backward-compat @property.
        Code that already knows the row is material should access
        ``self.materialproduct.product_product_variation`` directly and
        let ``MaterialProduct.DoesNotExist`` signal mis-routed callers.

        Fast path: when ``self`` is already a ``MaterialProduct`` instance,
        return the FK directly so callers see the descriptor's cached
        target (matching the legacy parent-property chain that preserved
        Python identity through ``self.materialproduct.product_product_variation``).
        """
        from store.models.material_product import MaterialProduct
        if isinstance(self, MaterialProduct):
            return self.product_product_variation
        try:
            return self.materialproduct.product_product_variation
        except MaterialProduct.DoesNotExist:
            return None

    @property
    def variations(self):
        """Single-row queryset compatibility shim.

        Some legacy callers expect ``essp.variations.all()``-style access.
        Returns a queryset containing only this product so ``.first()`` /
        iteration work without a downcast.
        """
        return Product.objects.filter(pk=self.pk)
