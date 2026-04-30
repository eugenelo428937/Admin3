"""RedeemedVoucher — one row per voucher redemption against a marking paper.

The OneToOneField on issued_voucher enforces that a voucher can be
redeemed at most once.
"""
from django.db import models


class RedeemedVoucher(models.Model):
    issued_voucher = models.OneToOneField(
        'marking_vouchers.IssuedVoucher',
        on_delete=models.PROTECT,
        related_name='redemption',
    )
    marking_paper = models.ForeignKey(
        'marking.MarkingPaper',
        on_delete=models.PROTECT,
        related_name='redemptions',
    )
    redeemed_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = '"acted"."redeemed_vouchers"'
        verbose_name = 'Redeemed Voucher'
        verbose_name_plural = 'Redeemed Vouchers'

    def __str__(self):
        return f'Redemption({self.issued_voucher.voucher_code} → {self.marking_paper.name})'
