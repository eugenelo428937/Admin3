"""Purchasable — unified parent table for all sellable items.

Every cart/order line references a Purchasable. Concrete subclasses
(Product, GenericItem) share a PK with the parent via Django MTI.

Table: acted.purchasables
"""
from django.db import models
from django.db.models import Q
from django.utils import timezone


class PurchasableQuerySet(models.QuerySet):
    """QuerySet for Purchasable with the canonical "available now" predicate."""

    def available_now(self, *, at=None):
        """Filter to purchasables currently available for sale.

        ANDs all upstream is_active flags + the exam-session date window
        for store-product purchasables. Non-product purchasables (vouchers,
        charges) check only ``is_active``.

        Use this in customer-facing queries (product list, search, navbar,
        bundle contents). Admin queries should NOT use this — they must
        see inactive items too.

        Args:
            at: datetime to evaluate against (defaults to ``timezone.now()``).
                Used by tests to evaluate windows without freezing the clock.
        """
        from django.utils.timezone import is_naive
        if at is None:
            now = timezone.now()
        else:
            if is_naive(at):
                raise ValueError(
                    "available_now(at=...) requires a timezone-aware datetime. "
                    "Use django.utils.timezone.now() or pass an aware datetime."
                )
            now = at
        return self.filter(
            Q(is_active=True) & (
                # Generic purchasables (vouchers, charges) — leaf flag only.
                ~Q(kind='product')
                |
                # Store products — full 8-condition chain.
                Q(
                    kind='product',
                    product__product_product_variation__is_active=True,
                    product__product_product_variation__product__is_active=True,
                    product__product_product_variation__product_variation__is_active=True,
                    product__exam_session_subject__is_active=True,
                    product__exam_session_subject__subject__active=True,
                    product__exam_session_subject__exam_session__is_active=True,
                    product__exam_session_subject__exam_session__start_date__lte=now,
                    product__exam_session_subject__exam_session__end_date__gte=now,
                )
            )
        )


class Purchasable(models.Model):
    """Parent catalog entity for any sellable item.

    The ``kind`` discriminator lets VAT rules, pricing code, and
    reporting branch without joining to subclass tables.
    """

    class Kind(models.TextChoices):
        PRODUCT = 'product', 'Store Product (ESS-based)'
        MARKING_VOUCHER = 'marking_voucher', 'Marking Voucher'
        DOCUMENT_BINDER = 'document_binder', 'Document Binder'
        ADDITIONAL_CHARGE = 'additional_charge', 'Additional Charge'

    kind = models.CharField(max_length=32, choices=Kind.choices)
    code = models.CharField(max_length=64, unique=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    dynamic_pricing = models.BooleanField(
        default=False,
        help_text='If True, price is set per cart/order line (actual_price), not from Price table.'
    )
    is_addon = models.BooleanField(
        default=False,
        help_text=(
            'True for solution/addon purchasables (e.g., PXS, CXS, CM1S, CYS). '
            'Distinguishes addons from their base product when both share the '
            'same catalog PPV (see Product.unique_together).'
        ),
    )
    vat_classification = models.CharField(
        max_length=32, blank=True,
        help_text='Used by VAT rules engine to select rate.'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = PurchasableQuerySet.as_manager()

    class Meta:
        db_table = '"acted"."purchasables"'
        verbose_name = 'Purchasable'
        verbose_name_plural = 'Purchasables'
        indexes = [
            models.Index(fields=['kind']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return f"{self.code} ({self.kind})"

    def is_available_now(self, *, at=None):
        """Scalar form of ``available_now()``.

        Used by cart-add validation and by ``CartItemSerializer`` to set
        the per-item ``is_available`` flag.

        Always evaluates the predicate through ``Purchasable.objects`` —
        the joined paths (``product__...``) are defined relative to the
        Purchasable parent and cannot be resolved from a subclass's
        QuerySet (which is rooted on the subclass table).
        """
        return Purchasable.objects.available_now(at=at).filter(pk=self.pk).exists()
