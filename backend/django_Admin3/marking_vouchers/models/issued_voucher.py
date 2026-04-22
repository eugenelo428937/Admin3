"""IssuedVoucher — one row per issued voucher unit.

Created at order confirmation (Task 17). Each unit has its own unique code
and its own expiry datetime (typically purchase date + 4 years).
"""
from django.db import models


class IssuedVoucher(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('redeemed', 'Redeemed'),
        ('expired', 'Expired'),
        ('cancelled', 'Cancelled'),
    ]

    voucher_code = models.CharField(max_length=32, unique=True, db_index=True)
    order_item = models.ForeignKey(
        'orders.OrderItem',
        on_delete=models.CASCADE,
        related_name='issued_vouchers',
    )
    purchasable = models.ForeignKey(
        'store.Purchasable',
        on_delete=models.PROTECT,
        related_name='issued_vouchers',
        help_text='Which catalog SKU this voucher was issued from (denormalised for reporting).'
    )
    issued_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default='active')
    redeemed_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancellation_reason = models.TextField(blank=True)

    class Meta:
        db_table = '"acted"."issued_vouchers"'
        verbose_name = 'Issued Voucher'
        verbose_name_plural = 'Issued Vouchers'
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['expires_at']),
            models.Index(fields=['order_item']),
        ]

    def __str__(self):
        return f"{self.voucher_code} ({self.status})"
