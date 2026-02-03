from django.db import models
from .order import Order


class Payment(models.Model):
    PAYMENT_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
        ('refunded', 'Refunded'),
    ]

    PAYMENT_METHOD_CHOICES = [
        ('card', 'Credit/Debit Card'),
        ('invoice', 'Invoice'),
        ('bank_transfer', 'Bank Transfer'),
    ]

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='payments')

    # Payment details
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, default='card')
    amount = models.DecimalField(max_digits=10, decimal_places=2, help_text="Payment amount")
    currency = models.CharField(max_length=3, default='GBP', help_text="Payment currency")

    # Transaction details
    transaction_id = models.CharField(max_length=100, null=True, blank=True, help_text="Gateway transaction ID")
    status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='pending')

    # Client information
    client_ip = models.GenericIPAddressField(null=True, blank=True, help_text="Client IP address")
    user_agent = models.TextField(null=True, blank=True, help_text="User agent string")

    # Opayo response data
    opayo_response = models.JSONField(default=dict, blank=True, help_text="Full Opayo API response")
    opayo_status_code = models.CharField(max_length=10, null=True, blank=True, help_text="Opayo status code")
    opayo_status_detail = models.CharField(max_length=200, null=True, blank=True, help_text="Opayo status detail")

    # Error information
    error_message = models.TextField(null=True, blank=True, help_text="Error message if payment failed")
    error_code = models.CharField(max_length=50, null=True, blank=True, help_text="Error code if payment failed")

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    processed_at = models.DateTimeField(null=True, blank=True, help_text="When payment was processed")

    # Additional metadata
    metadata = models.JSONField(default=dict, blank=True, help_text="Additional payment metadata")

    class Meta:
        db_table = '"acted"."order_payments"'
        managed = False
        verbose_name = 'Order Payment'
        verbose_name_plural = 'Order Payments'
        ordering = ['-created_at']

    def __str__(self):
        return f"Payment {self.id} for Order #{self.order.id} - {self.status} ({self.amount})"

    @property
    def is_successful(self):
        return self.status == 'completed'

    @property
    def is_card_payment(self):
        return self.payment_method == 'card'

    @property
    def is_invoice_payment(self):
        return self.payment_method == 'invoice'
