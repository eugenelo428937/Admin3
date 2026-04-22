from django.db import models
from .order import Order


class OrderItem(models.Model):
    ITEM_TYPE_CHOICES = [
        ('product', 'Product'),
        ('marking_voucher', 'Marking Voucher'),
        ('fee', 'Fee'),
    ]

    order = models.ForeignKey(Order, related_name="items", on_delete=models.CASCADE)

    # Task 23 (Release B): legacy `product`, `marking_voucher`, and
    # `item_type` columns have been dropped. All items reach the catalog
    # via the unified `purchasable` FK; the former fields are now
    # read-only @properties derived from `purchasable`.
    purchasable = models.ForeignKey(
        'store.Purchasable',
        on_delete=models.PROTECT,
        related_name='order_items_by_purchasable',
        help_text='The catalog entity being purchased.'
    )

    quantity = models.PositiveIntegerField(default=1)
    price_type = models.CharField(max_length=20, default="standard")
    actual_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    is_cancelled = models.BooleanField(
        default=False, help_text="Whether this item is cancelled")
    # VAT information per item
    net_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Amount before VAT")
    vat_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="VAT amount for this item")
    gross_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Total amount including VAT")
    vat_rate = models.DecimalField(max_digits=5, decimal_places=4, default=0.0000, help_text="VAT rate applied to this item")
    is_vat_exempt = models.BooleanField(default=False, help_text="Whether this item is exempt from VAT")

    metadata = models.JSONField(default=dict, blank=True, help_text="Additional product-specific data")

    class Meta:
        db_table = '"acted"."order_items"'
        managed = True
        verbose_name = 'Order Item'
        verbose_name_plural = 'Order Items'

    def __init__(self, *args, **kwargs):
        """Task 23 backward-compat: translate legacy kwargs to `purchasable`.

        See ``cart.models.cart_item.CartItem.__init__`` for rationale —
        identical kwarg translation for the orders side.
        """
        product = kwargs.pop('product', None)
        marking_voucher = kwargs.pop('marking_voucher', None)
        item_type = kwargs.pop('item_type', None)
        if 'purchasable' not in kwargs and 'purchasable_id' not in kwargs:
            if product is not None:
                try:
                    kwargs['purchasable'] = product.purchasable_ptr
                except AttributeError:
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
            return f"{self.quantity} x {self.marking_voucher} - {self.gross_amount} (Order #{self.order.id})"
        return f"{self.quantity} x {self.product} ({self.price_type}) - {self.gross_amount} (Order #{self.order.id})"

    @property
    def item_name(self):
        """Get the display name of the item.

        Prefers the product's string representation for ESS products, falls
        back to the purchasable's name for vouchers / binders / fees.
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

        Prefers the line-level actual_price (captured at order time).
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
          - any other GenericItem kind             → 'fee'
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
        return 'fee'
