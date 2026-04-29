"""Tests for RedeemedVoucher — one-to-one redemption against a marking paper."""
from datetime import timedelta
from django.db import IntegrityError, transaction
from django.utils import timezone

from marking.tests.fixtures import MarkingChainTestCase
from marking_vouchers.models import IssuedVoucher, RedeemedVoucher


class RedeemedVoucherTests(MarkingChainTestCase):
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.iv = IssuedVoucher.objects.create(
            voucher_code='ABC123',
            order_item=cls.order_item,
            purchasable=cls.mv_purchasable,
            expires_at=timezone.now() + timedelta(days=365),
        )

    def test_create_redeemed_voucher(self):
        rv = RedeemedVoucher.objects.create(
            issued_voucher=self.iv,
            marking_paper=self.paper,
            redeemed_at=timezone.now(),
        )
        self.assertIsNotNone(rv.pk)
        self.assertIsNotNone(rv.created_at)
        self.assertIsNotNone(rv.updated_at)

    def test_one_to_one_issued_voucher(self):
        RedeemedVoucher.objects.create(
            issued_voucher=self.iv,
            marking_paper=self.paper,
            redeemed_at=timezone.now(),
        )
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                RedeemedVoucher.objects.create(
                    issued_voucher=self.iv,
                    marking_paper=self.paper,
                    redeemed_at=timezone.now(),
                )

    def test_str_representation(self):
        rv = RedeemedVoucher.objects.create(
            issued_voucher=self.iv,
            marking_paper=self.paper,
            redeemed_at=timezone.now(),
        )
        self.assertIn('ABC123', str(rv))
        self.assertIn(self.paper.name, str(rv))
