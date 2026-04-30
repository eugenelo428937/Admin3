import io
from django.test import TestCase

from marking.services.csv_imports.marks26_parsing import (
    Marks26Row,
    parse_marks26_csv,
)


HEADER = (
    'ref,subject,assign,abbrev,sequence,datelogged,datein,dateout,'
    'adjust,adjustrec,turnround,turnround2,score,grade,marker,rating,'
    'fee,voucher,warnings,status,order,xsolutions,realdatein,expiry,'
    'c_code,tmprated,rated,recvtype,stafflogin,staffalloc,staffret,'
    'fee_cat,hubdownld,hubout,hubfeedbk,hubonhold,hubhide,comments\n'
)


class ParseMarks26CsvTests(TestCase):
    def test_parses_voucher_row(self):
        content = HEADER + (
            '71546,*,*/MV/22,*,0,/  /,/  /,/  /,0,0,0,0,0, ,, ,0,'
            '7329562,,,1490175,,/  /,08/10/2025,GB,F,F, ,,,,0,/  /,'
            '/  /,/  /,/  /,/  /,\n'
        )
        rows = parse_marks26_csv(io.StringIO(content))
        self.assertEqual(len(rows), 1)
        r = rows[0]
        self.assertEqual(r.row_num, 2)
        self.assertEqual(r.ref, '71546')
        self.assertEqual(r.subject, '*')
        self.assertEqual(r.assign, '*/MV/22')
        self.assertTrue(r.is_voucher_row())
        self.assertFalse(r.is_voucher_row_redeemed())

    def test_parses_redeemed_voucher_row(self):
        content = HEADER + (
            '79244,CP1,*/MV/22S,M2,1,10/04/2026,10/04/2026,13/04/2026,0,0,1,1,'
            '73,A,LAR, ,58,7401908,,,1903896,,10/04/2026,28/04/2026,GB,F,F, ,,'
            'CSX,,0,10/04/2026,14/04/2026,/  /,/  /,/  /,\n'
        )
        rows = parse_marks26_csv(io.StringIO(content))
        r = rows[0]
        self.assertEqual(r.subject, 'CP1')
        self.assertTrue(r.is_voucher_row())
        self.assertTrue(r.is_voucher_row_redeemed())

    def test_parses_non_voucher_row(self):
        content = HEADER + (
            '82730,CP1,CP1/MX/26,X,1,/  /,/  /,/  /,0,0,0,0,0, ,, ,0,0,,,'
            '1848940,,/  /,16/09/2029,GB,T,F, ,,,,0,/  /,/  /,/  /,/  /,/  /,\n'
        )
        rows = parse_marks26_csv(io.StringIO(content))
        r = rows[0]
        self.assertEqual(r.assign, 'CP1/MX/26')
        self.assertFalse(r.is_voucher_row())

    def test_skips_blank_lines(self):
        content = HEADER + '\n'
        rows = parse_marks26_csv(io.StringIO(content))
        self.assertEqual(rows, [])

    def test_sequence_int_parses_integer(self):
        content = HEADER + (
            '79244,CP1,*/MV/22S,M2,3,10/04/2026,10/04/2026,13/04/2026,0,0,1,1,'
            '73,A,LAR, ,58,7401908,,,1903896,,10/04/2026,28/04/2026,GB,F,F, ,,'
            'CSX,,0,10/04/2026,14/04/2026,/  /,/  /,/  /,\n'
        )
        rows = parse_marks26_csv(io.StringIO(content))
        self.assertEqual(rows[0].sequence_int(), 3)
