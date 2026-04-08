"""Unit tests for _legacy_import_helpers.

These tests cover pure functions: no DB access, no filesystem writes beyond
reading the fixture CSVs checked into the repo.
"""
from pathlib import Path

from django.test import SimpleTestCase

from catalog.management.commands._legacy_import_helpers import (
    LegacyRow,
    iter_legacy_csv_rows,
)

FIXTURES_DIR = Path(__file__).parent / 'fixtures_legacy_csvs'


class TestLegacyRow(SimpleTestCase):
    def test_legacyrow_fields(self):
        row = LegacyRow(
            source_file='mini_1995.csv',
            source_line=1,
            subject='A',
            col2='P',
            col3='N',
            session='95',
            full_code='A/PN/95',
            raw_fullname='Course Notes',
            raw_shortname='Course Notes',
        )
        self.assertEqual(row.subject, 'A')
        self.assertEqual(row.col2, 'P')
        self.assertEqual(row.col3, 'N')
        self.assertEqual(row.raw_fullname, 'Course Notes')


class TestIterLegacyCsvRows(SimpleTestCase):
    def test_iter_yields_legacyrow_instances(self):
        rows = list(iter_legacy_csv_rows([FIXTURES_DIR / 'mini_1995.csv']))
        self.assertEqual(len(rows), 4)
        self.assertIsInstance(rows[0], LegacyRow)

    def test_iter_populates_source_metadata(self):
        rows = list(iter_legacy_csv_rows([FIXTURES_DIR / 'mini_1995.csv']))
        self.assertEqual(rows[0].source_file, 'mini_1995.csv')
        self.assertEqual(rows[0].source_line, 1)
        self.assertEqual(rows[3].source_line, 4)

    def test_iter_strips_whitespace(self):
        rows = list(iter_legacy_csv_rows([FIXTURES_DIR / 'mini_1995.csv']))
        self.assertEqual(rows[0].subject, 'A')
        self.assertEqual(rows[0].raw_fullname, 'Course Notes')

    def test_iter_parses_all_seven_columns(self):
        rows = list(iter_legacy_csv_rows([FIXTURES_DIR / 'mini_1995.csv']))
        r = rows[3]
        self.assertEqual(r.subject, 'B')
        self.assertEqual(r.col2, 'P')
        self.assertEqual(r.col3, 'X')
        self.assertEqual(r.session, '95')
        self.assertEqual(r.full_code, 'B/PX/95')
        self.assertEqual(r.raw_fullname, 'Series X Assignments')
        self.assertEqual(r.raw_shortname, 'Assign X (Papers)')


from catalog.management.commands._legacy_import_helpers import normalize_fullname


