"""Tests for IssuedVoucherService — issuance."""
import re
from datetime import timedelta
from django.test import TestCase
from django.utils import timezone
from marking_vouchers.models import IssuedVoucher
from marking_vouchers.services.voucher_service import IssuedVoucherService


class IssuedVoucherServiceIssueTests(TestCase):
    def setUp(self):
        from store.models import Purchasable, GenericItem
        from orders.models import Order, OrderItem
        from django.contrib.auth import get_user_model
        User = get_user_model()
        self.user = User.objects.create_user(username='u14', password='p', email='u14@x.com')
        self.gi = GenericItem.objects.create(
            kind='marking_voucher', code='MV-TEST-T14', name='Test',
            validity_period_days=1460,
        )
        self.order = Order.objects.create(user=self.user)
        self.order_item = OrderItem.objects.create(
            order=self.order, purchasable_id=self.gi.pk, quantity=3,
        )

    def test_issue_creates_quantity_rows(self):
        vouchers = IssuedVoucherService.issue(self.order_item)
        self.assertEqual(len(vouchers), 3)
        self.assertEqual(IssuedVoucher.objects.filter(order_item=self.order_item).count(), 3)

    def test_issued_codes_are_unique(self):
        vouchers = IssuedVoucherService.issue(self.order_item)
        codes = {v.voucher_code for v in vouchers}
        self.assertEqual(len(codes), 3)

    def test_code_format(self):
        v = IssuedVoucherService.issue(self.order_item)[0]
        self.assertRegex(v.voucher_code, r'^MV-\d{6}-[A-Z2-7]{8}$')

    def test_expiry_set_to_validity_period(self):
        v = IssuedVoucherService.issue(self.order_item)[0]
        expected = v.issued_at + timedelta(days=1460)
        self.assertLess(abs((v.expires_at - expected).total_seconds()), 2)

    def test_status_active(self):
        v = IssuedVoucherService.issue(self.order_item)[0]
        self.assertEqual(v.status, 'active')

    def test_issue_refuses_non_voucher_purchasable(self):
        from store.models import Purchasable
        from orders.models import OrderItem
        other = Purchasable.objects.create(kind='document_binder', code='B1-T14', name='B')
        oi = OrderItem.objects.create(order=self.order, purchasable_id=other.pk, quantity=1)
        with self.assertRaises(ValueError):
            IssuedVoucherService.issue(oi)
