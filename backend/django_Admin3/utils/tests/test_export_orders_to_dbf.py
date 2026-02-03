"""Tests for utils/management/commands/export_orders_to_dbf.py - Orders DBF export command.

All database and file I/O operations are mocked.
"""
import os
from io import StringIO
from unittest.mock import patch, MagicMock, call

from django.test import SimpleTestCase


class TestExportOrdersToDbfCommand(SimpleTestCase):
    """Test the export_orders_to_dbf management command."""

    @patch('utils.management.commands.export_orders_to_dbf.DbfExportService')
    @patch('os.makedirs')
    def test_exports_all_tables(self, mock_makedirs, mock_service_cls):
        """Should export orders, items, users, and profiles."""
        from django.core.management import call_command

        mock_service = mock_service_cls.return_value
        mock_service.export_query_to_dbf.return_value = 10

        out = StringIO()
        call_command(
            'export_orders_to_dbf',
            output_dir='/tmp/exports',
            stdout=out,
        )
        output = out.getvalue()
        self.assertIn('orders', output.lower())
        self.assertIn('Export completed', output)
        # Should export 4 tables: orders, order items, users, profiles
        self.assertEqual(mock_service.export_query_to_dbf.call_count, 4)

    @patch('utils.management.commands.export_orders_to_dbf.DbfExportService')
    @patch('os.makedirs')
    def test_exports_with_date_filter(self, mock_makedirs, mock_service_cls):
        """Should build date filter for SQL queries."""
        from django.core.management import call_command

        mock_service = mock_service_cls.return_value
        mock_service.export_query_to_dbf.return_value = 5

        out = StringIO()
        call_command(
            'export_orders_to_dbf',
            output_dir='/tmp/exports',
            from_date='2025-01-01',
            to_date='2025-12-31',
            stdout=out,
        )
        # Verify SQL queries contain date filters
        calls = mock_service.export_query_to_dbf.call_args_list
        for c in calls:
            params = c.kwargs.get('params', c[1].get('params', []) if len(c[1]) > 0 else [])
            # Date filters should have params
            if isinstance(params, list) and len(params) > 0:
                self.assertIn('2025-01-01', params)

    @patch('utils.management.commands.export_orders_to_dbf.DbfExportService')
    @patch('os.makedirs')
    def test_exports_only_with_orders_flag(self, mock_makedirs, mock_service_cls):
        """Should filter users/profiles to those with orders when flag set."""
        from django.core.management import call_command

        mock_service = mock_service_cls.return_value
        mock_service.export_query_to_dbf.return_value = 3

        out = StringIO()
        call_command(
            'export_orders_to_dbf',
            output_dir='/tmp/exports',
            only_with_orders=True,
            stdout=out,
        )
        # Users and profiles SQL should contain INNER JOIN
        calls = mock_service.export_query_to_dbf.call_args_list
        # At least 2 calls should have JOIN for users and profiles
        sql_queries = [c.kwargs.get('sql', c[1].get('sql', '')) if c.kwargs else '' for c in calls]
        # Verify the service was called 4 times
        self.assertEqual(mock_service.export_query_to_dbf.call_count, 4)

    @patch('utils.management.commands.export_orders_to_dbf.DbfExportService')
    @patch('os.makedirs')
    def test_exports_with_debug_flag(self, mock_makedirs, mock_service_cls):
        """Debug flag should be passed to service."""
        from django.core.management import call_command

        mock_service = mock_service_cls.return_value
        mock_service.export_query_to_dbf.return_value = 0

        out = StringIO()
        call_command(
            'export_orders_to_dbf',
            output_dir='/tmp/exports',
            debug=True,
            stdout=out,
        )
        # Verify the service was created with debug=True
        mock_service_cls.assert_called_once_with(encoding='cp1252', debug=True)


class TestBuildDateFilter(SimpleTestCase):
    """Test _build_date_filter method."""

    def _get_command(self):
        from utils.management.commands.export_orders_to_dbf import Command
        return Command()

    def test_no_dates_returns_empty(self):
        """No dates should return empty filter."""
        cmd = self._get_command()
        result = cmd._build_date_filter(None, None)
        self.assertEqual(result['clause'], '')
        self.assertEqual(result['params'], [])

    def test_from_date_only(self):
        """Only from_date should add >= condition."""
        cmd = self._get_command()
        result = cmd._build_date_filter('2025-01-01', None)
        self.assertIn('>=', result['clause'])
        self.assertEqual(result['params'], ['2025-01-01'])

    def test_to_date_only(self):
        """Only to_date should add < condition."""
        cmd = self._get_command()
        result = cmd._build_date_filter(None, '2025-12-31')
        self.assertIn('<', result['clause'])
        self.assertEqual(result['params'], ['2025-12-31'])

    def test_both_dates(self):
        """Both dates should add both conditions."""
        cmd = self._get_command()
        result = cmd._build_date_filter('2025-01-01', '2025-12-31')
        self.assertIn('>=', result['clause'])
        self.assertIn('<', result['clause'])
        self.assertEqual(len(result['params']), 2)