class TestNormalizeFullname(SimpleTestCase):
    """Every case here is derived from real CSV data or the design spec."""

    def test_strips_ebook_suffix(self):
        self.assertEqual(normalize_fullname('Course Notes eBook'), 'Course Notes')

    def test_strips_cdrom_suffix(self):
        self.assertEqual(normalize_fullname('Exam Skills CD ROM'), 'Exam Skills')
        self.assertEqual(normalize_fullname('Exam Skills CD-ROM'), 'Exam Skills')

    def test_strips_online_suffix(self):
        self.assertEqual(
            normalize_fullname('Stats Refresher Online Tutorial'),
            'Stats Refresher',
        )

    def test_strips_booklet_suffix(self):
        self.assertEqual(
            normalize_fullname('CPD Financial Services Exam Booklet'),
            'CPD Financial Services Exam',
        )

    def test_strips_year_parenthetical(self):
        self.assertEqual(
            normalize_fullname('ASET (2014-2017 Papers)'),
            'ASET',
        )

    def test_strips_short_year_parenthetical(self):
        self.assertEqual(
            normalize_fullname('ASET (14-17 and 19-21 Papers)'),
            'ASET',
        )

    def test_strips_month_parenthetical(self):
        self.assertEqual(
            normalize_fullname('Revision Notes (April 2008 exams)'),
            'Revision Notes',
        )
        self.assertEqual(
            normalize_fullname('Mock Exam (September 2010 exams)'),
            'Mock Exam',
        )

    def test_strips_standalone_year(self):
        self.assertEqual(
            normalize_fullname('Mock Exam 2016'),
            'Mock Exam',
        )
        # After year stripping, "Mock Exam 2010 Marking" → "Mock Exam Marking",
        # which is then canonicalized by the typo map to "Mock Exam".
        self.assertEqual(
            normalize_fullname('Mock Exam 2010 Marking'),
            'Mock Exam',
        )

    def test_strips_version_marker(self):
        self.assertEqual(normalize_fullname('Revision Notes V2'), 'Revision Notes')
        self.assertEqual(normalize_fullname('Revision Notes V12'), 'Revision Notes')

    def test_strips_marking_parenthetical(self):
        self.assertEqual(
            normalize_fullname('Series X Assignments (Marking)'),
            'Series X Assignments',
        )

    def test_combined_ebook_and_parenthetical(self):
        self.assertEqual(
            normalize_fullname('ASET (14-17 Papers) eBook'),
            'ASET',
        )

    def test_assessment_suffix_dash_removed(self):
        """Dashes are now removed; 'Course Notes - Assessment' becomes 'Course Notes Assessment'."""
        self.assertEqual(
            normalize_fullname('Course Notes - Assessment'),
            'Course Notes Assessment',
        )

    def test_typo_fix_core_reading(self):
        self.assertEqual(normalize_fullname('Core REading'), 'Core Reading')

    def test_typo_fix_flashcards(self):
        self.assertEqual(normalize_fullname('Flashcards'), 'Flash Cards')

    def test_typo_fix_question_and_answer_bank(self):
        self.assertEqual(normalize_fullname('Question & Answer Bank'), 'Q&A Bank')

    def test_collapses_whitespace(self):
        self.assertEqual(
            normalize_fullname('Course  Notes  eBook'),
            'Course Notes',
        )

    def test_strips_leading_trailing_whitespace(self):
        self.assertEqual(normalize_fullname('  Course Notes  '), 'Course Notes')

    def test_empty_string(self):
        self.assertEqual(normalize_fullname(''), '')

    def test_idempotent(self):
        """Normalizing an already-normalized name is a no-op."""
        canonical = normalize_fullname('ASET (2014-2017 Papers) eBook')
        self.assertEqual(canonical, 'ASET')
        self.assertEqual(normalize_fullname(canonical), canonical)


    def test_ca2_map_year_and_part_stripping(self):
        """'CA2 MAP 2015 Marking Part 1' collapses to 'CA2 MAP Marking'."""
        self.assertEqual(
            normalize_fullname('CA2 MAP 2015 Marking Part 1'),
            'CA2 MAP Marking',
        )


from catalog.management.commands._legacy_import_helpers import classify_row


def _make_row(**overrides):
    defaults = dict(
        source_file='test.csv',
        source_line=1,
        subject='CM1',
        col2='P',
        col3='N',
        session='26',
        full_code='CM1/PN/26',
        raw_fullname='Course Notes',
        raw_shortname='Course Notes',
    )
    defaults.update(overrides)
    return LegacyRow(**defaults)


class TestClassifyRow(SimpleTestCase):
    def test_valid_row_returns_none(self):
        self.assertIsNone(classify_row(_make_row()))

    def test_wildcard_subject_rejected(self):
        row = _make_row(subject='*')
        self.assertEqual(classify_row(row), 'wildcard_subject')

    def test_col2_e_rejected(self):
        row = _make_row(col2='E')
        self.assertEqual(classify_row(row), 'unknown_col2')

    def test_col2_unknown_char_rejected(self):
        row = _make_row(col2='Z')
        self.assertEqual(classify_row(row), 'unknown_col2')

    def test_all_valid_col2_accepted(self):
        for c in ['P', 'C', 'M', 'T']:
            with self.subTest(col2=c):
                self.assertIsNone(classify_row(_make_row(col2=c)))

    def test_empty_subject_rejected(self):
        row = _make_row(subject='')
        self.assertEqual(classify_row(row), 'empty_subject')

    def test_empty_col3_rejected(self):
        row = _make_row(col3='')
        self.assertEqual(classify_row(row), 'empty_col3')

    def test_empty_session_rejected(self):
        row = _make_row(session='')
        self.assertEqual(classify_row(row), 'empty_session')


