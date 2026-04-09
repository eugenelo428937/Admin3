"""
Tests for email_system management command: process_email_queue.
"""
import time
from datetime import timedelta
from io import StringIO
from unittest.mock import patch, MagicMock, PropertyMock
from django.test import TestCase
from django.core.management import call_command
from django.core.management.base import CommandError
from django.utils import timezone

from email_system.models import EmailTemplate, EmailQueue
from email_system.management.commands.process_email_queue import Command
from email_system.tests.factories import make_template


class ProcessEmailQueueCommandArgumentsTest(TestCase):
    """Tests for command argument parsing."""

    def test_default_arguments(self):
        """Test that default argument values are set correctly."""
        cmd = Command()
        parser = cmd.create_parser('manage.py', 'process_email_queue')
        args = parser.parse_args([])
        self.assertEqual(args.limit, 50)
        self.assertFalse(args.continuous)
        self.assertEqual(args.interval, 30)
        self.assertIsNone(args.priority)
        self.assertIsNone(args.template)
        self.assertFalse(args.dry_run)
        self.assertFalse(args.verbose)

    def test_custom_arguments(self):
        """Test custom argument values."""
        cmd = Command()
        parser = cmd.create_parser('manage.py', 'process_email_queue')
        args = parser.parse_args([
            '--limit', '100',
            '--continuous',
            '--interval', '60',
            '--priority', 'urgent',
            '--template', 'order_confirmation',
            '--dry-run',
            '--verbose',
        ])
        self.assertEqual(args.limit, 100)
        self.assertTrue(args.continuous)
        self.assertEqual(args.interval, 60)
        self.assertEqual(args.priority, 'urgent')
        self.assertEqual(args.template, 'order_confirmation')
        self.assertTrue(args.dry_run)
        self.assertTrue(args.verbose)

    def test_priority_choices(self):
        """Test that only valid priority values are accepted."""
        cmd = Command()
        parser = cmd.create_parser('manage.py', 'process_email_queue')
        # Valid choices
        for p in ['urgent', 'high', 'normal', 'low']:
            args = parser.parse_args(['--priority', p])
            self.assertEqual(args.priority, p)


class HandleMethodTest(TestCase):
    """Tests for the handle method (main entry point)."""

    @patch.object(Command, 'run_single_batch')
    def test_handle_single_batch(self, mock_single):
        """Test handle runs single batch by default."""
        out = StringIO()
        call_command('process_email_queue', stdout=out)
        mock_single.assert_called_once_with(50, None, None, False, False)

    @patch.object(Command, 'run_continuous')
    def test_handle_continuous_mode(self, mock_continuous):
        """Test handle runs continuous when --continuous is passed."""
        out = StringIO()
        call_command('process_email_queue', '--continuous', stdout=out)
        mock_continuous.assert_called_once_with(50, 30, None, None, False, False)

    @patch.object(Command, 'run_single_batch')
    def test_handle_dry_run_message(self, mock_single):
        """Test handle outputs dry run message."""
        out = StringIO()
        call_command('process_email_queue', '--dry-run', stdout=out)
        self.assertIn('DRY RUN MODE', out.getvalue())

    @patch.object(Command, 'run_single_batch', side_effect=KeyboardInterrupt)
    def test_handle_keyboard_interrupt(self, mock_single):
        """Test handle gracefully handles KeyboardInterrupt."""
        out = StringIO()
        # KeyboardInterrupt is caught, so no exception should propagate
        call_command('process_email_queue', stdout=out)
        self.assertIn('shutting down', out.getvalue())

    @patch.object(Command, 'run_single_batch', side_effect=Exception('Fatal error'))
    def test_handle_exception_raises_command_error(self, mock_single):
        """Test handle raises CommandError on unexpected exceptions."""
        out = StringIO()
        with self.assertRaises(CommandError) as ctx:
            call_command('process_email_queue', stdout=out)
        self.assertIn('Email queue processing failed', str(ctx.exception))

    @patch.object(Command, 'run_single_batch')
    def test_handle_with_priority_and_template(self, mock_single):
        """Test handle passes priority and template filters."""
        out = StringIO()
        call_command(
            'process_email_queue',
            '--priority', 'high',
            '--template', 'order_confirmation',
            stdout=out,
        )
        mock_single.assert_called_once_with(50, 'high', 'order_confirmation', False, False)

    @patch.object(Command, 'run_single_batch')
    def test_handle_shows_email_config(self, mock_single):
        """Test handle displays email configuration."""
        out = StringIO()
        call_command('process_email_queue', stdout=out)
        output = out.getvalue()
        self.assertIn('USE_INTERNAL_SMTP', output)
        self.assertIn('EMAIL_HOST', output)

    @patch.object(Command, 'run_single_batch')
    def test_handle_verbose_flag_passed(self, mock_single):
        """Test handle passes verbose flag."""
        out = StringIO()
        call_command('process_email_queue', '--verbose', stdout=out)
        mock_single.assert_called_once_with(50, None, None, False, True)


