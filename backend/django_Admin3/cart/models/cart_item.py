from django.db import models

from .cart import Cart


class CartItem(models.Model):
    cart = models.ForeignKey(Cart, related_name="items", on_delete=models.CASCADE)

    # Task 23 (Release B): legacy `product`, `marking_voucher`, and `item_type`
    # columns have been dropped. All items reach the catalog via the unified
    # `purchasable` FK. `product`, `marking_voucher`, and `item_type` are now
    # read-only @properties derived from `purchasable`.
    purchasable = models.ForeignKey(
        'store.Purchasable',
        on_delete=models.PROTECT,
        related_name='cart_items_by_purchasable',
        help_text='The catalog entity being purchased.'
    )

    ITEM_TYPE_CHOICES = [
        ('product', 'Product'),
        ('marking_voucher', 'Marking Voucher'),
        ('fee', 'Fee'),
    ]

    quantity = models.PositiveIntegerField(default=1)
    price_type = models.CharField(max_length=20, default="standard")  # standard, retaker, additional
    actual_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    has_expired_deadline = models.BooleanField(default=False, help_text="Indicates if marking product has expired deadlines")
    expired_deadlines_count = models.IntegerField(default=0, help_text="Number of expired deadlines for marking products")
    marking_paper_count = models.IntegerField(default=0, help_text="Total number of marking papers for marking products")
    is_marking = models.BooleanField(default=False, help_text="Indicates if this is a marking product")
    metadata = models.JSONField(default=dict, blank=True, help_text="Additional product-specific data (e.g., tutorial choices, variation IDs)")
    added_at = models.DateTimeField(auto_now_add=True)

    # VAT calculation fields
    vat_region = models.CharField(
        max_length=10, null=True, blank=True,
        help_text="Regional VAT classification (UK, IE, EU, SA, ROW)"
    )
    vat_rate = models.DecimalField(
        max_digits=5, decimal_places=4, null=True, blank=True,
        help_text="VAT rate applied (e.g., 0.2000 for 20%)"
    )
    vat_amount = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text="Calculated VAT amount"
    )
    gross_amount = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text="Total including VAT (net + VAT)"
    )
    vat_calculated_at = models.DateTimeField(
        null=True, blank=True,
        help_text="Timestamp of last VAT calculation"
    )
    vat_rule_version = models.IntegerField(
        null=True, blank=True,
        help_text="Version of rule that calculated VAT"
    )

    class Meta:
        db_table = '"acted"."cart_items"'
        verbose_name = 'Cart Item'
        verbose_name_plural = 'Cart Items'
        ordering = ['added_at']
        constraints = [
            models.CheckConstraint(
                condition=(
                    models.Q(vat_rate__isnull=True) |
                    (models.Q(vat_rate__gte=0.0000) & models.Q(vat_rate__lte=1.0000))
                ),
                name='cart_item_vat_rate_range'
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(vat_amount__isnull=True) |
                    models.Q(vat_amount__gte=0)
                ),
                name='cart_item_vat_amount_non_negative'
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(gross_amount__isnull=True) |
                    models.Q(gross_amount__gte=0)
                ),
                name='cart_item_gross_amount_non_negative'
            )
        ]
        indexes = [
            models.Index(fields=['vat_region'], name='idx_cartitem_vat_region'),
            models.Index(fields=['vat_calculated_at'], name='idx_cartitem_vat_calc_at'),
            models.Index(fields=['cart', 'vat_region'], name='idx_cartitem_cart_vat_region'),
        ]

    def __init__(self, *args, **kwargs):
        """Task 23 backward-compat: translate legacy kwargs to `purchasable`.

        The legacy `product`, `marking_voucher`, and `item_type` fields are
        gone as DB columns and exist only as read-only @properties. Many
        existing call sites (tests, legacy service code) still pass them
        as kwargs to ``CartItem(...)`` / ``CartItem.objects.create(...)``.
        Translate them here so those call sites continue to work without
        change:

          - ``product=<store.Product>``    → ``purchasable=product.purchasable_ptr``
          - ``marking_voucher=<legacy MV>`` → resolve matching ``GenericItem``
          - ``item_type='fee'``             → ``purchasable=FEE_GENERIC``

        Silent drop for ``item_type`` values other than 'fee' — they were
        always redundant with the catalog FK.
        """
        product = kwargs.pop('product', None)
        marking_voucher = kwargs.pop('marking_voucher', None)
        item_type = kwargs.pop('item_type', None)
        if 'purchasable' not in kwargs and 'purchasable_id' not in kwargs:
            if product is not None:
                # store.Product is an MTI subclass of Purchasable; PK is
                # shared via purchasable_ptr.
                try:
                    kwargs['purchasable'] = product.purchasable_ptr
                except AttributeError:
                    # product may be a raw Purchasable-ish object already.
                    kwargs['purchasable'] = product
            elif marking_voucher is not None:
                from store.models import GenericItem
                gi, _ = GenericItem.objects.get_or_create(
                    kind='marking_voucher',
                    code=marking_voucher.code,
                    defaults={
                        'name': marking_voucher.name,
                        'description': getattr(marking_voucher, 'description', '') or '',
                        'is_active': getattr(marking_voucher, 'is_active', True),
                        'dynamic_pricing': False,
                        'vat_classification': '',
                        'validity_period_days': 1460,
                        'stock_tracked': False,
                    },
                )
                kwargs['purchasable_id'] = gi.purchasable_ptr_id
            elif item_type == 'fee':
                from store.models import Purchasable
                fee = Purchasable.objects.filter(code='FEE_GENERIC').first()
                if fee is not None:
                    kwargs['purchasable'] = fee
        super().__init__(*args, **kwargs)

    def __str__(self):
        if self.item_type == 'marking_voucher':
            return f"{self.quantity} x {self.marking_voucher} in cart {self.cart.id}"
        return f"{self.quantity} x {self.product} ({self.price_type}) in cart {self.cart.id}"

    @property
    def item_name(self):
        """Get the display name of the item.

        Prefers the product's string representation for ESS products, falls
        back to the purchasable's name for vouchers / binders / fees. Any
        row without a purchasable returns None (shouldn't happen after
        Release B since purchasable is NOT NULL, but defensive).
        """
        if self.purchasable_id is None:
            return None
        if self.item_type == 'marking_voucher':
            return self.marking_voucher.name
        product = self.product
        if product is not None:
            return str(product)
        return self.purchasable.name

    @property
    def item_price(self):
        """Get the price of the item.

        Prefers the line-level actual_price (captured at add-to-cart time).
        Falls back to the purchasable's standard-tier Price row. Returns None
        if neither is available.
        """
        if self.actual_price is not None:
            return self.actual_price
        if self.purchasable_id is None:
            return None
        try:
            standard = self.purchasable.prices.filter(
                price_type='standard', is_active=True,
            ).first()
        except Exception:
            return None
        return standard.amount if standard else None

    # ─────────────────────────────────────────────────────────────────────
    # Task 23: legacy `product`, `marking_voucher`, and `item_type` FK/
    # column names are now read-only @properties derived from `purchasable`.
    # Replaces the Task 19 `*_shim` variants, which have been renamed here.
    # ─────────────────────────────────────────────────────────────────────
    @property
    def product(self):
        """Returns the Product instance if purchasable.kind == 'product', else None."""
        if self.purchasable_id is None:
            return None
        try:
            if self.purchasable.kind != 'product':
                return None
            # Product is an MTI subclass of Purchasable; access via parent→child cast.
            return self.purchasable.product
        except Exception:
            return None

    @property
    def marking_voucher(self):
        """Returns the GenericItem instance if purchasable.kind == 'marking_voucher'."""
        if self.purchasable_id is None:
            return None
        try:
            if self.purchasable.kind != 'marking_voucher':
                return None
            return self.purchasable.genericitem
        except Exception:
            return None

    @property
    def item_type(self):
        """Returns the legacy item_type string derived from purchasable.

        Mapping:
          - purchasable.code == 'FEE_GENERIC'     → 'fee'
          - purchasable.kind == 'product'          → 'product'
          - purchasable.kind == 'marking_voucher'  → 'marking_voucher'
          - any other GenericItem kind             → 'fee' (catch-all for
            additional charges / legacy fees)
        """
        if self.purchasable_id is None:
            return None
        try:
            p = self.purchasable
        except Exception:
            return None
        if getattr(p, 'code', None) == 'FEE_GENERIC':
            return 'fee'
        kind = getattr(p, 'kind', None)
        if kind in ('product', 'marking_voucher'):
            return kind
        # Other purchasable kinds (additional_charge, document_binder, etc.)
        # map to 'fee' for legacy serializer compatibility.
        return 'fee'
