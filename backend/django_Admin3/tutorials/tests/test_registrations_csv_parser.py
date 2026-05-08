"""Tests for registrations_csv_parser (Phase 2 Task 2.1).

The CSV is event-keyed at the row level via TutorialSessions.title (which
follows the convention `{event.code}-{sequence}`). One row = one session's
active student enrolment list. Refs inside the ``ActEd Student Numbers``
field are comma-delimited.

Per real-data discoveries (2026-05-05):
- Q1: Title is the TutorialSessions.title (direct lookup)
- Q2=B: refs with `(N)` paren suffix are skipped with a warning
- Q3=A: swap columns are ignored in this phase
- Cancelled rows are skipped — cancelled events should not have active
  registrations.
"""
import io

from django.test import TestCase

from tutorials.services.registrations_csv_parser import parse_registrations_csv
from tutorials.tests import factories


HEADER = (
    '"Title","Subject","Is Cancelled","Sitting","Enrolled",'
    '"ActEd Student Numbers","Swaps In ActEd Student Numbers",'
    '"Swaps out","Custom: Swaps out ActEd Student Numbers (Event)"\n'
)


def _csv(body):
    return io.StringIO(HEADER + body)


class ParseRegistrationsCsvTests(TestCase):
    def setUp(self):
        self.event = factories.make_event(code='EV-PARSE')
        # Session title format follows real DB: "{event.code}-{sequence}".
        self.session_1 = factories.make_session(
            event=self.event, sequence=1, title=f'{self.event.code}-1',
        )
        self.session_2 = factories.make_session(
            event=self.event, sequence=2, title=f'{self.event.code}-2',
        )
        self.alice = factories.make_student('alice')
        self.bob = factories.make_student('bob')
        # student_ref is an AutoField PK; use the auto-assigned values.
        self.alice_ref = self.alice.student_ref
        self.bob_ref = self.bob.student_ref

    def test_parses_single_row_with_session_lookup(self):
        body = f'"{self.session_1.title}","XX",False,"2024A",0,"{self.alice_ref}, {self.bob_ref}","","",""\n'
        result = parse_registrations_csv(_csv(body))
        self.assertEqual(result.total_rows, 1)
        self.assertEqual(len(result.rows), 1)
        row = result.rows[0]
        self.assertEqual(row.session_id, self.session_1.id)
        self.assertEqual(set(row.student_refs), {self.alice_ref, self.bob_ref})
        self.assertEqual(result.unmatched, [])

    def test_unknown_session_title_skipped(self):
        body = f'"Day 999","XX",False,"2024A",0,"{self.alice_ref}","","",""\n'
        result = parse_registrations_csv(_csv(body))
        self.assertEqual(result.rows, [])
        self.assertEqual(len(result.unmatched), 1)
        self.assertIn('session_title', result.unmatched[0]['reason'])
        self.assertEqual(result.skipped_unknown_session, 1)

    def test_unknown_student_ref_filtered_with_warning(self):
        body = f'"{self.session_1.title}","XX",False,"2024A",0,"{self.alice_ref}, 999999999","","",""\n'
        result = parse_registrations_csv(_csv(body))
        self.assertEqual(len(result.rows), 1)
        self.assertEqual(result.rows[0].student_refs, [self.alice_ref])
        self.assertEqual(len(result.unmatched), 1)
        self.assertIn('999999999', result.unmatched[0]['reason'])
        self.assertEqual(result.skipped_unknown_student, 1)

    def test_paren_suffix_refs_skipped_with_warning(self):
        body = f'"{self.session_1.title}","XX",False,"2024A",0,"{self.alice_ref}, {self.bob_ref} (2)","","",""\n'
        result = parse_registrations_csv(_csv(body))
        self.assertEqual(result.rows[0].student_refs, [self.alice_ref])
        self.assertEqual(result.skipped_paren_suffix, 1)
        self.assertTrue(any('(2)' in u['reason'] or 'paren' in u['reason'].lower()
                            for u in result.unmatched))

    def test_skips_cancelled_rows(self):
        body = f'"{self.session_1.title}","XX",True,"2024A",0,"{self.alice_ref}","","",""\n'
        result = parse_registrations_csv(_csv(body))
        self.assertEqual(result.rows, [])
        self.assertEqual(result.skipped_cancelled, 1)

    def test_strips_whitespace_in_refs(self):
        body = f'"{self.session_1.title}","XX",False,"2024A",0,"  {self.alice_ref} ,  {self.bob_ref}  ","","",""\n'
        result = parse_registrations_csv(_csv(body))
        self.assertEqual(set(result.rows[0].student_refs), {self.alice_ref, self.bob_ref})

    def test_ignores_swap_columns(self):
        # Swap columns populated; parser should not crash and not include
        # swap data in the row output.
        body = (
            f'"{self.session_1.title}","XX",False,"2024A",0,"{self.alice_ref}",'
            '"33333; 44444","Some Name; Other Name","55555;"\n'
        )
        result = parse_registrations_csv(_csv(body))
        self.assertEqual(len(result.rows), 1)
        self.assertEqual(result.rows[0].student_refs, [self.alice_ref])

    def test_empty_refs_field_yields_no_row(self):
        body = f'"{self.session_1.title}","XX",False,"2024A",0,"","","",""\n'
        result = parse_registrations_csv(_csv(body))
        self.assertEqual(result.rows, [])
        self.assertEqual(result.skipped_empty, 1)

    def test_dedup_repeated_ref_in_row(self):
        body = (
            f'"{self.session_1.title}","XX",False,"2024A",0,'
            f'"{self.alice_ref}, {self.alice_ref}, {self.bob_ref}","","",""\n'
        )
        result = parse_registrations_csv(_csv(body))
        self.assertEqual(sorted(result.rows[0].student_refs), sorted([self.alice_ref, self.bob_ref]))