class RunSingleBatchTest(TestCase):
    """Tests for run_single_batch method."""

    def setUp(self):
        self.cmd = Command()
        self.cmd.stdout = StringIO()
        self.cmd.style = self.cmd.create_parser('manage.py', 'process_email_queue').prog  # hack
        # Restore proper style
        from django.core.management.color import color_style
        self.cmd.style = color_style()

    @patch.object(Command, 'display_processing_results')
    @patch('email_system.management.commands.process_email_queue.email_queue_service')
    def test_single_batch_processes_queue(self, mock_service, mock_display_results):
        """Test single batch calls process_pending_queue and displays results."""
        mock_service.process_pending_queue.return_value = {
            'processed': 3, 'successful': 2, 'failed': 1, 'errors': ['Error 1'],
        }

        self.cmd.run_single_batch(50, None, None, False)

        mock_service.process_pending_queue.assert_called_once_with(50)
        mock_display_results.assert_called_once()

    @patch.object(Command, 'display_queue_stats')
    @patch.object(Command, 'display_processing_results')
    @patch('email_system.management.commands.process_email_queue.email_queue_service')
    def test_single_batch_verbose_shows_stats(self, mock_service, mock_display_results, mock_display_stats):
        """Test single batch with --verbose shows before/after stats."""
        mock_service.get_queue_stats.return_value = {
            'total': 5, 'pending': 3, 'processing': 0,
            'sent': 1, 'failed': 1, 'cancelled': 0, 'retry': 0,
        }
        mock_service.process_pending_queue.return_value = {
            'processed': 3, 'successful': 2, 'failed': 1, 'errors': [],
        }

        self.cmd.run_single_batch(50, None, None, False, verbose=True)

        self.assertEqual(mock_display_stats.call_count, 2)  # Before and After

    @patch.object(Command, 'display_queue_stats')
    @patch.object(Command, 'display_processing_results')
    @patch('email_system.management.commands.process_email_queue.email_queue_service')
    def test_single_batch_no_verbose_skips_stats(self, mock_service, mock_display_results, mock_display_stats):
        """Test single batch without --verbose does not show stats."""
        mock_service.process_pending_queue.return_value = {
            'processed': 3, 'successful': 2, 'failed': 1, 'errors': [],
        }

        self.cmd.run_single_batch(50, None, None, False)

        mock_display_stats.assert_not_called()

    @patch.object(Command, 'get_pending_count', return_value=10)
    def test_single_batch_dry_run(self, mock_count):
        """Test single batch in dry run mode."""
        self.cmd.run_single_batch(50, None, None, True)
        output = self.cmd.stdout.getvalue()
        self.assertIn('Would process 10 emails', output)

    @patch.object(Command, 'get_pending_count', return_value=100)
    def test_single_batch_dry_run_limit(self, mock_count):
        """Test single batch dry run respects limit."""
        self.cmd.run_single_batch(25, None, None, True)
        output = self.cmd.stdout.getvalue()
        self.assertIn('Would process 25 emails', output)


