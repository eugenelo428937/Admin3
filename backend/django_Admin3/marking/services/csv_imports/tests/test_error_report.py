import io
from django.test import TestCase

from marking.services.csv_imports.error_report import (
    write_markers_errors_csv,
    write_marks26_errors_csv,
)
from marking.services.csv_imports.markers import MarkerCsvRow, MarkerError
from marking.services.csv_imports.marks26_parsing import Marks26Row
from marking.services.csv_imports.marks26_validators import Marks26Error


class WriteMarkersErrorsCsvTests(TestCase):
    def test_writes_header_and_rows(self):
        row = MarkerCsvRow(row_num=5, mkref='38', firstname='David', lastname='Wilmot', initials='DCW')
        errors = [MarkerError(row=row, error_message='No auth_user matches')]
        out = io.StringIO()
        write_markers_errors_csv(errors, out)
        text = out.getvalue()
        self.assertIn('row_num,mkref,firstname,lastname,initials,error_message', text)
        self.assertIn('5,38,David,Wilmot,DCW,No auth_user matches', text)


class WriteMarks26ErrorsCsvTests(TestCase):
    def test_writes_header_and_rows(self):
        row = Marks26Row(
            row_num=57, ref='76138', subject='CP3', assign='*/MV/22', abbrev='M2',
            sequence='1', datelogged='', dateout='', score='', grade='',
            marker='', rating='', voucher='', order='', realdatein='', expiry='',
            staffalloc='', hubdownld='', hubout='', hubfeedbk='', comments='',
        )
        errors = [Marks26Error(row=row, error_field='marker', error_message='not found')]
        out = io.StringIO()
        write_marks26_errors_csv(errors, out)
        text = out.getvalue()
        self.assertIn(
            'row_num,ref,subject,assign,abbrev,sequence,error_field,error_message',
            text,
        )
        # csv.writer quotes fields containing '*' but '*/MV/22' contains no special chars,
        # so it appears unquoted. Just check substring presence.
        self.assertIn('57,76138,CP3,*/MV/22,M2,1,marker,not found', text)
