"""Purchasable — unified parent table for all sellable items.

Every cart/order line references a Purchasable. Concrete subclasses
(Product, GenericItem) share a PK with the parent via Django MTI.

Table: acted.purchasables
"""
from django.db import models
from django.db.models import Q
from django.utils import timezone

# Phase 4e: the kinds that represent "catalog-backed store products"
# (have an associated store.Product row, route through PPV, etc.).
# Generic kinds — marking_voucher, document_binder, additional_charge —
# bypass the catalog and have leaf-only is_active semantics.
# Replaces the legacy `kind='product'` discriminator (removed in Phase 4e
# Task 5 — see docs/superpowers/plans/2026-05-15-product-mti-specialization-phase-4e-kind-cleanup.md).
STORE_PRODUCT_KINDS = frozenset({'material', 'tutorial', 'marking'})


class PurchasableQuerySet(models.QuerySet):
    """QuerySet for Purchasable with the canonical availability predicates.

    Two predicates are exposed:

    - :meth:`available_for_listing` — 7-condition listing predicate. Drops
      the exam-session date window so customers can browse products from
      upcoming and recently-closed sessions. Used by every list/search/
      navbar surface.
    - :meth:`available_now` — 8-condition purchase predicate (listing
      conditions ANDed with ``start_date <= now <= end_date``). Used only
      by the cart-add gate and the per-item ``is_available`` flag. The
      frontend uses the same window check to disable Add-to-cart while
      keeping the product visible.
    """

    # Listing-side conditions for store products. Date window NOT included
    # — that's the listing/purchase split. See class docstring.
    _LISTING_PRODUCT_CONDITIONS = dict(
        kind__in=STORE_PRODUCT_KINDS,
        product__product_product_variation__is_active=True,
        product__product_product_variation__product__is_active=True,
        product__product_product_variation__product_variation__is_active=True,
        product__exam_session_subject__is_active=True,
        product__exam_session_subject__subject__active=True,
        product__exam_session_subject__exam_session__is_active=True,
    )

    def available_for_listing(self):
        """Filter to purchasables that should appear in customer listings.

        ANDs every upstream ``is_active`` flag for store-product
        purchasables, but does NOT require the exam-session date window
        to include today. A product whose session opens in 30 days is
        still visible — the frontend disables Add-to-cart for that case
        and the cart server-side gate (:meth:`available_now`) rejects
        any direct attempt to purchase.

        Non-product purchasables (vouchers, charges) check only
        ``is_active``.

        Use for: store products list, fuzzy/advanced search, navbar
        dropdowns, bundle component listings.
        """
        return self.filter(
            Q(is_active=True) & (
                # Generic purchasables (vouchers, charges) — leaf flag only.
                ~Q(kind__in=STORE_PRODUCT_KINDS)
                |
                # Store products — 7-condition listing chain (no date window).
                Q(**self._LISTING_PRODUCT_CONDITIONS)
            )
        )

    def available_now(self, *, at=None):
        """Filter to purchasables currently available for **purchase**.

        ANDs the listing predicate with the exam-session date window
        (``start_date <= now <= end_date``). Non-product purchasables
        check only ``is_active``.

        Use for: cart-add server-side gate, per-cart-item
        ``is_available`` flag. Listing surfaces must use
        :meth:`available_for_listing` instead — gating the list on the
        date window hides products from upcoming sessions, which is bad
        UX (customers don't know they can pre-order or that materials
        are coming).

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
                ~Q(kind__in=STORE_PRODUCT_KINDS)
                |
                # Store products — listing chain + date window (8 conditions).
                Q(
                    **self._LISTING_PRODUCT_CONDITIONS,
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
        # Specialized product families (Phase 1+) — backfilled from PRODUCT in Phase 2
        MATERIAL = 'material', 'Material Product'
        TUTORIAL = 'tutorial', 'Tutorial Product'
        MARKING = 'marking', 'Marking Product'
        # Generic non-ESS purchasables
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
        constraints = [
            # Phase 4e: defence-in-depth against raw SQL inserts that
            # would otherwise resurrect the legacy 'product' kind value
            # (removed from Kind.choices). Added by migration 0020.
            models.CheckConstraint(
                condition=~models.Q(kind='product'),
                name='purchasable_kind_not_legacy_product',
            ),
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