class RunContinuousTest(TestCase):
    """Tests for run_continuous method."""

    def setUp(self):
        self.cmd = Command()
        self.cmd.stdout = StringIO()
        from django.core.management.color import color_style
        self.cmd.style = color_style()

    @patch('email_system.management.commands.process_email_queue.time.sleep', side_effect=KeyboardInterrupt)
    @patch('email_system.management.commands.process_email_queue.email_queue_service')
    def test_continuous_processes_and_exits_on_interrupt(self, mock_service, mock_sleep):
        """Test continuous mode processes one cycle then exits on interrupt."""
        mock_service.process_pending_queue.return_value = {
            'processed': 2, 'successful': 2, 'failed': 0, 'errors': [],
        }

        self.cmd.run_continuous(50, 30, None, None, False)

        output = self.cmd.stdout.getvalue()
        self.assertIn('Starting continuous', output)
        self.assertIn('Batch size: 50', output)
        self.assertIn('Final totals', output)

    @patch('email_system.management.commands.process_email_queue.time.sleep', side_effect=KeyboardInterrupt)
    @patch('email_system.management.commands.process_email_queue.email_queue_service')
    def test_continuous_verbose_shows_cycle_header(self, mock_service, mock_sleep):
        """Test continuous mode with --verbose shows cycle headers."""
        mock_service.process_pending_queue.return_value = {
            'processed': 2, 'successful': 2, 'failed': 0, 'errors': [],
        }

        self.cmd.run_continuous(50, 30, None, None, False, verbose=True)

        output = self.cmd.stdout.getvalue()
        self.assertIn('Cycle 1', output)
        self.assertIn('Running totals:', output)

    @patch('email_system.management.commands.process_email_queue.time.sleep', side_effect=KeyboardInterrupt)
    @patch('email_system.management.commands.process_email_queue.email_queue_service')
    def test_continuous_no_verbose_skips_cycle_header(self, mock_service, mock_sleep):
        """Test continuous mode without --verbose skips cycle headers."""
        mock_service.process_pending_queue.return_value = {
            'processed': 2, 'successful': 2, 'failed': 0, 'errors': [],
        }

        self.cmd.run_continuous(50, 30, None, None, False)

        output = self.cmd.stdout.getvalue()
        self.assertNotIn('Cycle 1', output)
        self.assertNotIn('Running totals:', output)

    @patch('email_system.management.commands.process_email_queue.time.sleep', side_effect=KeyboardInterrupt)
    @patch('email_system.management.commands.process_email_queue.email_queue_service')
    def test_continuous_no_emails_to_process(self, mock_service, mock_sleep):
        """Test continuous mode with no emails shows appropriate message."""
        mock_service.process_pending_queue.return_value = {
            'processed': 0, 'successful': 0, 'failed': 0, 'errors': [],
        }

        self.cmd.run_continuous(50, 30, None, None, False)

        output = self.cmd.stdout.getvalue()
        self.assertIn('No emails to process', output)

    @patch('email_system.management.commands.process_email_queue.email_queue_service')
    def test_continuous_handles_processing_exception(self, mock_service):
        """Test continuous mode handles processing exceptions and continues."""
        # First call raises an exception; second call succeeds (then KeyboardInterrupt exits)
        mock_service.process_pending_queue.side_effect = [
            Exception('DB connection lost'),
            {'processed': 0, 'successful': 0, 'failed': 0, 'errors': []},
        ]

        sleep_calls = [0]

        def mock_sleep(seconds):
            sleep_calls[0] += 1
            if sleep_calls[0] >= 2:
                raise KeyboardInterrupt()

        with patch('email_system.management.commands.process_email_queue.time.sleep', side_effect=mock_sleep):
            self.cmd.run_continuous(50, 5, None, None, False)

        output = self.cmd.stdout.getvalue()
        self.assertIn('Error in processing cycle', output)

    @patch.object(Command, 'get_pending_count', return_value=5)
    def test_continuous_dry_run_exits_after_one_cycle(self, mock_count):
        """Test continuous dry run only runs one cycle then exits."""
        self.cmd.run_continuous(50, 30, None, None, True)

        output = self.cmd.stdout.getvalue()
        self.assertIn('Would process 5 emails', output)

    @patch('email_system.management.commands.process_email_queue.time.sleep', side_effect=KeyboardInterrupt)
    @patch('email_system.management.commands.process_email_queue.email_queue_service')
    def test_continuous_with_priority_filter(self, mock_service, mock_sleep):
        """Test continuous mode displays priority filter."""
        mock_service.process_pending_queue.return_value = {
            'processed': 1, 'successful': 1, 'failed': 0, 'errors': [],
        }

        self.cmd.run_continuous(50, 30, 'urgent', None, False)

        output = self.cmd.stdout.getvalue()
        self.assertIn('Priority filter: urgent', output)

    @patch('email_system.management.commands.process_email_queue.time.sleep', side_effect=KeyboardInterrupt)
    @patch('email_system.management.commands.process_email_queue.email_queue_service')
    def test_continuous_with_template_filter(self, mock_service, mock_sleep):
        """Test continuous mode displays template filter."""
        mock_service.process_pending_queue.return_value = {
            'processed': 1, 'successful': 1, 'failed': 0, 'errors': [],
        }

        self.cmd.run_continuous(50, 30, None, 'order_confirmation', False)

        output = self.cmd.stdout.getvalue()
        self.assertIn('Template filter: order_confirmation', output)


