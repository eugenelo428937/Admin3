from django.db import models
from .order import Order


class OrderDelivery(models.Model):
    ADDRESS_TYPE_CHOICES = [
        ('home', 'Home'),
        ('work', 'Work'),
    ]

    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name='delivery_detail',
        help_text="Associated order for this delivery detail"
    )

    # Address Types
    delivery_address_type = models.CharField(
        max_length=10, choices=ADDRESS_TYPE_CHOICES, null=True, blank=True
    )
    invoice_address_type = models.CharField(
        max_length=10, choices=ADDRESS_TYPE_CHOICES, null=True, blank=True
    )

    # Complete Address Data (JSONB)
    delivery_address_data = models.JSONField(default=dict, blank=True)
    invoice_address_data = models.JSONField(default=dict, blank=True)

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = '"acted"."order_delivery_detail"'
        managed = False
        verbose_name = 'Order Delivery Detail'
        verbose_name_plural = 'Order Delivery Details'
        indexes = [
            models.Index(fields=['order']),
        ]

    def __str__(self):
        delivery_type = self.delivery_address_type or 'unspecified'
        return f"Delivery Detail for Order #{self.order.id}: {delivery_type} delivery"
