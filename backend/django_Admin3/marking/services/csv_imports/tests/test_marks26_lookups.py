from datetime import timedelta
from django.contrib.auth.models import User
from django.utils import timezone

from marking.tests.fixtures import MarkingChainTestCase
from marking.models import Marker
from marking.services.csv_imports.marks26_lookups import build_lookups
from marking_vouchers.models import IssuedVoucher
from orders.models import Order
from orders.models.order_item import OrderItem
from staff.models import Staff


class BuildLookupsTests(MarkingChainTestCase):
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()

        # Marker
        marker_user = User.objects.create_user(
            username='marker_a', first_name='M', last_name='A',
        )
        cls.marker = Marker.objects.create(user=marker_user, initial='LAR')

        # Staff
        staff_user = User.objects.create_user(
            username='staff_a', first_name='S', last_name='A',
        )
        cls.staff = Staff.objects.create(user=staff_user, initials='SXC')

        # Voucher OrderItem with the orderno used by the test rows
        cls.voucher_oi = OrderItem.objects.create(
            order=cls.fixture_order,
            purchasable=cls.mv_purchasable,
            quantity=1,
            metadata={'orderno': '1903896'},
        )
        # OrderItem for direct (non-voucher) row — uses the store_product purchasable
        cls.direct_oi = OrderItem.objects.create(
            order=cls.fixture_order,
            purchasable=cls.store_product,  # store.Product (Purchasable subclass)
            quantity=1,
            metadata={'orderno': '1848940'},
        )

        cls.iv = IssuedVoucher.objects.create(
            voucher_code='7401908',
            order_item=cls.voucher_oi,
            purchasable=cls.mv_purchasable,
            expires_at=timezone.now() + timedelta(days=30),
        )

        # Set sequences on the fixture paper so build_lookups indexes it
        cls.paper.sequences = 1
        cls.paper.save(update_fields=['sequences'])

    def test_lookups_keyed_correctly(self):
        lookups = build_lookups()
        self.assertIn(self.student.student_ref, lookups.students)
        self.assertEqual(lookups.markers['LAR'].pk, self.marker.pk)
        self.assertEqual(lookups.staff['SXC'].pk, self.staff.pk)
        self.assertEqual(
            lookups.products[self.store_product.product_code].pk,
            self.store_product.pk,
        )
        self.assertEqual(
            lookups.papers[(self.subject.code, self.paper.name, self.paper.sequences)].pk,
            self.paper.pk,
        )
        self.assertEqual(lookups.issued_vouchers['7401908'].pk, self.iv.pk)
        self.assertEqual(lookups.mv_purchasable.pk, self.mv_purchasable.pk)

    def test_order_items_keyed_by_orderno_and_purchasable(self):
        lookups = build_lookups()
        # Voucher row: lookup by (orderno, 'MV')
        oi = lookups.order_items[('1903896', 'MV')]
        self.assertEqual(oi.pk, self.voucher_oi.pk)

        # Direct row: lookup by (orderno, product_code)
        oi = lookups.order_items[('1848940', self.store_product.product_code)]
        self.assertEqual(oi.pk, self.direct_oi.pk)