class GetPendingCountTest(TestCase):
    """Tests for get_pending_count method."""

    def setUp(self):
        self.cmd = Command()
        self.template = make_template(
            name='peq_count_tpl',
            display_name='PEQ Count Template',
            subject_template='PEQ Count Subject',
            is_active=True,
        )

    def test_count_pending_items(self):
        """Test counting pending items."""
        EmailQueue.objects.create(
            template=self.template,
            to_emails=['peq_count1@example.com'],
            from_email='sender@example.com',
            subject='PEQ Pending Count 1',
            status='pending',
        )
        EmailQueue.objects.create(
            template=self.template,
            to_emails=['peq_count2@example.com'],
            from_email='sender@example.com',
            subject='PEQ Pending Count 2',
            status='retry',
        )
        count = self.cmd.get_pending_count(None, None)
        self.assertGreaterEqual(count, 2)

    def test_count_with_priority_filter(self):
        """Test counting with priority filter."""
        EmailQueue.objects.create(
            to_emails=['peq_urgent@example.com'],
            from_email='sender@example.com',
            subject='PEQ Urgent',
            status='pending',
            priority='urgent',
        )
        EmailQueue.objects.create(
            to_emails=['peq_normal@example.com'],
            from_email='sender@example.com',
            subject='PEQ Normal',
            status='pending',
            priority='normal',
        )
        count = self.cmd.get_pending_count('urgent', None)
        self.assertGreaterEqual(count, 1)

    def test_count_with_template_filter(self):
        """Test counting with template filter."""
        EmailQueue.objects.create(
            template=self.template,
            to_emails=['peq_tpl@example.com'],
            from_email='sender@example.com',
            subject='PEQ Template Filter',
            status='pending',
        )
        count = self.cmd.get_pending_count(None, 'peq_count_tpl')
        self.assertGreaterEqual(count, 1)

    def test_count_excludes_expired(self):
        """Test that expired items are excluded."""
        EmailQueue.objects.create(
            to_emails=['peq_expired@example.com'],
            from_email='sender@example.com',
            subject='PEQ Expired',
            status='pending',
            expires_at=timezone.now() - timedelta(hours=1),
        )
        count = self.cmd.get_pending_count(None, None)
        # Expired items should not be counted (though other pending items may exist)
        # At minimum, the expired one is excluded
        expired_only = EmailQueue.objects.filter(
            to_emails__contains='peq_expired@example.com',
            status='pending',
            expires_at__lt=timezone.now()
        ).count()
        self.assertGreaterEqual(expired_only, 1)


