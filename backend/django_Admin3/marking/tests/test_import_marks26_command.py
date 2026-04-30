import os
import tempfile
from io import StringIO

from django.contrib.auth.models import User
from django.core.management import CommandError, call_command
from django.utils import timezone

from marking.tests.fixtures import MarkingChainTestCase
from marking.models import (
    Marker, MarkingPaperGrading, MarkingPaperSubmission,
)
from marking_vouchers.models import IssuedVoucher, RedeemedVoucher
from orders.models.order_item import OrderItem
from staff.models import Staff


HEADER = (
    'ref,subject,assign,abbrev,sequence,datelogged,datein,dateout,'
    'adjust,adjustrec,turnround,turnround2,score,grade,marker,rating,'
    'fee,voucher,warnings,status,order,xsolutions,realdatein,expiry,'
    'c_code,tmprated,rated,recvtype,stafflogin,staffalloc,staffret,'
    'fee_cat,hubdownld,hubout,hubfeedbk,hubonhold,hubhide,comments\n'
)


class ImportMarks26CommandTests(MarkingChainTestCase):
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

        cls.voucher_oi = OrderItem.objects.create(
            order=cls.fixture_order, purchasable=cls.mv_purchasable,
            quantity=1, metadata={'orderno': '9001'},
        )

        cls.paper.name = 'X'
        cls.paper.sequences = 1
        cls.paper.save(update_fields=['name', 'sequences'])

    def _write(self, body):
        f = tempfile.NamedTemporaryFile(
            mode='w', suffix='.csv', delete=False, newline='',
        )
        f.write(HEADER + body)
        f.close()
        self.addCleanup(os.unlink, f.name)
        return f.name

    def test_imports_redeemed_voucher_full_chain(self):
        body = (
            f'{self.student.student_ref},{self.subject.code},*/MV/22S,X,1,'
            f'10/04/2026,10/04/2026,13/04/2026,0,0,0,0,73,A,LAR,E,0,V100,,,'
            f'9001,,10/04/2026,28/04/2030,GB,F,F, ,,SXC,,0,10/04/2026,'
            f'14/04/2026,15/04/2026,/  /,/  /,Good work\n'
        )
        path = self._write(body)
        out = StringIO()
        call_command('import_marks26', '--csv-path', path, stdout=out)
        self.assertEqual(IssuedVoucher.objects.count(), 1)
        self.assertEqual(RedeemedVoucher.objects.count(), 1)
        self.assertEqual(MarkingPaperSubmission.objects.count(), 1)
        self.assertEqual(MarkingPaperGrading.objects.count(), 1)

    def test_aborts_when_target_table_non_empty(self):
        IssuedVoucher.objects.create(
            voucher_code='X', order_item=self.voucher_oi,
            purchasable=self.mv_purchasable, expires_at=timezone.now(),
        )
        path = self._write('')
        with self.assertRaises(CommandError) as ctx:
            call_command('import_marks26', '--csv-path', path, stderr=StringIO())
        self.assertIn('not empty', str(ctx.exception).lower())

    def test_validation_failure_writes_error_csv(self):
        body = (
            f'99999,*,*/MV/22,*,0,/  /,/  /,/  /,0,0,0,0,0, ,, ,0,V1,,,'
            f'9001,,/  /,08/10/2030,GB,F,F, ,,,,0,/  /,/  /,/  /,/  /,/  /,\n'
        )
        path = self._write(body)
        errors_path = path + '.errors.csv'
        with self.assertRaises(CommandError):
            call_command(
                'import_marks26', '--csv-path', path,
                '--errors-path', errors_path, stderr=StringIO(),
            )
        self.assertEqual(IssuedVoucher.objects.count(), 0)
        with open(errors_path) as f:
            self.assertIn('student_ref=99999', f.read())
        os.unlink(errors_path)

    def test_dry_run_validates_but_does_not_import(self):
        body = (
            f'{self.student.student_ref},*,*/MV/22,*,0,/  /,/  /,/  /,0,0,0,0,'
            f'0, ,, ,0,V1,,,9001,,/  /,08/10/2030,GB,F,F, ,,,,0,/  /,/  /,'
            f'/  /,/  /,/  /,\n'
        )
        path = self._write(body)
        out = StringIO()
        call_command('import_marks26', '--csv-path', path, '--dry-run', stdout=out)
        self.assertEqual(IssuedVoucher.objects.count(), 0)
        self.assertIn('Dry-run', out.getvalue())
