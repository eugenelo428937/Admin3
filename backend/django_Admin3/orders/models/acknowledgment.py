from django.db import models
from django.utils import timezone
from .order import Order


class OrderAcknowledgment(models.Model):
    ACKNOWLEDGMENT_TYPE_CHOICES = [
        ('terms_conditions', 'Terms & Conditions'),
        ('product_specific', 'Product-Specific Acknowledgment'),
        ('deadline_expired', 'Expired Deadline Acknowledgment'),
        ('policy_change', 'Policy Change Acknowledgment'),
        ('warning', 'Warning Acknowledgment'),
        ('digital_consent', 'Digital Content Consent'),
        ('custom', 'Custom Acknowledgment'),
    ]

    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name='user_acknowledgments',
        help_text="Associated order for this acknowledgment"
    )

    # Type and identification
    acknowledgment_type = models.CharField(
        max_length=50,
        choices=ACKNOWLEDGMENT_TYPE_CHOICES,
        help_text="Type of acknowledgment required"
    )
    rule_id = models.PositiveIntegerField(null=True, blank=True, help_text="ID of the rule that triggered this")
    template_id = models.PositiveIntegerField(null=True, blank=True, help_text="ID of the message template used")

    # Acknowledgment details
    title = models.CharField(max_length=255, help_text="Title/subject of the acknowledgment")
    content_summary = models.TextField(help_text="Brief summary of what was acknowledged")
    is_accepted = models.BooleanField(default=False, help_text="Whether user accepted this")
    accepted_at = models.DateTimeField(auto_now_add=True, help_text="Timestamp when acknowledgment was made")

    # Audit trail
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)

    # Version tracking
    content_version = models.CharField(max_length=20, default='1.0')
    acknowledgment_data = models.JSONField(default=dict, blank=True)
    rules_engine_context = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = '"acted"."order_user_acknowledgments"'
        managed = False
        verbose_name = 'Order Acknowledgment'
        verbose_name_plural = 'Order Acknowledgments'
        ordering = ['-accepted_at']
        indexes = [
            models.Index(fields=['order', 'acknowledgment_type']),
            models.Index(fields=['rule_id']),
            models.Index(fields=['acknowledgment_type']),
        ]

    def __str__(self):
        status = "Accepted" if self.is_accepted else "Pending"
        return f"{self.get_acknowledgment_type_display()} {status} for Order #{self.order.id}"

    @property
    def is_terms_and_conditions(self):
        return self.acknowledgment_type == 'terms_conditions'

    @property
    def is_product_specific(self):
        return self.acknowledgment_type == 'product_specific'

    def get_affected_products(self):
        return self.acknowledgment_data.get('product_ids', [])