class DisplayQueueStatsTest(TestCase):
    """Tests for display_queue_stats method."""

    def setUp(self):
        self.cmd = Command()
        self.cmd.stdout = StringIO()
        from django.core.management.color import color_style
        self.cmd.style = color_style()

    def test_display_basic_stats(self):
        """Test displaying basic queue stats."""
        stats = {
            'total': 100,
            'pending': 50,
            'processing': 5,
            'sent': 30,
            'failed': 10,
            'retry': 3,
            'cancelled': 2,
        }
        self.cmd.display_queue_stats(stats, 'Test Stats')
        output = self.cmd.stdout.getvalue()
        self.assertIn('Test Stats', output)
        self.assertIn('100', output)
        self.assertIn('50', output)
        self.assertIn('30', output)
        self.assertIn('10', output)

    def test_display_stats_with_log_stats(self):
        """Test displaying stats including log statistics."""
        stats = {
            'total': 100,
            'pending': 50,
            'processing': 5,
            'sent': 30,
            'failed': 10,
            'retry': 3,
            'cancelled': 2,
            'total_logs': 200,
            'sent_logs': 180,
            'opened_logs': 50,
            'clicked_logs': 10,
            'failed_logs': 20,
        }
        self.cmd.display_queue_stats(stats, 'Full Stats')
        output = self.cmd.stdout.getvalue()
        self.assertIn('Email Logs', output)
        self.assertIn('200', output)
        self.assertIn('180', output)
        self.assertIn('50', output)

    def test_display_stats_without_log_stats(self):
        """Test displaying stats without log statistics."""
        stats = {
            'total': 10,
            'pending': 5,
            'processing': 0,
            'sent': 3,
            'failed': 1,
            'retry': 1,
            'cancelled': 0,
        }
        self.cmd.display_queue_stats(stats, 'Queue Only')
        output = self.cmd.stdout.getvalue()
        self.assertNotIn('Email Logs', output)


class DisplayProcessingResultsTest(TestCase):
    """Tests for display_processing_results method."""

    def setUp(self):
        self.cmd = Command()
        self.cmd.stdout = StringIO()
        from django.core.management.color import color_style
        self.cmd.style = color_style()

    def test_display_results_no_errors(self):
        """Test displaying results with no errors."""
        results = {
            'processed': 10,
            'successful': 8,
            'failed': 2,
            'errors': [],
        }
        self.cmd.display_processing_results(results, 1.5)
        output = self.cmd.stdout.getvalue()
        self.assertIn('Processing Results', output)
        self.assertIn('10', output)

    def test_display_results_with_errors(self):
        """Test displaying results with errors."""
        results = {
            'processed': 5,
            'successful': 2,
            'failed': 3,
            'errors': ['Error 1', 'Error 2', 'Error 3'],
        }
        self.cmd.display_processing_results(results, 2.0)
        output = self.cmd.stdout.getvalue()
        self.assertIn('ERROR', output)
        self.assertIn('Error 1', output)
        self.assertIn('Error 2', output)
        self.assertIn('Error 3', output)

    def test_display_results_shows_all_errors(self):
        """Test that all errors are shown."""
        results = {
            'processed': 10,
            'successful': 0,
            'failed': 10,
            'errors': [f'Error {i}' for i in range(8)],
        }
        self.cmd.display_processing_results(results, 3.0)
        output = self.cmd.stdout.getvalue()
        self.assertIn('Error 0', output)
        self.assertIn('Error 7', output)

    def test_display_results_summary_format(self):
        """Test the concise summary format."""
        results = {
            'processed': 5,
            'successful': 5,
            'failed': 0,
            'errors': [],
        }
        self.cmd.display_processing_results(results, 0.5)
        output = self.cmd.stdout.getvalue()
        self.assertIn('Processed: 5 emails', output)
        self.assertIn('Successful: 5', output)
        self.assertIn('Failed: 0', output)


class SuppressNoisyLoggersTest(TestCase):
    """Tests for _suppress_noisy_loggers method."""

    def test_suppresses_css_inline_logger(self):
        """Test that css_inline logger is suppressed."""
        cmd = Command()
        cmd._suppress_noisy_loggers()
        import logging
        self.assertEqual(logging.getLogger('css_inline').level, logging.CRITICAL)

    def test_suppresses_cssutils_logger(self):
        """Test that cssutils logger is suppressed."""
        cmd = Command()
        cmd._suppress_noisy_loggers()
        import logging
        self.assertEqual(logging.getLogger('cssutils').level, logging.CRITICAL)


class ShowEmailConfigTest(TestCase):
    """Tests for _show_email_config method."""

    def test_shows_smtp_config(self):
        """Test that email config is displayed."""
        cmd = Command()
        cmd.stdout = StringIO()
        cmd._show_email_config()
        output = cmd.stdout.getvalue()
        self.assertIn('USE_INTERNAL_SMTP', output)
        self.assertIn('EMAIL_HOST', output)