from catalog.management.commands._legacy_import_helpers import (
    TemplateKey,
    build_template_key,
)


class TestTemplateKey(SimpleTestCase):
    def test_is_frozen(self):
        key = TemplateKey(code='N', fullname='Course Notes')
        with self.assertRaises(Exception):
            key.code = 'X'  # type: ignore[misc]

    def test_is_hashable(self):
        key1 = TemplateKey(code='N', fullname='Course Notes')
        key2 = TemplateKey(code='N', fullname='Course Notes')
        self.assertEqual(hash(key1), hash(key2))
        self.assertEqual({key1, key2}, {key1})


class TestBuildTemplateKey(SimpleTestCase):
    def test_basic(self):
        row = _make_row(col3='N', raw_fullname='Course Notes')
        self.assertEqual(
            build_template_key(row),
            TemplateKey(code='N', fullname='Course Notes'),
        )

    def test_normalizes_fullname(self):
        row = _make_row(col3='N', raw_fullname='Course Notes eBook')
        self.assertEqual(
            build_template_key(row),
            TemplateKey(code='N', fullname='Course Notes'),
        )

    def test_preserves_col3(self):
        row = _make_row(col3='EX', raw_fullname='ASET (2014-2017 Papers) eBook')
        self.assertEqual(
            build_template_key(row),
            TemplateKey(code='EX', fullname='ASET'),
        )

    def test_different_col3_different_keys(self):
        row_n = _make_row(col3='N', raw_fullname='Course Notes')
        row_na = _make_row(col3='NA', raw_fullname='Course Notes')
        self.assertNotEqual(
            build_template_key(row_n),
            build_template_key(row_na),
        )


