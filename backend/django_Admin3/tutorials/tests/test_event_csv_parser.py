"""Tests for tutorials.services.event_csv_parser.

Parses docs/misc/tutorial_import.csv format:
  Code, Title, Start Date, Start Time, End Date, End Time, Venue, Sold Out,
  Finalisation date, remain_space, Location, main instructor, Instructors, Sequence

Rows are grouped: an "event header" row (Sequence empty) is followed by N
"session rows" (Sequence 1..N). Title prefix on session rows matches the
event row's Title.
"""
import io
from datetime import date, datetime, time

from django.test import SimpleTestCase

from tutorials.services.event_csv_parser import (
    ParsedEvent, ParsedSession, parse_events_csv, ParseError,
)


HEADER = (
    "Subject,product variations,"
    "Code,Title,Start Date,Start Time,End Date,End Time,Venue,Sold Out,"
    "Finalisation date,remain_space,Location,main instructor,Instructors,Sequence\n"
)


def _row(*values: str) -> str:
    """Build a CSV row with the new Subject/product variations columns prepended.

    Tests pre-date the column additions; this helper keeps the in-test row
    fixtures readable without retyping the new columns each time.
    """
    return f",,{','.join(values)}\n"


class ParseEventsCsvTests(SimpleTestCase):
    def test_parses_single_event_with_two_sessions(self):
        body = HEADER + (
            ',,CB1_LO_6,CB1-01-24A,30/11/2023,09:00,07/12/2023,12:30,Live Online,TRUE,30/10/2023,0,Live Online,Lynn Birchall,Lynn Birchall,\n'
            ',,CB1_LO_6,CB1-01-24A-1,30/11/2023,09:00,30/11/2023,12:30,Live Online,TRUE,,,Live Online,,Lynn Birchall,1\n'
            ',,CB1_LO_6,CB1-01-24A-2,07/12/2023,09:00,07/12/2023,12:30,Live Online,TRUE,,,Live Online,,Lynn Birchall,2\n'
        )
        result = parse_events_csv(io.StringIO(body))
        self.assertEqual(len(result.events), 1)
        ev = result.events[0]
        self.assertIsInstance(ev, ParsedEvent)
        self.assertEqual(ev.code, 'CB1_LO_6')
        self.assertEqual(ev.title, 'CB1-01-24A')
        self.assertEqual(ev.subject_code, 'CB1')
        self.assertEqual(ev.sitting_short, '24A')
        self.assertEqual(ev.session_code, '24')  # 24A → "24"
        self.assertEqual(ev.start_date, date(2023, 11, 30))
        self.assertEqual(ev.end_date, date(2023, 12, 7))
        self.assertEqual(ev.venue_name, 'Live Online')
        self.assertEqual(ev.location_name, 'Live Online')
        self.assertEqual(ev.is_soldout, True)
        self.assertEqual(ev.finalisation_date, date(2023, 10, 30))
        self.assertEqual(ev.remain_space, 0)
        self.assertEqual(ev.main_instructor_name, 'Lynn Birchall')
        self.assertEqual(ev.instructor_names, ['Lynn Birchall'])
        self.assertEqual(len(ev.sessions), 2)

        s1 = ev.sessions[0]
        self.assertIsInstance(s1, ParsedSession)
        self.assertEqual(s1.title, 'CB1-01-24A-1')
        self.assertEqual(s1.sequence, 1)
        self.assertEqual(s1.start_dt, datetime(2023, 11, 30, 9, 0))
        self.assertEqual(s1.end_dt, datetime(2023, 11, 30, 12, 30))
        self.assertEqual(s1.venue_name, 'Live Online')
        self.assertEqual(s1.location_name, 'Live Online')
        self.assertEqual(s1.instructor_names, ['Lynn Birchall'])

    def test_parses_explicit_subject_and_variation_columns(self):
        body = HEADER + (
            'CB1,F2F_6H,CB1_LO_6,CB1-01-24A,30/11/2023,09:00,30/11/2023,12:30,Live Online,TRUE,,0,Live Online,Lynn,Lynn,\n'
            'CB1,F2F_6H,CB1_LO_6,CB1-01-24A-1,30/11/2023,09:00,30/11/2023,12:30,Live Online,TRUE,,,Live Online,,Lynn,1\n'
        )
        result = parse_events_csv(io.StringIO(body))
        ev = result.events[0]
        self.assertEqual(ev.subject_code, 'CB1')
        self.assertEqual(ev.product_variation_code, 'F2F_6H')

    def test_falls_back_to_title_subject_when_subject_column_empty(self):
        body = HEADER + (
            ',,CB1_LO_6,CB1-01-24A,30/11/2023,09:00,30/11/2023,12:30,Live Online,TRUE,,0,Live Online,Lynn,Lynn,\n'
            ',,CB1_LO_6,CB1-01-24A-1,30/11/2023,09:00,30/11/2023,12:30,Live Online,TRUE,,,Live Online,,Lynn,1\n'
        )
        result = parse_events_csv(io.StringIO(body))
        ev = result.events[0]
        self.assertEqual(ev.subject_code, 'CB1')  # derived from title prefix
        self.assertEqual(ev.product_variation_code, '')

    def test_parses_september_sitting_keeps_S_suffix(self):
        body = HEADER + (
            ',,SP9_f2f_3,SP9-01-24S,01/08/2024,09:30,03/08/2024,17:00,BPP London City,FALSE,01/07/2024,3,London,Joe Bloggs,Joe Bloggs,\n'
            ',,SP9_f2f_3,SP9-01-24S-1,01/08/2024,09:30,01/08/2024,17:00,BPP London City,FALSE,,,London,,Joe Bloggs,1\n'
        )
        result = parse_events_csv(io.StringIO(body))
        ev = result.events[0]
        self.assertEqual(ev.sitting_short, '24S')
        self.assertEqual(ev.session_code, '24S')  # S sitting keeps suffix
        self.assertFalse(ev.is_soldout)
        self.assertEqual(ev.remain_space, 3)

    def test_multiple_instructors_semicolon_separated(self):
        body = HEADER + (
            ',,CB1_LO_6,CB1-02-24A,01/12/2023,09:00,02/12/2023,12:30,Live Online,TRUE,,0,Live Online,Lynn Birchall,Lynn Birchall;Anna Walklate,\n'
            ',,CB1_LO_6,CB1-02-24A-1,01/12/2023,09:00,01/12/2023,12:30,Live Online,TRUE,,,Live Online,,Lynn Birchall;Anna Walklate,1\n'
        )
        result = parse_events_csv(io.StringIO(body))
        ev = result.events[0]
        self.assertEqual(ev.instructor_names, ['Lynn Birchall', 'Anna Walklate'])
        self.assertEqual(ev.sessions[0].instructor_names, ['Lynn Birchall', 'Anna Walklate'])

    def test_parses_multiple_events_in_sequence(self):
        body = HEADER + (
            ',,CB1_LO_6,CB1-01-24A,30/11/2023,09:00,30/11/2023,12:30,Live Online,TRUE,,0,Live Online,Lynn Birchall,Lynn Birchall,\n'
            ',,CB1_LO_6,CB1-01-24A-1,30/11/2023,09:00,30/11/2023,12:30,Live Online,TRUE,,,Live Online,,Lynn Birchall,1\n'
            ',,CB2_f2f_4,CB2-20-24A,01/12/2023,09:30,01/12/2023,17:00,BPP London City,TRUE,,0,London,Greg Ardan,Greg Ardan,\n'
            ',,CB2_f2f_4,CB2-20-24A-1,01/12/2023,09:30,01/12/2023,17:00,BPP London City,TRUE,,,London,,Greg Ardan,1\n'
        )
        result = parse_events_csv(io.StringIO(body))
        self.assertEqual(len(result.events), 2)
        self.assertEqual(result.events[0].title, 'CB1-01-24A')
        self.assertEqual(result.events[1].title, 'CB2-20-24A')
        self.assertEqual(result.events[1].subject_code, 'CB2')

    def test_session_row_with_no_known_parent_event_skipped(self):
        """Orphan session rows (parent not registered) skip silently with a counter,
        keeping the parser fault-tolerant against missing/malformed parent rows."""
        body = HEADER + (
            ',,CB1_LO_6,CB1-01-24A-1,30/11/2023,09:00,30/11/2023,12:30,Live Online,TRUE,,,Live Online,,Lynn Birchall,1\n'
        )
        result = parse_events_csv(io.StringIO(body))
        self.assertEqual(len(result.events), 0)
        self.assertEqual(result.skipped_orphan_count, 1)

    def test_handles_interleaved_event_headers_and_sessions(self):
        """Real CSV has multiple consecutive event headers then interleaved sessions
        (e.g., CM1-28 + CM1-29 headers, then sessions for each in mixed order)."""
        body = HEADER + (
            ',,CM1_f2f_6,CM1-28-24A,05/12/2023,09:30,18/03/2024,17:00,BPP,TRUE,,0,London,Greg,Greg,\n'
            ',,CM1_f2f_6,CM1-29-24A,06/11/2023,09:30,13/03/2024,17:00,BPP,TRUE,,0,London,Aman,Aman,\n'
            ',,CM1_f2f_6,CM1-28-24A-1,05/12/2023,09:30,05/12/2023,17:00,BPP,TRUE,,,London,,Greg,1\n'
            ',,CM1_f2f_6,CM1-29-24A-1,06/11/2023,09:30,06/11/2023,17:00,BPP,TRUE,,,London,,Aman,1\n'
            ',,CM1_f2f_6,CM1-28-24A-2,03/01/2024,09:30,03/01/2024,17:00,BPP,TRUE,,,London,,Greg,2\n'
        )
        result = parse_events_csv(io.StringIO(body))
        self.assertEqual(len(result.events), 2)
        ev28 = next(e for e in result.events if e.title == 'CM1-28-24A')
        ev29 = next(e for e in result.events if e.title == 'CM1-29-24A')
        self.assertEqual([s.title for s in ev28.sessions], ['CM1-28-24A-1', 'CM1-28-24A-2'])
        self.assertEqual([s.title for s in ev29.sessions], ['CM1-29-24A-1'])

    def test_session_with_unknown_parent_title_skipped(self):
        # Session shape is valid (4 segments, sitting matches regex), but its
        # derived parent title 'CB1-99-24A' was never registered — skip+count.
        body = HEADER + (
            ',,CB1_LO_6,CB1-01-24A,30/11/2023,09:00,30/11/2023,12:30,Live Online,TRUE,,0,Live Online,Lynn,Lynn,\n'
            ',,CB1_LO_6,CB1-99-24A-1,30/11/2023,09:00,30/11/2023,12:30,Live Online,TRUE,,,Live Online,,Lynn,1\n'
        )
        result = parse_events_csv(io.StringIO(body))
        self.assertEqual([e.title for e in result.events], ['CB1-01-24A'])
        self.assertEqual(result.skipped_orphan_count, 1)

    def test_invalid_date_format_raises_with_row_number(self):
        body = HEADER + (
            ',,CB1_LO_6,CB1-01-24A,not-a-date,09:00,30/11/2023,12:30,Live Online,TRUE,,0,Live Online,Lynn,Lynn,\n'
        )
        with self.assertRaises(ParseError) as ctx:
            parse_events_csv(io.StringIO(body))
        self.assertIn('row 1', str(ctx.exception))
        self.assertIn('Start Date', str(ctx.exception))

    def test_skips_online_classroom_rows_silently(self):
        """OC rows (Title contains '-OC-') are skipped per Q1=A; not added to events."""
        body = HEADER + (
            ',,CB1_LO_6,CB1-01-24A,30/11/2023,09:00,30/11/2023,12:30,Live Online,TRUE,,0,Live Online,Lynn,Lynn,\n'
            ',,CB1_LO_6,CB1-01-24A-1,30/11/2023,09:00,30/11/2023,12:30,Live Online,TRUE,,,Live Online,,Lynn,1\n'
            ',,OC_CB1,CB1-OC-24A,01/09/2023,00:00,30/04/2024,00:00,,TRUE,,,Online,,,\n'
            ',,OC_CM1,CM1-OC-24A,01/09/2023,00:00,30/04/2024,00:00,,TRUE,,,Online,,,\n'
            ',,CB2_f2f_4,CB2-20-24A,22/11/2023,09:30,22/11/2023,17:00,BPP London,TRUE,,0,London,Greg,Greg,\n'
            ',,CB2_f2f_4,CB2-20-24A-1,22/11/2023,09:30,22/11/2023,17:00,BPP London,TRUE,,,London,,Greg,1\n'
        )
        result = parse_events_csv(io.StringIO(body))
        titles = [e.title for e in result.events]
        self.assertEqual(titles, ['CB1-01-24A', 'CB2-20-24A'])
        self.assertEqual(result.skipped_oc_count, 2)

    def test_cancelled_event_imported_with_flag_and_clean_title(self):
        """Per Q2=B: import cancelled events with cancelled=True, strip ' - CANC' suffix."""
        body = HEADER + (
            ',,CP1_LO_5,CP1-41-24A - CANC,09/01/2024,09:30,25/03/2024,17:00,Live Online,TRUE,11/12/2023,1,Live Online,Steve Hales,Steve Hales, CANC\n'
            ',,CP1_LO_5,CP1-41-24A-1,09/01/2024,09:30,09/01/2024,17:00,Live Online,TRUE,,,Live Online,,Steve Hales,1\n'
            ',,CP1_LO_5,CP1-41-24A-2,29/01/2024,09:30,29/01/2024,17:00,Live Online,TRUE,,,Live Online,,Steve Hales,2\n'
        )
        result = parse_events_csv(io.StringIO(body))
        self.assertEqual(len(result.events), 1)
        ev = result.events[0]
        self.assertEqual(ev.title, 'CP1-41-24A')  # ' - CANC' stripped
        self.assertTrue(ev.cancelled)
        self.assertEqual(len(ev.sessions), 2)
        self.assertTrue(ev.sessions[0].cancelled)  # cancellation propagates to sessions
        self.assertEqual(ev.sessions[0].title, 'CP1-41-24A-1')

    def test_uses_title_shape_to_distinguish_session_from_event_header(self):
        """Q3=A: last '-' segment being a positive integer → session row; else → event header."""
        body = HEADER + (
            # Event with non-numeric trailing segment 24A → header
            ',,CB1_LO_6,CB1-01-24A,30/11/2023,09:00,30/11/2023,12:30,Live Online,TRUE,,0,Live Online,Lynn,Lynn,\n'
            # Session with numeric trailing segment 1 → session
            ',,CB1_LO_6,CB1-01-24A-1,30/11/2023,09:00,30/11/2023,12:30,Live Online,TRUE,,,Live Online,,Lynn,1\n'
        )
        result = parse_events_csv(io.StringIO(body))
        self.assertEqual(len(result.events), 1)
        self.assertEqual(len(result.events[0].sessions), 1)

    def test_skips_event_titles_with_extra_suffix_segments(self):
        """Titles like 'CP2-43-25S-old' have 4 segments where the 4th is non-numeric.
        Not a session (last seg not digits), not a valid event (extra segment) — skip."""
        body = HEADER + (
            ',,CB1_LO_6,CB1-01-24A,30/11/2023,09:00,30/11/2023,12:30,Live Online,TRUE,,0,Live Online,Lynn,Lynn,\n'
            ',,CB1_LO_6,CB1-01-24A-1,30/11/2023,09:00,30/11/2023,12:30,Live Online,TRUE,,,Live Online,,Lynn,1\n'
            ',,CP2_LO_1,CP2-43-25S-old,21/08/2025,09:30,21/08/2025,17:00,,TRUE,,14,Live Online,,,old\n'
            ',,CP2_LO_1,CP2-43-25S-replacement,21/08/2025,09:30,21/08/2025,17:00,,TRUE,,14,Live Online,,,\n'
        )
        result = parse_events_csv(io.StringIO(body))
        self.assertEqual([e.title for e in result.events], ['CB1-01-24A'])
        self.assertEqual(result.skipped_malformed_count, 2)

    def test_skips_duplicate_event_titles_silently(self):
        """Repeated event-header rows (same title, no Sequence) — common in
        malformed source data — are skipped with a counter instead of raising."""
        body = HEADER + (
            ',,M0_LO_4,Mod1-A-24S,18/06/2024,09:30,01/10/2024,13:00,Live Online,TRUE,,,Live Online,,John,\n'
            ',,M0_LO_4,Mod1-A-24S,09/07/2024,09:30,09/07/2024,13:00,Live Online,TRUE,,,Live Online,,John,\n'
            ',,M0_LO_4,Mod1-A-24S,30/07/2024,09:30,30/07/2024,13:00,Live Online,TRUE,,,Live Online,,John,\n'
        )
        result = parse_events_csv(io.StringIO(body))
        self.assertEqual(len(result.events), 1)
        self.assertEqual(result.events[0].title, 'Mod1-A-24S')
        self.assertEqual(result.skipped_duplicate_count, 2)

    def test_skips_rows_with_invalid_sitting_segment(self):
        """Sitting segment must match \\d{1,4}[AS]?. TEST/ELO/etc. are dropped."""
        body = HEADER + (
            ',,CB1_LO_6,CB1-01-24A,30/11/2023,09:00,30/11/2023,12:30,Live Online,TRUE,,0,Live Online,Lynn,Lynn,\n'
            ',,CB1_LO_6,CB1-01-24A-1,30/11/2023,09:00,30/11/2023,12:30,Live Online,TRUE,,,Live Online,,Lynn,1\n'
            ',,CM1_LO_6,CM1-10-TEST,27/09/2023,09:30,08/03/2024,17:00,Live Online,TRUE,,14,Live Online,,John,\n'
            ',,CM1_LO_6,CM1-10-TEST,27/09/2023,09:30,27/09/2023,17:00,Live Online,TRUE,,,Live Online,,John,\n'
            ',,CM1_LO_6,CM1-10-FOO,27/09/2023,09:30,27/09/2023,17:00,Live Online,TRUE,,,Live Online,,John,\n'
        )
        result = parse_events_csv(io.StringIO(body))
        self.assertEqual([e.title for e in result.events], ['CB1-01-24A'])
        self.assertEqual(result.skipped_malformed_count, 3)

    def test_skips_lowercase_cancelled_rows(self):
        """' cancelled' (lowercase, leading space) is a separate skip marker —
        the irregular-format cancelled rows where Title is repeated and Sequence empty."""
        body = HEADER + (
            ',,CB1_LO_6,CB1-01-24A,30/11/2023,09:00,30/11/2023,12:30,Live Online,TRUE,,0,Live Online,Lynn,Lynn,\n'
            ',,CB1_LO_6,CB1-01-24A-1,30/11/2023,09:00,30/11/2023,12:30,Live Online,TRUE,,,Live Online,,Lynn,1\n'
            ',,SA4_f2f_3,SA4-45-24A cancelled,22/01/2024,09:30,04/03/2024,17:00,BPP,TRUE,,12,Birmingham,Greg,Greg,\n'
            ',,SA4_f2f_3,SA4-45-24A cancelled,22/01/2024,09:30,22/01/2024,17:00,BPP,TRUE,,,Birmingham,,Greg,\n'
            ',,SA4_f2f_3,SA4-45-24A cancelled,06/02/2024,09:30,06/02/2024,17:00,BPP,TRUE,,,Birmingham,,Greg,\n'
        )
        result = parse_events_csv(io.StringIO(body))
        self.assertEqual([e.title for e in result.events], ['CB1-01-24A'])
        self.assertEqual(result.skipped_cancelled_count, 3)

    def test_skips_ignore_rows(self):
        """Title=='IGNORE' marks rows that should be silently dropped."""
        body = HEADER + (
            ',,CB1_LO_6,CB1-01-24A,30/11/2023,09:00,30/11/2023,12:30,Live Online,TRUE,,0,Live Online,Lynn,Lynn,\n'
            ',,CB1_LO_6,CB1-01-24A-1,30/11/2023,09:00,30/11/2023,12:30,Live Online,TRUE,,,Live Online,,Lynn,1\n'
            ',,CP1_f2f_5,IGNORE,30/01/2024,09:30,22/03/2024,17:00,To be confirmed,TRUE,08/01/2024,12,London,Steve,Steve,\n'
            ',,CP1_f2f_5,IGNORE,30/01/2024,09:30,30/01/2024,17:00,To be confirmed,TRUE,,,London,,Steve,\n'
            ',,CP1_f2f_5,IGNORE,31/01/2024,09:30,31/01/2024,17:00,To be confirmed,TRUE,,,London,,Steve,\n'
            ',,CB2_f2f_4,CB2-20-24A,22/11/2023,09:30,22/11/2023,17:00,BPP London,TRUE,,0,London,Greg,Greg,\n'
            ',,CB2_f2f_4,CB2-20-24A-1,22/11/2023,09:30,22/11/2023,17:00,BPP London,TRUE,,,London,,Greg,1\n'
        )
        result = parse_events_csv(io.StringIO(body))
        titles = [e.title for e in result.events]
        self.assertEqual(titles, ['CB1-01-24A', 'CB2-20-24A'])
        self.assertEqual(result.skipped_ignore_count, 3)

    def test_canc_suffix_is_case_insensitive(self):
        """Both ' - CANC' and ' - canc' (and mixed case) trigger cancellation."""
        body = HEADER + (
            ',,CP2_LO_1,CP2-24-25S - canc,19/08/2025,09:30,19/08/2025,17:00,Live Online,TRUE,,14,Live Online,Lucy,Lucy, canc\n'
            ',,CP2_LO_1,CP2-24-25S-1,19/08/2025,09:30,19/08/2025,17:00,Live Online,TRUE,,,Live Online,,Lucy,1\n'
        )
        result = parse_events_csv(io.StringIO(body))
        self.assertEqual(len(result.events), 1)
        ev = result.events[0]
        self.assertEqual(ev.title, 'CP2-24-25S')
        self.assertTrue(ev.cancelled)
        self.assertEqual(len(ev.sessions), 1)
        self.assertTrue(ev.sessions[0].cancelled)

    def test_default_event_cancelled_false(self):
        body = HEADER + (
            ',,CB1_LO_6,CB1-01-24A,30/11/2023,09:00,30/11/2023,12:30,Live Online,TRUE,,0,Live Online,Lynn,Lynn,\n'
            ',,CB1_LO_6,CB1-01-24A-1,30/11/2023,09:00,30/11/2023,12:30,Live Online,TRUE,,,Live Online,,Lynn,1\n'
        )
        result = parse_events_csv(io.StringIO(body))
        self.assertFalse(result.events[0].cancelled)
        self.assertFalse(result.events[0].sessions[0].cancelled)

    def test_empty_remain_space_defaults_to_zero(self):
        body = HEADER + (
            ',,CB1_LO_6,CB1-01-24A,30/11/2023,09:00,30/11/2023,12:30,Live Online,TRUE,,,Live Online,Lynn,Lynn,\n'
            ',,CB1_LO_6,CB1-01-24A-1,30/11/2023,09:00,30/11/2023,12:30,Live Online,TRUE,,,Live Online,,Lynn,1\n'
        )
        result = parse_events_csv(io.StringIO(body))
        self.assertEqual(result.events[0].remain_space, 0)
        self.assertIsNone(result.events[0].finalisation_date)
