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
        related_name='prices',
        help_text='The product this price applies to'
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
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = '"acted"."prices"'
        unique_together = ('product', 'price_type')
        verbose_name = 'Price'
        verbose_name_plural = 'Prices'

    def __str__(self):
        return f"{self.product.product_code} - {self.price_type}: {self.amount} {self.currency}"
