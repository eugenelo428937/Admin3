import io
from django.test import TestCase

from marking.services.csv_imports.error_report import write_markers_errors_csv
from marking.services.csv_imports.markers import MarkerCsvRow, MarkerError


class WriteMarkersErrorsCsvTests(TestCase):
    def test_writes_header_and_rows(self):
        row = MarkerCsvRow(row_num=5, mkref='38', firstname='David', lastname='Wilmot', initials='DCW')
        errors = [MarkerError(row=row, error_message='No auth_user matches')]
        out = io.StringIO()
        write_markers_errors_csv(errors, out)
        text = out.getvalue()
        self.assertIn('row_num,mkref,firstname,lastname,initials,error_message', text)
        self.assertIn('5,38,David,Wilmot,DCW,No auth_user matches', text)