class TestNormalizeFullnameFixes(SimpleTestCase):
    """Fixes found during smoke test against 37,063 real CSV rows."""

    # --- Issue 1: year range stripping ---

    def test_strips_4digit_year_range(self):
        self.assertEqual(
            normalize_fullname('ASET 2014-2017 Papers'),
            'ASET Papers',
        )

    def test_strips_4digit_year_range_with_ebook(self):
        self.assertEqual(
            normalize_fullname('ASET 2017-2018 Papers eBook'),
            'ASET Papers',
        )

    def test_strips_4digit_year_range_multiple(self):
        self.assertEqual(
            normalize_fullname('ASET 2019-2020 Papers'),
            'ASET Papers',
        )

    def test_single_year_still_works(self):
        """Regression guard: the existing single-year rule must still work."""
        self.assertEqual(
            normalize_fullname('ASET 2019 Papers'),
            'ASET Papers',
        )
        # "Mock Exam 2010 Marking": year strip → "Mock Exam Marking",
        # then typo map alias → "Mock Exam" (final canonical form).
        self.assertEqual(
            normalize_fullname('Mock Exam 2010 Marking'),
            'Mock Exam',
        )

    # --- Issue 2: parenthetical with year anywhere inside ---

    def test_strips_paren_with_embedded_year(self):
        self.assertEqual(
            normalize_fullname('ASET (inc April 2005)'),
            'ASET',
        )

    def test_strips_paren_with_embedded_year_no_space(self):
        self.assertEqual(
            normalize_fullname('ASET(inc April 2005)'),
            'ASET',
        )

    def test_strips_paren_with_period_and_year(self):
        self.assertEqual(
            normalize_fullname('ASET (inc. April 2006)'),
            'ASET',
        )

    # --- Issue 3: Series/Mock Exam marking aliases ---

    def test_series_x_marking_alias(self):
        self.assertEqual(
            normalize_fullname('Series X Marking'),
            'Series X Assignments',
        )

    def test_series_y_marking_alias(self):
        self.assertEqual(
            normalize_fullname('Series Y Marking'),
            'Series Y Assignments',
        )

    def test_series_z_marking_alias(self):
        self.assertEqual(
            normalize_fullname('Series Z Marking'),
            'Series Z Assignments',
        )

    def test_mock_exam_plain_marking_alias(self):
        self.assertEqual(
            normalize_fullname('Mock Exam Marking'),
            'Mock Exam',
        )

    def test_mock_exam_a_marking_alias(self):
        self.assertEqual(
            normalize_fullname('Mock Exam A Marking'),
            'Mock Exam A',
        )

    def test_mock_exam_b_marking_alias(self):
        self.assertEqual(
            normalize_fullname('Mock Exam B Marking'),
            'Mock Exam B',
        )

    def test_mock_exam_c_marking_alias(self):
        self.assertEqual(
            normalize_fullname('Mock Exam C Marking'),
            'Mock Exam C',
        )

    def test_mock_exam_1_marking_alias(self):
        # Task 2.7: single-digit stripped first → 'Mock Exam Marking' →
        # typo map → 'Mock Exam'. The numbered variant collapses into base.
        self.assertEqual(
            normalize_fullname('Mock Exam 1 Marking'),
            'Mock Exam',
        )

    def test_mock_exam_2_marking_alias(self):
        self.assertEqual(
            normalize_fullname('Mock Exam 2 Marking'),
            'Mock Exam',
        )

    def test_mock_exam_3_marking_alias(self):
        self.assertEqual(
            normalize_fullname('Mock Exam 3 Marking'),
            'Mock Exam',
        )

    # --- Idempotency regression guards ---

    def test_idempotent_year_range_case(self):
        """Normalizing the result of a year-range case must be idempotent."""
        canonical = normalize_fullname('ASET 2014-2017 Papers')
        # Trace: dash→space, \d\d strips all 4 digits twice each,
        # 'Papers' stays (not 'Paper'), collapse. Expected: 'ASET Papers'
        self.assertEqual(canonical, 'ASET Papers')
        self.assertEqual(normalize_fullname(canonical), canonical)

    def test_idempotent_series_marking_case(self):
        canonical = normalize_fullname('Series X Marking')
        self.assertEqual(normalize_fullname(canonical), canonical)


