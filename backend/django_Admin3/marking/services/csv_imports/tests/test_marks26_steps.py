from django.contrib.auth.models import User
from django.utils import timezone

from marking.tests.fixtures import MarkingChainTestCase
from marking.models import (
    Marker, MarkingPaperFeedback, MarkingPaperGrading, MarkingPaperSubmission,
)
from marking.services.csv_imports.marks26_lookups import build_lookups
from marking.services.csv_imports.marks26_parsing import Marks26Row
from marking.services.csv_imports.marks26_steps import run_import_steps
from marking_vouchers.models import IssuedVoucher, RedeemedVoucher
from orders.models.order_item import OrderItem
from staff.models import Staff


def make_row(**kw):
    base = dict(
        row_num=2, ref='', subject='*', assign='', abbrev='*', sequence='0',
        datelogged='/  /', dateout='/  /', score='', grade='', marker='',
        rating='', voucher='0', order='', realdatein='/  /', expiry='/  /',
        staffalloc='', hubdownld='/  /', hubout='/  /', hubfeedbk='/  /',
        comments='',
    )
    base.update(kw)
    return Marks26Row(**base)


class RunImportStepsTests(MarkingChainTestCase):
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()

        marker_user = User.objects.create_user(
            username='m1', first_name='Marker', last_name='One',
        )
        cls.marker = Marker.objects.create(user=marker_user, initial='LAR')

        staff_user = User.objects.create_user(
            username='s1', first_name='Staff', last_name='One',
        )
        cls.staff = Staff.objects.create(user=staff_user, initials='SXC')

        # Voucher OrderItem at orderno '1903896'
        cls.voucher_oi = OrderItem.objects.create(
            order=cls.fixture_order, purchasable=cls.mv_purchasable,
            quantity=1, metadata={'orderno': '1903896'},
        )
        # Direct OrderItem at orderno '1848940' using store_product
        cls.direct_oi = OrderItem.objects.create(
            order=cls.fixture_order, purchasable=cls.store_product,
            quantity=1, metadata={'orderno': '1848940'},
        )

        # Update fixture paper.name + sequences to match the lookup pattern
        cls.paper.name = 'X'
        cls.paper.sequences = 1
        cls.paper.save(update_fields=['name', 'sequences'])

    def test_voucher_unredeemed_creates_only_iv(self):
        rows = [make_row(
            ref=str(self.student.student_ref),
            assign='*/MV/22', voucher='V1', order='1903896',
            expiry='08/10/2030',
        )]
        run_import_steps(rows, build_lookups())
        self.assertEqual(IssuedVoucher.objects.count(), 1)
        self.assertEqual(RedeemedVoucher.objects.count(), 0)
        self.assertEqual(MarkingPaperSubmission.objects.count(), 0)

    def test_voucher_redeemed_creates_iv_rv_submission(self):
        rows = [make_row(
            ref=str(self.student.student_ref),
            subject=self.subject.code,
            assign='*/MV/22S', abbrev='X', sequence='1',
            voucher='V2', order='1903896',
            expiry='08/10/2030',
            datelogged='10/04/2026', realdatein='10/04/2026',
        )]
        run_import_steps(rows, build_lookups())
        self.assertEqual(IssuedVoucher.objects.count(), 1)
        iv = IssuedVoucher.objects.get()
        self.assertEqual(iv.status, 'redeemed')
        self.assertIsNotNone(iv.redeemed_at)
        self.assertEqual(RedeemedVoucher.objects.count(), 1)
        sub = MarkingPaperSubmission.objects.get()
        self.assertEqual(sub.student_id, self.student.student_ref)
        self.assertIsNotNone(sub.redeemed_voucher)

    def test_full_chain_iv_rv_sub_grading_feedback(self):
        rows = [make_row(
            ref=str(self.student.student_ref),
            subject=self.subject.code,
            assign='*/MV/22S', abbrev='X', sequence='1',
            voucher='V3', order='1903896', expiry='08/10/2030',
            datelogged='10/04/2026', realdatein='10/04/2026',
            dateout='13/04/2026', staffalloc='SXC', marker='LAR',
            score='73', grade='A', hubout='14/04/2026',
            hubfeedbk='15/04/2026', rating='E', comments='Good work',
        )]
        run_import_steps(rows, build_lookups())
        self.assertEqual(MarkingPaperGrading.objects.count(), 1)
        g = MarkingPaperGrading.objects.get()
        self.assertEqual(g.score, 73)
        self.assertEqual(g.grade, 'A')
        self.assertEqual(g.marker, self.marker)
        self.assertEqual(g.allocate_by, self.staff)
        self.assertEqual(MarkingPaperFeedback.objects.count(), 1)
        f = MarkingPaperFeedback.objects.get()
        self.assertEqual(f.rating, 'E')
        self.assertEqual(f.comments, 'Good work')

    def test_iv_issued_at_overridden_to_order_date(self):
        rows = [make_row(
            ref=str(self.student.student_ref),
            assign='*/MV/22', voucher='V4', order='1903896',
            expiry='08/10/2030',
        )]
        run_import_steps(rows, build_lookups())
        iv = IssuedVoucher.objects.get()
        self.assertEqual(iv.issued_at, self.fixture_order.order_date)

    def test_direct_paid_row_creates_submission_only(self):
        rows = [make_row(
            ref=str(self.student.student_ref),
            subject=self.subject.code,
            assign=self.store_product.product_code,
            abbrev='X', sequence='1',
            voucher='0', order='1848940',
            datelogged='10/04/2026', realdatein='10/04/2026',
        )]
        run_import_steps(rows, build_lookups())
        self.assertEqual(IssuedVoucher.objects.count(), 0)
        self.assertEqual(MarkingPaperSubmission.objects.count(), 1)
        sub = MarkingPaperSubmission.objects.get()
        self.assertIsNone(sub.redeemed_voucher)
        self.assertEqual(sub.order_item, self.direct_oi)
