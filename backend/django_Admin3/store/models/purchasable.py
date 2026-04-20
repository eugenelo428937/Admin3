"""Purchasable — unified parent table for all sellable items.

Every cart/order line references a Purchasable. Concrete subclasses
(Product, GenericItem) share a PK with the parent via Django MTI.

Table: acted.purchasables
"""
from django.db import models


class Purchasable(models.Model):
    """Parent catalog entity for any sellable item.

    The ``kind`` discriminator lets VAT rules, pricing code, and
    reporting branch without joining to subclass tables.
    """

    KIND_CHOICES = [
        ('product', 'Store Product (ESS-based)'),
        ('marking_voucher', 'Marking Voucher'),
        ('document_binder', 'Document Binder'),
        ('additional_charge', 'Additional Charge'),
    ]

    kind = models.CharField(max_length=32, choices=KIND_CHOICES)
    code = models.CharField(max_length=64, unique=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    dynamic_pricing = models.BooleanField(
        default=False,
        help_text='If True, price is set per cart/order line (actual_price), not from Price table.'
    )
    vat_classification = models.CharField(
        max_length=32, blank=True,
        help_text='Used by VAT rules engine to select rate.'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = '"acted"."purchasables"'
        verbose_name = 'Purchasable'
        verbose_name_plural = 'Purchasables'
        indexes = [
            models.Index(fields=['kind']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return f"{self.code} ({self.kind})"