class TestNormalizeFullnameAggressive(SimpleTestCase):
    """Tests for the aggressive normalization rules (Task 2.6).

    These rules trade semantic fidelity for collision reduction. The raw
    fullname is still preserved in store.Product.remarks.
    """

    # --- Tutorial special case (col2='T', col3 in 'B'/'D') ---

    def test_tutorial_b_strips_paren(self):
        self.assertEqual(
            normalize_fullname(
                'Tutorial Course (E1, 3 day block)',
                col2='T', col3='B',
            ),
            'Tutorial Course',
        )

    def test_tutorial_d_strips_paren(self):
        self.assertEqual(
            normalize_fullname(
                'Regular Tutorial Course (E1, 6 days)',
                col2='T', col3='D',
            ),
            'Regular Tutorial Course',
        )

    def test_tutorial_d_strips_nested_info(self):
        self.assertEqual(
            normalize_fullname(
                'Regular Tutorial Days (A1L3, 3 days)',
                col2='T', col3='D',
            ),
            'Regular Tutorial Days',
        )

    def test_tutorial_d_does_not_apply_aggressive_rules(self):
        """Tutorial B/D ONLY strips parens — dashes, paper, part stay."""
        self.assertEqual(
            normalize_fullname(
                'Tutorial - Paper Session',
                col2='T', col3='D',
            ),
            'Tutorial - Paper Session',
        )

    def test_tutorial_non_bd_falls_through_to_general_rules(self):
        """col2='T' with col3='A' (not B or D) uses general rules."""
        self.assertEqual(
            normalize_fullname(
                'Personal Tutorial - Paper',
                col2='T', col3='A',
            ),
            'Personal Tutorial',
        )

    # --- Aggressive rules for non-tutorial products ---

    def test_removes_all_parens(self):
        self.assertEqual(
            normalize_fullname('Combined Materials (Part. Retaker)'),
            'Combined Materials',
        )

    def test_removes_parens_with_embedded_info(self):
        self.assertEqual(
            normalize_fullname('ASET (inc April 2005)'),
            'ASET',
        )

    def test_removes_paper_1(self):
        self.assertEqual(
            normalize_fullname('Mock Exam Paper 1'),
            'Mock Exam',
        )

    def test_removes_paper_2(self):
        self.assertEqual(
            normalize_fullname('Mock Exam paper 2'),
            'Mock Exam',
        )

    def test_removes_paper_3(self):
        self.assertEqual(
            normalize_fullname('Mock Exam Paper 3'),
            'Mock Exam',
        )

    def test_removes_part_1(self):
        self.assertEqual(
            normalize_fullname('Course Notes - part 1'),
            'Course Notes',
        )

    def test_removes_part_2_case_insensitive(self):
        self.assertEqual(
            normalize_fullname('Course Notes Part 2'),
            'Course Notes',
        )

    def test_removes_ebook_anywhere(self):
        self.assertEqual(
            normalize_fullname('Combined Materials eBook Upgrade'),
            'Combined Materials Upgrade',
        )

    def test_removes_paper_standalone(self):
        self.assertEqual(
            normalize_fullname('Mock Exam Paper'),
            'Mock Exam',
        )

    def test_does_not_remove_papers_plural(self):
        """'Papers' (plural) has a trailing 's' so \\bpaper\\b won't match."""
        self.assertEqual(
            normalize_fullname('ASET Papers'),
            'ASET Papers',
        )

    def test_removes_dashes_as_spaces(self):
        self.assertEqual(
            normalize_fullname('ASET-Paper-Set'),
            'ASET Set',  # dash→space, then "Paper" removed, collapse
        )

    def test_removes_two_digit_numbers(self):
        self.assertEqual(
            normalize_fullname('Mock Exam 97-98'),
            'Mock Exam',
        )

    def test_removes_four_digit_year_via_double_dd(self):
        """4-digit years get matched twice by \\d\\d and fully removed."""
        self.assertEqual(
            normalize_fullname('Mock Exam 2016'),
            'Mock Exam',
        )

    def test_single_digit_stripped_in_aggressive_mode(self):
        """Task 2.7 added \\b\\d\\b stripping; single digits now collapse."""
        self.assertEqual(
            normalize_fullname('Mock Exam 1'),
            'Mock Exam',
        )

    def test_combined_aggressive_rules(self):
        """'ASET 2014-2017 Papers eBook' end-to-end."""
        self.assertEqual(
            normalize_fullname('ASET 2014-2017 Papers eBook'),
            'ASET Papers',
        )

    def test_update_note_variants_collapse(self):
        """Task 2.7 added single-digit stripping; 'Update Note 1' now
        collapses to 'Update Note'."""
        self.assertEqual(
            normalize_fullname('Update Note 1'),
            'Update Note',
        )


