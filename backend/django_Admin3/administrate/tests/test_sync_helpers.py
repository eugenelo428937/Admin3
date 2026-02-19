"""
Tests for administrate sync helper utilities.
"""
from io import StringIO
from unittest.mock import MagicMock
from django.test import TestCase
from administrate.utils.sync_helpers import (
    SyncStats, match_records, report_discrepancies,
    prompt_create_unmatched, validate_dependencies,
)


class SyncStatsTest(TestCase):
    """Test the SyncStats dataclass."""

    def test_default_values(self):
        stats = SyncStats()
        self.assertEqual(stats.created, 0)
        self.assertEqual(stats.updated, 0)
        self.assertEqual(stats.unchanged, 0)
        self.assertEqual(stats.deleted, 0)
        self.assertEqual(stats.skipped, 0)
        self.assertEqual(stats.errors, 0)
        self.assertEqual(stats.unmatched_tutorial, [])
        self.assertEqual(stats.unmatched_api, [])

    def test_total_processed(self):
        stats = SyncStats(created=5, updated=3, unchanged=10, deleted=2)
        self.assertEqual(stats.total_processed, 20)

    def test_summary_line(self):
        stats = SyncStats(created=1, updated=2, unchanged=3, deleted=4, skipped=5, errors=6)
        expected = "1 created, 2 updated, 3 unchanged, 4 deleted, 5 skipped, 6 errors"
        self.assertEqual(stats.summary_line(), expected)

    def test_unmatched_lists_are_independent(self):
        """Verify that default mutable list fields are independent across instances."""
        stats1 = SyncStats()
        stats2 = SyncStats()
        stats1.unmatched_tutorial.append('item1')
        self.assertEqual(len(stats2.unmatched_tutorial), 0)


class MatchRecordsTest(TestCase):
    """Test the match_records function."""

    def test_exact_match_case_insensitive(self):
        tutorial_records = {
            'cm2': MagicMock(code='CM2'),
            'sa1': MagicMock(code='SA1'),
        }
        api_records = [
            {'node': {'id': 'api-1', 'code': 'CM2'}},
            {'node': {'id': 'api-2', 'code': 'SA1'}},
        ]
        matched, unmatched_tut, unmatched_api = match_records(
            tutorial_records, api_records, 'code', case_insensitive=True
        )
        self.assertEqual(len(matched), 2)
        self.assertIn('api-1', matched)
        self.assertIn('api-2', matched)
        self.assertEqual(len(unmatched_tut), 0)
        self.assertEqual(len(unmatched_api), 0)

    def test_unmatched_tutorial_records(self):
        tutorial_records = {
            'cm2': MagicMock(code='CM2'),
            'sa1': MagicMock(code='SA1'),
            'cb1': MagicMock(code='CB1'),
        }
        api_records = [
            {'node': {'id': 'api-1', 'code': 'CM2'}},
        ]
        matched, unmatched_tut, unmatched_api = match_records(
            tutorial_records, api_records, 'code'
        )
        self.assertEqual(len(matched), 1)
        self.assertEqual(len(unmatched_tut), 2)
        self.assertEqual(len(unmatched_api), 0)

    def test_unmatched_api_records(self):
        tutorial_records = {
            'cm2': MagicMock(code='CM2'),
        }
        api_records = [
            {'node': {'id': 'api-1', 'code': 'CM2'}},
            {'node': {'id': 'api-2', 'code': 'UNKNOWN'}},
        ]
        matched, unmatched_tut, unmatched_api = match_records(
            tutorial_records, api_records, 'code'
        )
        self.assertEqual(len(matched), 1)
        self.assertEqual(len(unmatched_tut), 0)
        self.assertEqual(len(unmatched_api), 1)
        self.assertEqual(unmatched_api[0]['id'], 'api-2')

    def test_case_sensitive_match(self):
        tutorial_records = {
            'CM2': MagicMock(code='CM2'),
        }
        api_records = [
            {'node': {'id': 'api-1', 'code': 'cm2'}},
        ]
        matched, unmatched_tut, unmatched_api = match_records(
            tutorial_records, api_records, 'code', case_insensitive=False
        )
        # 'cm2' != 'CM2' when case sensitive
        self.assertEqual(len(matched), 0)
        self.assertEqual(len(unmatched_tut), 1)
        self.assertEqual(len(unmatched_api), 1)

    def test_empty_api_records(self):
        tutorial_records = {
            'cm2': MagicMock(code='CM2'),
        }
        matched, unmatched_tut, unmatched_api = match_records(
            tutorial_records, [], 'code'
        )
        self.assertEqual(len(matched), 0)
        self.assertEqual(len(unmatched_tut), 1)
        self.assertEqual(len(unmatched_api), 0)

    def test_empty_tutorial_records(self):
        api_records = [
            {'node': {'id': 'api-1', 'code': 'CM2'}},
        ]
        matched, unmatched_tut, unmatched_api = match_records(
            {}, api_records, 'code'
        )
        self.assertEqual(len(matched), 0)
        self.assertEqual(len(unmatched_tut), 0)
        self.assertEqual(len(unmatched_api), 1)

    def test_flat_api_records_without_node_key(self):
        """API records passed as flat dicts (no 'node' wrapper)."""
        tutorial_records = {
            'cm2': MagicMock(code='CM2'),
        }
        api_records = [
            {'id': 'api-1', 'code': 'CM2'},
        ]
        matched, unmatched_tut, unmatched_api = match_records(
            tutorial_records, api_records, 'code'
        )
        self.assertEqual(len(matched), 1)


