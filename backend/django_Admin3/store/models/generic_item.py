"""GenericItem — MTI subclass of Purchasable for non-ESS catalog items.

Covers Marking Vouchers, Document Binders, and Additional Charges.
Shares a PK with its parent Purchasable row.

Table: acted.generic_items
"""
from django.db import models

from store.models.purchasable import Purchasable


class GenericItem(Purchasable):
    """A non-ESS purchasable item (voucher, binder, additional charge)."""

    validity_period_days = models.PositiveIntegerField(
        null=True, blank=True,
        help_text='If set, issued instances expire this many days after purchase (e.g., 1460 for 4 years).'
    )
    stock_tracked = models.BooleanField(
        default=False,
        help_text='Whether physical inventory is tracked for this item.'
    )

    class Meta:
        db_table = '"acted"."generic_items"'
        verbose_name = 'Generic Item'
        verbose_name_plural = 'Generic Items'
