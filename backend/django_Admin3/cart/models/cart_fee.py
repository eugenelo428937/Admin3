from django.db import models

from .cart import Cart


class CartFee(models.Model):
    """
    Model for cart fees (booking fees, service charges, etc.)
    These are separate from regular cart items as they're not products.
    """
    FEE_TYPES = [
        ('tutorial_booking_fee', 'Tutorial Booking Fee'),
        ('service_charge', 'Service Charge'),
        ('processing_fee', 'Processing Fee'),
        ('convenience_fee', 'Convenience Fee'),
    ]

    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name='fees')
    fee_type = models.CharField(max_length=50, choices=FEE_TYPES)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='GBP')
    is_refundable = models.BooleanField(default=False)
    applied_at = models.DateTimeField(auto_now_add=True)
    applied_by_rule = models.IntegerField(null=True, blank=True, help_text="Rule ID that applied this fee")
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = '"acted"."cart_fees"'
        verbose_name = 'Cart Fee'
        verbose_name_plural = 'Cart Fees'
        unique_together = ['cart', 'fee_type']

    def __str__(self):
        return f"{self.name} - £{self.amount} ({self.cart.user.email})"

    @property
    def amount_display(self):
        """Display amount with currency symbol"""
        if self.currency == 'GBP':
            return f"£{self.amount}"
        elif self.currency == 'USD':
            return f"${self.amount}"
        elif self.currency == 'EUR':
            return f"€{self.amount}"
        return f"{self.amount} {self.currency}"
