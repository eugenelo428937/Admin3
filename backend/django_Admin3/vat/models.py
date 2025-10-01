"""
VAT Models

Epic 3: Dynamic VAT Calculation System
Phase 2: VAT Audit Trail & Database Schema
"""
from django.db import models


class VATAudit(models.Model):
    """
    Audit trail for VAT calculation executions.

    Stores complete history of VAT calculations with:
    - Rule execution details (rule_id, version)
    - Input context (user, cart, settings)
    - Output data (VAT amounts, rates applied)
    - Performance metrics (duration_ms)
    - Relationships (cart_id, order_id)

    This model provides:
    - Full audit trail for compliance
    - Debugging capability for VAT calculations
    - Performance monitoring
    - Historical analysis of rule applications
    """

    execution_id = models.CharField(
        max_length=100,
        db_index=True,
        help_text="Unique identifier for this VAT calculation execution"
    )

    cart = models.ForeignKey(
        'cart.Cart',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="Cart this VAT calculation was for (if applicable)"
    )

    order = models.ForeignKey(
        'cart.ActedOrder',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="Order this VAT calculation was for (if applicable)"
    )

    rule_id = models.CharField(
        max_length=100,
        db_index=True,
        help_text="ID of the VAT rule that was applied"
    )

    rule_version = models.IntegerField(
        help_text="Version of the rule that was applied"
    )

    input_context = models.JSONField(
        help_text="Input context for VAT calculation (user, item, settings)"
    )

    output_data = models.JSONField(
        help_text="Output data from VAT calculation (rates, amounts, rules applied)"
    )

    duration_ms = models.IntegerField(
        null=True,
        blank=True,
        help_text="Execution duration in milliseconds"
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Timestamp when this audit record was created"
    )

    class Meta:
        db_table = 'vat_audit'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['execution_id']),
            models.Index(fields=['cart']),
            models.Index(fields=['order']),
            models.Index(fields=['rule_id']),
            models.Index(fields=['created_at']),
        ]
        verbose_name = 'VAT Audit Record'
        verbose_name_plural = 'VAT Audit Records'

    def __str__(self):
        return f"VATAudit {self.execution_id} - Rule {self.rule_id} v{self.rule_version}"