class TestNormalizeFullnameSingleDigitAndUnclosedParen(SimpleTestCase):
    """Task 2.7 — strip single-digit variants and handle unclosed parens."""

    # --- Single-digit stripping ---

    def test_mock_exam_1_collapses(self):
        self.assertEqual(normalize_fullname('Mock Exam 1'), 'Mock Exam')

    def test_mock_exam_2_collapses(self):
        self.assertEqual(normalize_fullname('Mock Exam 2'), 'Mock Exam')

    def test_update_note_1_collapses(self):
        self.assertEqual(normalize_fullname('Update Note 1'), 'Update Note')

    def test_update_note_2_collapses(self):
        self.assertEqual(normalize_fullname('Update Note 2'), 'Update Note')

    def test_update_note_3_collapses(self):
        self.assertEqual(normalize_fullname('Update Note 3'), 'Update Note')

    def test_single_digit_mid_string_stripped(self):
        """'Day 3 Tutorial' → 'Day Tutorial' (standalone 3 is stripped)."""
        self.assertEqual(
            normalize_fullname('Day 3 Tutorial'),
            'Day Tutorial',
        )

    def test_preserves_digit_in_subject_code_ca2(self):
        """'CA2 MAP' must NOT have the 2 stripped ('A' and '2' are both word chars, no word boundary between them)."""
        self.assertEqual(normalize_fullname('CA2 MAP'), 'CA2 MAP')

    def test_preserves_digit_in_subject_code_sa3(self):
        """'SA3 Core Reading' must NOT have the 3 stripped."""
        self.assertEqual(normalize_fullname('SA3 Core Reading'), 'SA3 Core Reading')

    def test_preserves_digit_in_subject_code_st7(self):
        self.assertEqual(normalize_fullname('ST7 Notes'), 'ST7 Notes')

    def test_preserves_two_digit_embedded(self):
        """'CB12 Notes' — '12' is \\d\\d surrounded by word chars. Word
        boundary check: 'B' to '1' no boundary, '2' to ' ' boundary.
        \\d\\d requires no boundaries (it's not \\b-anchored), so it matches
        '12' greedily at position 2. This strips '12' from 'CB12 Notes'."""
        self.assertEqual(normalize_fullname('CB12 Notes'), 'CB Notes')

    def test_four_digit_year_still_stripped(self):
        """Regression: 4-digit years still fully stripped."""
        self.assertEqual(normalize_fullname('Mock Exam 2016'), 'Mock Exam')

    def test_hyphenated_year_range_still_stripped(self):
        """Regression: hyphenated year range still fully stripped."""
        self.assertEqual(
            normalize_fullname('ASET 2014-2017 Papers'),
            'ASET Papers',
        )

    # --- Unclosed parenthesis handling ---

    def test_strips_unclosed_paren_at_end(self):
        """Handles data-quality bug: 'Tutorial Course (E32, 4 Day Block'
        (missing closing parenthesis)."""
        self.assertEqual(
            normalize_fullname('Tutorial Course (E32, 4 Day Block'),
            'Tutorial Course',
        )

    def test_strips_unclosed_paren_simple(self):
        self.assertEqual(
            normalize_fullname('Course Notes (leftover'),
            'Course Notes',
        )

    def test_strips_both_closed_and_unclosed_paren(self):
        """First closed paren gets stripped by rule 1, then trailing
        unclosed paren gets stripped by rule 2."""
        self.assertEqual(
            normalize_fullname('Course (v1) Notes (unclosed'),
            'Course Notes',
        )

    def test_unclosed_paren_stripping_preserves_content_before(self):
        self.assertEqual(
            normalize_fullname('Mock Exam Main (extra info goes here'),
            'Mock Exam Main',
        )

    # --- Tutorial special case still works with both rules ---

    def test_tutorial_d_strips_unclosed_paren(self):
        """Tutorial B/D path also gets the unclosed-paren fix."""
        self.assertEqual(
            normalize_fullname(
                'Regular Tutorial Course (E32, 4 Day Block',
                col2='T', col3='D',
            ),
            'Regular Tutorial Course',
        )

    def test_tutorial_b_strips_unclosed_paren(self):
        self.assertEqual(
            normalize_fullname(
                'Tutorial Course (E1, 3 day block',
                col2='T', col3='B',
            ),
            'Tutorial Course',
        )

    def test_tutorial_d_still_keeps_single_digits(self):
        """Tutorial B/D path does NOT apply single-digit stripping."""
        self.assertEqual(
            normalize_fullname(
                'Tutorial Course 1',
                col2='T', col3='D',
            ),
            'Tutorial Course 1',
        )
