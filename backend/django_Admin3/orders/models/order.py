from django.db import models
from django.conf import settings


class Order(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)

    # Order totals
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Total before VAT and fees")
    vat_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Total VAT amount")
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Final total including VAT")

    # VAT information
    vat_rate = models.DecimalField(max_digits=5, decimal_places=4, null=True, blank=True, help_text="VAT rate applied")
    vat_country = models.CharField(max_length=2, null=True, blank=True, help_text="Country code for VAT calculation")
    vat_calculation_type = models.CharField(max_length=50, null=True, blank=True, help_text="Type of VAT calculation used")

    # Rule engine calculations
    calculations_applied = models.JSONField(default=dict, blank=True, help_text="All rule engine calculations applied to this order")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = '"acted"."orders"'
        managed = False
        verbose_name = 'Order'
        verbose_name_plural = 'Orders'
        ordering = ['-created_at']

    def __str__(self):
        return f"Order #{self.id} by {self.user.username} ({self.total_amount})"
