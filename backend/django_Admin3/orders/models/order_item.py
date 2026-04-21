from django.db import models
from store.models import Product as StoreProduct
from .order import Order


class OrderItem(models.Model):
    ITEM_TYPE_CHOICES = [
        ('product', 'Product'),
        ('marking_voucher', 'Marking Voucher'),
        ('fee', 'Fee'),
    ]

    order = models.ForeignKey(Order, related_name="items", on_delete=models.CASCADE)

    # Product reference
    product = models.ForeignKey(
        StoreProduct,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='order_items',
        help_text="Reference to store.Product"
    )
    marking_voucher = models.ForeignKey(
        'marking_vouchers.MarkingVoucher',
        on_delete=models.CASCADE,
        null=True,
        blank=True
    )

    # Dual-write phase (Task 10): new unified FK alongside legacy product / marking_voucher FKs.
    # Becomes NOT NULL in Release B (Task 23) once backfill completes.
    # NOTE: reverse accessor is 'order_items_by_purchasable' to avoid clashing with the
    # legacy product FK's 'order_items' accessor — Product is an MTI subclass of Purchasable,
    # so both FKs ultimately reach the purchasables table. After Release B drops the
    # legacy FK, this can be renamed to 'order_items'.
    purchasable = models.ForeignKey(
        'store.Purchasable',
        on_delete=models.PROTECT,
        related_name='order_items_by_purchasable',
        help_text='The catalog entity being purchased. Non-null in Release B.'
    )

    item_type = models.CharField(max_length=20, choices=ITEM_TYPE_CHOICES, default='product')
    quantity = models.PositiveIntegerField(default=1)
    price_type = models.CharField(max_length=20, default="standard")
    actual_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    # VAT information per item
    net_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Amount before VAT")
    vat_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="VAT amount for this item")
    gross_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Total amount including VAT")
    vat_rate = models.DecimalField(max_digits=5, decimal_places=4, default=0.0000, help_text="VAT rate applied to this item")
    is_vat_exempt = models.BooleanField(default=False, help_text="Whether this item is exempt from VAT")

    metadata = models.JSONField(default=dict, blank=True, help_text="Additional product-specific data")

    class Meta:
        db_table = '"acted"."order_items"'
        managed = False
        verbose_name = 'Order Item'
        verbose_name_plural = 'Order Items'
        constraints = [
            models.CheckConstraint(
                condition=(
                    models.Q(product__isnull=False) |
                    models.Q(marking_voucher__isnull=False) |
                    models.Q(purchasable__isnull=False) |
                    models.Q(item_type='fee')
                ),
                name='order_item_has_product_or_voucher_or_is_fee'
            ),
            models.CheckConstraint(
                condition=~(models.Q(product__isnull=False) & models.Q(marking_voucher__isnull=False)),
                name='order_item_not_both_product_and_voucher'
            )
        ]

    def save(self, *args, **kwargs):
        """Auto-populate purchasable_id from legacy FKs during the transition.

        Release B shim: callers that set only `product=...`,
        `marking_voucher=...`, or `item_type='fee'` get `purchasable_id`
        populated automatically:

        - product-backed rows: purchasable_id == product_id (Product is an
          MTI subclass of Purchasable, so the parent pointer equals the
          Product PK).
        - voucher-backed rows: look up the GenericItem created in
          store.0008_backfill_purchasable_from_vouchers via matching code.
        - fee rows: point at the FEE_GENERIC Purchasable (created in
          store.0009_create_fee_generic_purchasable).

        Mirrors the save() shim on CartItem and on Price, and is removed
        in Task 23 when the legacy product/marking_voucher/fee columns
        are dropped from the DB.
        """
        if self.purchasable_id is None:
            if self.product_id is not None:
                # Product.id == Purchasable.id post-MTI.
                self.purchasable_id = self.product_id
            elif self.marking_voucher_id is not None:
                from store.models import GenericItem
                mv = self.marking_voucher
                gi, _ = GenericItem.objects.get_or_create(
                    kind='marking_voucher',
                    code=mv.code,
                    defaults={
                        'name': mv.name,
                        'description': mv.description or '',
                        'is_active': mv.is_active,
                        'dynamic_pricing': False,
                        'vat_classification': '',
                        'validity_period_days': 1460,
                        'stock_tracked': False,
                    },
                )
                self.purchasable_id = gi.purchasable_ptr_id
            elif self.item_type == 'fee':
                from store.models import Purchasable
                try:
                    fee = Purchasable.objects.get(code='FEE_GENERIC')
                    self.purchasable_id = fee.id
                except Purchasable.DoesNotExist:
                    pass
        super().save(*args, **kwargs)

    def __str__(self):
        if self.item_type == 'marking_voucher':
            return f"{self.quantity} x {self.marking_voucher} - {self.gross_amount} (Order #{self.order.id})"
        return f"{self.quantity} x {self.product} ({self.price_type}) - {self.gross_amount} (Order #{self.order.id})"

    @property
    def item_name(self):
        if self.item_type == 'marking_voucher':
            return self.marking_voucher.name
        return str(self.product)

    @property
    def item_price(self):
        if self.actual_price is not None:
            return self.actual_price
        if self.item_type == 'marking_voucher':
            return self.marking_voucher.price
        return None

    # ─────────────────────────────────────────────────────────────────────
    # Backward-compat shims — added in Task 19, renamed to plain names in
    # Task 23 when the legacy product/marking_voucher/item_type columns are
    # dropped from the DB. These derive the same values from the unified
    # `purchasable` FK so new code paths that populate only `purchasable_id`
    # still expose the legacy representation for callers during the
    # transition window.
    # ─────────────────────────────────────────────────────────────────────
    @property
    def product_shim(self):
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
    def marking_voucher_shim(self):
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
    def item_type_shim(self):
        """Returns the legacy item_type string derived from purchasable.kind.

        If the row has a legacy item_type column set (pre-backfill), prefer that;
        otherwise fall back to purchasable.kind.
        """
        if self.item_type:
            return self.item_type
        if self.purchasable_id:
            return self.purchasable.kind
        return None
