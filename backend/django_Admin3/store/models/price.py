"""Price model for the store app.

Pricing information for store purchasables, supporting multiple price types
per purchasable (standard, retaker, reduced, additional).

Table: acted.prices
"""
from django.db import models


class Price(models.Model):
    """
    Pricing for a store purchasable.

    Supports multiple price types per purchasable:
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

    purchasable = models.ForeignKey(
        'store.Purchasable',
        on_delete=models.CASCADE,
        related_name='prices',
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
        unique_together = ('purchasable', 'price_type')
        verbose_name = 'Price'
        verbose_name_plural = 'Prices'

    def __init__(self, *args, **kwargs):
        """Task 23 backward-compat: accept legacy ``product=`` kwarg.

        ``Price.product`` FK has been dropped. Translate
        ``product=<store.Product>`` to ``purchasable=<product.purchasable_ptr>``
        so existing call sites (tests, legacy import scripts) keep working.
        """
        product = kwargs.pop('product', None)
        if product is not None and 'purchasable' not in kwargs and 'purchasable_id' not in kwargs:
            try:
                kwargs['purchasable'] = product.purchasable_ptr
            except AttributeError:
                kwargs['purchasable'] = product
        super().__init__(*args, **kwargs)

    def __str__(self):
        return f"{self.purchasable.code} - {self.price_type}: {self.amount} {self.currency}"
