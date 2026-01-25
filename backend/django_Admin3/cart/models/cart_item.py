from django.db import models
from store.models import Product as StoreProduct

from .cart import Cart


class CartItem(models.Model):
    cart = models.ForeignKey(Cart, related_name="items", on_delete=models.CASCADE)

    # Product reference - store.Product (consolidated model)
    product = models.ForeignKey(
        StoreProduct,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='cart_items',
        help_text="Reference to store.Product"
    )
    marking_voucher = models.ForeignKey('marking_vouchers.MarkingVoucher', on_delete=models.CASCADE, null=True, blank=True)

    # Item type to distinguish between products, vouchers, and fees
    ITEM_TYPE_CHOICES = [
        ('product', 'Product'),
        ('marking_voucher', 'Marking Voucher'),
        ('fee', 'Fee'),
    ]
    item_type = models.CharField(max_length=20, choices=ITEM_TYPE_CHOICES, default='product')

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
                    models.Q(product__isnull=False) |
                    models.Q(marking_voucher__isnull=False) |
                    models.Q(item_type='fee')
                ),
                name='cart_item_has_product_or_voucher_or_is_fee'
            ),
            models.CheckConstraint(
                condition=~(models.Q(product__isnull=False) & models.Q(marking_voucher__isnull=False)),
                name='cart_item_not_both_product_and_voucher'
            ),
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

    def __str__(self):
        if self.item_type == 'marking_voucher':
            return f"{self.quantity} x {self.marking_voucher} in cart {self.cart.id}"
        return f"{self.quantity} x {self.product} ({self.price_type}) in cart {self.cart.id}"

    @property
    def item_name(self):
        """Get the display name of the item"""
        if self.item_type == 'marking_voucher':
            return self.marking_voucher.name
        return str(self.product)

    @property
    def item_price(self):
        """Get the price of the item"""
        if self.actual_price is not None:
            return self.actual_price
        if self.item_type == 'marking_voucher':
            return self.marking_voucher.price
        return None
