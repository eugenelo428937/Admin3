"""marking_vouchers serializers.

MarkingVoucherSerializer and AddMarkingVoucherToCartSerializer were
removed in Task 24 (Release B) when the MarkingVoucher model was dropped.
Voucher catalog data is now served via the store app's Purchasable /
GenericItem serializers.
"""
from rest_framework import serializers

from .models import RedeemedVoucher


class RedeemedVoucherSerializer(serializers.ModelSerializer):
    issued_voucher_code = serializers.CharField(
        source='issued_voucher.voucher_code', read_only=True,
    )
    marking_paper_name = serializers.CharField(
        source='marking_paper.name', read_only=True,
    )

    class Meta:
        model = RedeemedVoucher
        fields = [
            'id',
            'issued_voucher',
            'issued_voucher_code',
            'marking_paper',
            'marking_paper_name',
            'redeemed_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
