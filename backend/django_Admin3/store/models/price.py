"""Price model for the store app.

Pricing information for store products, supporting multiple price types
per product (standard, retaker, reduced, additional).

Table: acted.prices
"""
from django.db import models


class Price(models.Model):
    """
    Pricing for a store product.

    Supports multiple price types per product:
    - standard: Regular price
    - retaker: Price for returning exam candidates
    - reduced: Reduced rate (e.g., student discount)
    - additional: Price for additional copies

    **Usage Example**::

        product = Product.objects.get(product_code='CM2/PCSM01P/2025-04')
        standard_price = product.prices.get(price_type='standard')
    """

    PRICE_TYPE_CHOICES = [
        ('standard', 'Standard'),
        ('retaker', 'Retaker'),
        ('reduced', 'Reduced Rate'),
        ('additional', 'Additional Copy'),
    ]

    product = models.ForeignKey(
        'store.Product',
        on_delete=models.CASCADE,
        related_name='+',  # disable reverse accessor during transition
        null=True, blank=True,
        help_text='DEPRECATED - use purchasable. Removed in Release B.'
    )
    purchasable = models.ForeignKey(
        'store.Purchasable',
        on_delete=models.CASCADE,
        related_name='prices',
        null=True, blank=True,
        help_text='The purchasable this price applies to.'
    )
    price_type = models.CharField(
        max_length=20,
        choices=PRICE_TYPE_CHOICES,
        default='standard',
        help_text='The type of pricing tier'
    )
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text='Price amount'
    )
    currency = models.CharField(
        max_length=8,
        default='GBP',
        help_text='Currency code (ISO 4217)'
    )
    is_active = models.BooleanField(
        default=True,
        help_text='Whether this price is active'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = '"acted"."prices"'
        # unique_together dropped during dual-write (Tasks 3-11).
        # Restored as ('purchasable', 'price_type') in Task 11 after backfill.
        verbose_name = 'Price'
        verbose_name_plural = 'Prices'

    def save(self, *args, **kwargs):
        """Auto-populate purchasable from product during the dual-write phase.

        Release A shim: callers (including legacy code and test fixtures) that
        set only `product=...` get `purchasable=...` populated automatically
        because `Product` is an MTI subclass of `Purchasable` (Task 7), so
        `product.pk == product.purchasable_ptr_id == purchasable.pk`.

        Ensures `purchasable.prices.all()` (the MTI-inherited reverse accessor)
        always sees every Price row, even ones written via the legacy FK.

        Removed in Release B when the `product` FK is dropped (Task 23).
        """
        if self.product_id is not None and self.purchasable_id is None:
            self.purchasable_id = self.product_id
        super().save(*args, **kwargs)

    def __str__(self):
        label = self.purchasable.code if self.purchasable_id else (
            self.product.product_code if self.product_id else '?'
        )
        return f"{label} - {self.price_type}: {self.amount} {self.currency}"