class ReportDiscrepanciesTest(TestCase):
    """Test the report_discrepancies function."""

    def test_reports_unmatched_tutorial_records(self):
        stdout = StringIO()
        style = MagicMock()
        style.WARNING = lambda x: x

        unmatched_tut = [MagicMock(__str__=lambda s: 'CM2 - Course CM2')]
        report_discrepancies(stdout, style, unmatched_tut, [], 'course template')
        output = stdout.getvalue()
        self.assertIn('1 tutorial course template(s) had no match', output)

    def test_reports_unmatched_api_records(self):
        stdout = StringIO()
        style = MagicMock()
        style.WARNING = lambda x: x

        unmatched_api = [{'id': 'api-1', 'code': 'UNKNOWN'}]
        report_discrepancies(stdout, style, [], unmatched_api, 'course template')
        output = stdout.getvalue()
        self.assertIn('1 Administrate course template(s) had no match', output)

    def test_no_output_when_all_matched(self):
        stdout = StringIO()
        style = MagicMock()
        style.WARNING = lambda x: x

        report_discrepancies(stdout, style, [], [], 'course template')
        output = stdout.getvalue()
        self.assertEqual(output, '')


class PromptCreateUnmatchedTest(TestCase):
    """Test the prompt_create_unmatched function."""

    def test_no_prompt_skips(self):
        stdout = StringIO()
        style = MagicMock()
        style.WARNING = lambda x: x

        unmatched = [MagicMock()]
        result = prompt_create_unmatched(stdout, style, unmatched, 'course template', no_prompt=True)
        self.assertFalse(result)
        output = stdout.getvalue()
        self.assertIn('--no-prompt set', output)

    def test_empty_unmatched_returns_false(self):
        stdout = StringIO()
        style = MagicMock()

        result = prompt_create_unmatched(stdout, style, [], 'course template', no_prompt=False)
        self.assertFalse(result)

    def test_no_create_fn_shows_not_supported(self):
        stdout = StringIO()
        style = MagicMock()
        style.WARNING = lambda x: x

        unmatched = [MagicMock()]
        result = prompt_create_unmatched(
            stdout, style, unmatched, 'course template',
            no_prompt=False, create_fn=None
        )
        self.assertFalse(result)
        output = stdout.getvalue()
        self.assertIn('not yet supported', output)


class ValidateDependenciesTest(TestCase):
    """Test the validate_dependencies function."""

    def test_all_dependencies_met(self):
        stdout = StringIO()
        style = MagicMock()
        style.ERROR = lambda x: x

        dependencies = {
            'Location': lambda: True,
            'PriceLevel': lambda: True,
        }
        result = validate_dependencies(stdout, style, dependencies)
        self.assertTrue(result)

    def test_dependency_not_met(self):
        stdout = StringIO()
        style = MagicMock()
        style.ERROR = lambda x: x

        dependencies = {
            'Location': lambda: True,
            'PriceLevel': lambda: False,
        }
        result = validate_dependencies(stdout, style, dependencies)
        self.assertFalse(result)
        output = stdout.getvalue()
        self.assertIn('PriceLevel', output)

    def test_empty_dependencies(self):
        stdout = StringIO()
        style = MagicMock()

        result = validate_dependencies(stdout, style, {})
        self.assertTrue(result)
