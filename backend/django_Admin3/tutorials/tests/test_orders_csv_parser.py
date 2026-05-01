"""Tests for tutorials.services.orders_csv_parser.

Parses docs/misc/tutorial_orders.csv format:
  ref, lastname, firstname, email, subject, fullname, xcode, xname, csitting

Each row maps a (student, subject, sitting) to either:
- a face-to-face choice — fullname matches '<N><suffix> Choice tutorial (<event_code>)'
- an OC entry — fullname contains 'Online Classroom' (skipped per Q1=A)
"""
import io

from django.test import SimpleTestCase

from tutorials.services.orders_csv_parser import (
    ParsedOrderRow, parse_orders_csv, OrdersParseResult,
)


HEADER = (
    "ref,lastname,firstname,email,subject,fullname,xcode,xname,csitting\n"
)


class OrdersParseTests(SimpleTestCase):
    def test_parses_first_choice_tutorial(self):
        body = HEADER + (
            '76166,"Manchanda","Tanya","tanya.manchanda@wtwco.com","CP2",'
            '"1st Choice tutorial (CP2-17)","CP2_LO_1","CP2-17","2024"\n'
        )
        result = parse_orders_csv(io.StringIO(body))
        self.assertEqual(len(result.rows), 1)
        row = result.rows[0]
        self.assertIsInstance(row, ParsedOrderRow)
        self.assertEqual(row.student_ref, 76166)
        self.assertEqual(row.firstname, 'Tanya')
        self.assertEqual(row.lastname, 'Manchanda')
        self.assertEqual(row.email, 'tanya.manchanda@wtwco.com')
        self.assertEqual(row.subject_code, 'CP2')
        self.assertEqual(row.choice_rank, 1)
        self.assertEqual(row.event_code_xname, 'CP2-17')
        self.assertEqual(row.variation_code_xcode, 'CP2_LO_1')
        self.assertEqual(row.sitting_year, '2024')

    def test_parses_2nd_3rd_choice_ranks(self):
        body = HEADER + (
            '76166,"M","T","t@x.com","CP2","2nd Choice tutorial (CP2-02)","CP2_LO_2","CP2-02","2024"\n'
            '76166,"M","T","t@x.com","CP2","3rd Choice tutorial (CP2-12)","CP2_LO_1","CP2-12","2024"\n'
        )
        result = parse_orders_csv(io.StringIO(body))
        self.assertEqual([r.choice_rank for r in result.rows], [2, 3])

    def test_skips_oc_rows_by_xname_prefix(self):
        body = HEADER + (
            '68060,"Munro","Hannah","h@x.com","CM1","CM1 Online Classroom (OC-CM1-24)",'
            '"CM1OC","OC-CM1-24","2024"\n'
            '76166,"Manchanda","T","t@x.com","CP2","1st Choice tutorial (CP2-17)",'
            '"CP2_LO_1","CP2-17","2024"\n'
        )
        result = parse_orders_csv(io.StringIO(body))
        self.assertEqual(len(result.rows), 1)
        self.assertEqual(result.rows[0].event_code_xname, 'CP2-17')
        self.assertEqual(result.skipped_oc_count, 1)

    def test_skips_oc_rows_by_fullname_text(self):
        # Defensive: handle OC with non-OC- xname format (just in case)
        body = HEADER + (
            '68060,"Munro","H","h@x.com","CM1","CM1 Online Classroom (X-Y-Z)",'
            '"CM1OC","X-Y-Z","2024"\n'
        )
        result = parse_orders_csv(io.StringIO(body))
        self.assertEqual(result.rows, [])
        self.assertEqual(result.skipped_oc_count, 1)

    def test_unparseable_fullname_recorded_as_skipped(self):
        body = HEADER + (
            '76166,"M","T","t@x.com","CP2","Mystery row format","CP2_LO_1","CP2-99","2024"\n'
        )
        result = parse_orders_csv(io.StringIO(body))
        self.assertEqual(result.rows, [])
        self.assertEqual(result.skipped_unparseable_count, 1)

    def test_invalid_student_ref_recorded_as_skipped(self):
        body = HEADER + (
            'NOT-AN-INT,"M","T","t@x.com","CP2","1st Choice tutorial (CP2-17)",'
            '"CP2_LO_1","CP2-17","2024"\n'
        )
        result = parse_orders_csv(io.StringIO(body))
        self.assertEqual(result.rows, [])
        self.assertEqual(result.skipped_unparseable_count, 1)

    def test_total_rows_count_includes_skipped(self):
        body = HEADER + (
            '68060,"Munro","H","h@x.com","CM1","CM1 Online Classroom (OC-CM1-24)","CM1OC","OC-CM1-24","2024"\n'
            '76166,"M","T","t@x.com","CP2","1st Choice tutorial (CP2-17)","CP2_LO_1","CP2-17","2024"\n'
            '76166,"M","T","t@x.com","CP2","2nd Choice tutorial (CP2-02)","CP2_LO_2","CP2-02","2024"\n'
        )
        result = parse_orders_csv(io.StringIO(body))
        self.assertEqual(result.total_rows, 3)
        self.assertEqual(len(result.rows), 2)
        self.assertEqual(result.skipped_oc_count, 1)
