"""Tests for RedeemedVoucher — one-to-one redemption against a marking paper."""
from datetime import timedelta
from django.contrib.auth.models import User
from django.db import IntegrityError
from django.utils import timezone

from marking.tests.fixtures import MarkingChainTestCase
from marking_vouchers.models import IssuedVoucher, RedeemedVoucher
from orders.models import Order
from orders.models.order_item import OrderItem
from store.models import Purchasable


class RedeemedVoucherTests(MarkingChainTestCase):
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.mv_purchasable = Purchasable.objects.create(
            kind='marking_voucher', code='MV', name='Marking Voucher',
        )
        cls.order = Order.objects.create(
            user=cls.student_user, order_date=timezone.now(),
        )
        cls.order_item = OrderItem.objects.create(
            order=cls.order,
            purchasable=cls.mv_purchasable,
            quantity=1,
            metadata={'orderno': '1490175'},
        )
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
