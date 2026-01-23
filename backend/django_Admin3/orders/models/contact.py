from django.db import models
from .order import Order


class OrderContact(models.Model):
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name='user_contact',
        help_text="Associated order for this contact information"
    )

    # Contact Information
    home_phone = models.CharField(max_length=20, null=True, blank=True)
    home_phone_country = models.CharField(max_length=2, blank=True, default='')
    mobile_phone = models.CharField(max_length=20, help_text="Required mobile phone number")
    mobile_phone_country = models.CharField(max_length=2, blank=True, default='')
    work_phone = models.CharField(max_length=20, null=True, blank=True)
    work_phone_country = models.CharField(max_length=2, blank=True, default='')
    email_address = models.EmailField(max_length=254, help_text="Required email address")

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = '"acted"."order_user_contact"'
        managed = False
        verbose_name = 'Order Contact'
        verbose_name_plural = 'Order Contacts'
        indexes = [
            models.Index(fields=['order']),
        ]

    def __str__(self):
        return f"Contact for Order #{self.order.id}: {self.email_address}"
