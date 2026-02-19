"""
Tests for sync_all management command orchestrator.
"""
from io import StringIO
from unittest.mock import patch, MagicMock
from django.test import TestCase
from django.core.management import call_command


class SyncAllTest(TestCase):
    """Test sync_all orchestrator command."""

    @patch('administrate.management.commands.sync_all.call_command')
    def test_executes_all_commands_in_order(self, mock_call):
        """All 7 sync commands should be called in dependency order."""
        out = StringIO()
        call_command('sync_all', '--no-prompt', stdout=out)

        expected_order = [
            'sync_custom_fields',
            'sync_price_levels',
            'sync_locations',
            'sync_venues',
            'sync_instructors',
            'sync_course_templates',
            'sync_course_template_price_levels',
        ]

        called_commands = [
            call.args[0] for call in mock_call.call_args_list
        ]
        self.assertEqual(called_commands, expected_order)

    @patch('administrate.management.commands.sync_all.call_command')
    def test_passes_debug_flag(self, mock_call):
        """--debug should be passed to all sub-commands."""
        out = StringIO()
        call_command('sync_all', '--debug', '--no-prompt', stdout=out)

        for call in mock_call.call_args_list:
            self.assertIn('--debug', call.args)

    @patch('administrate.management.commands.sync_all.call_command')
    def test_passes_no_prompt_flag(self, mock_call):
        """--no-prompt should be passed to all sub-commands."""
        out = StringIO()
        call_command('sync_all', '--no-prompt', stdout=out)

        for call in mock_call.call_args_list:
            self.assertIn('--no-prompt', call.args)

    @patch('administrate.management.commands.sync_all.call_command')
    def test_skip_errors_continues_on_failure(self, mock_call):
        """--skip-errors should continue after a command failure."""
        mock_call.side_effect = [
            None,  # custom_fields ok
            Exception('Price levels API error'),  # price_levels fails
            None,  # locations ok
            None,  # venues ok
            None,  # instructors ok
            None,  # course_templates ok
            None,  # course_template_price_levels ok
        ]

        out = StringIO()
        call_command('sync_all', '--no-prompt', '--skip-errors', stdout=out)
        output = out.getvalue()

        # Should continue past the failure
        self.assertEqual(mock_call.call_count, 7)
        self.assertIn('FAILED', output)
        self.assertIn('6 succeeded, 1 failed', output)

    @patch('administrate.management.commands.sync_all.call_command')
    def test_stops_on_failure_without_skip_errors(self, mock_call):
        """Without --skip-errors, should stop on first failure."""
        mock_call.side_effect = [
            None,  # custom_fields ok
            Exception('Price levels API error'),  # price_levels fails
        ]

        out = StringIO()
        call_command('sync_all', '--no-prompt', stdout=out)
        output = out.getvalue()

        # Should stop after 2 commands (1 ok + 1 failed)
        self.assertEqual(mock_call.call_count, 2)
        self.assertIn('aborted', output)

    @patch('administrate.management.commands.sync_all.call_command')
    def test_summary_output(self, mock_call):
        """Should output a summary line."""
        out = StringIO()
        call_command('sync_all', '--no-prompt', stdout=out)
        output = out.getvalue()

        self.assertIn('Sync Complete', output)
        self.assertIn('7 succeeded, 0 failed', output)
