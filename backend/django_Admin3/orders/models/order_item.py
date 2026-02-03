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
                    models.Q(item_type='fee')
                ),
                name='order_item_has_product_or_voucher_or_is_fee'
            ),
            models.CheckConstraint(
                condition=~(models.Q(product__isnull=False) & models.Q(marking_voucher__isnull=False)),
                name='order_item_not_both_product_and_voucher'
            )
        ]

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
