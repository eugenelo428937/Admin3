"""Tests for utils/management/commands/export_to_dbf.py - DBF export command.

All database and file I/O operations are mocked.
"""
import datetime
from decimal import Decimal
from io import StringIO
from unittest.mock import patch, MagicMock

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import SimpleTestCase


class TestExportToDbfCommandArgValidation(SimpleTestCase):
    """Test argument validation for export_to_dbf management command."""

    @patch('utils.management.commands.export_to_dbf.YDBF_AVAILABLE', True)
    def test_requires_model_or_sql(self):
        """Command should fail if neither --model nor --sql is provided."""
        with self.assertRaises(CommandError) as ctx:
            call_command('export_to_dbf', output='test.dbf')
        self.assertIn('Either --model or --sql must be specified', str(ctx.exception))

    @patch('utils.management.commands.export_to_dbf.YDBF_AVAILABLE', True)
    def test_cannot_specify_both_model_and_sql(self):
        """Command should fail if both --model and --sql are provided."""
        with self.assertRaises(CommandError) as ctx:
            call_command('export_to_dbf', model='app.Model', sql='SELECT 1', output='test.dbf')
        self.assertIn('Cannot specify both', str(ctx.exception))

    @patch('utils.management.commands.export_to_dbf.YDBF_AVAILABLE', False)
    def test_requires_ydbf(self):
        """Command should fail if ydbf is not installed."""
        with self.assertRaises(CommandError) as ctx:
            call_command('export_to_dbf', model='app.Model', output='test.dbf')
        self.assertIn('ydbf library is required', str(ctx.exception))


class TestExportToDbfGetModelData(SimpleTestCase):
    """Test get_model_data method."""

    @patch('utils.management.commands.export_to_dbf.YDBF_AVAILABLE', True)
    def test_model_not_found(self):
        """Should raise CommandError for non-existent models."""
        with self.assertRaises(CommandError):
            call_command('export_to_dbf', model='nonexistent.Model', output='test.dbf')

    @patch('utils.management.commands.export_to_dbf.YDBF_AVAILABLE', True)
    @patch('utils.management.commands.export_to_dbf.apps.get_model')
    @patch('utils.management.commands.export_to_dbf.ydbf', create=True)
    @patch('os.makedirs')
    def test_model_data_with_filters(self, mock_makedirs, mock_ydbf, mock_get_model):
        """Should apply filters to queryset."""
        mock_model = MagicMock()
        mock_qs = MagicMock()
        mock_qs.all.return_value = mock_qs
        mock_qs.filter.return_value = mock_qs
        mock_qs.__getitem__ = MagicMock(return_value=mock_qs)
        mock_qs.values.return_value = [{'id': 1, 'name': 'test'}]
        mock_model.objects = mock_qs
        mock_model._meta.get_fields.return_value = []
        mock_get_model.return_value = mock_model

        # Mock ydbf.open context manager
        mock_dbf_writer = MagicMock()
        mock_ydbf.open.return_value.__enter__ = MagicMock(return_value=mock_dbf_writer)
        mock_ydbf.open.return_value.__exit__ = MagicMock(return_value=False)

        out = StringIO()
        call_command(
            'export_to_dbf',
            model='app.Model',
            output='/tmp/test.dbf',
            filter='is_active=True,id=123',
            stdout=out,
        )
        mock_qs.filter.assert_called_once()

    @patch('utils.management.commands.export_to_dbf.YDBF_AVAILABLE', True)
    @patch('utils.management.commands.export_to_dbf.apps.get_model')
    @patch('utils.management.commands.export_to_dbf.ydbf', create=True)
    @patch('os.makedirs')
    def test_model_data_with_limit(self, mock_makedirs, mock_ydbf, mock_get_model):
        """Should apply limit to queryset."""
        mock_model = MagicMock()
        mock_qs = MagicMock()
        mock_qs.all.return_value = mock_qs
        mock_qs.__getitem__ = MagicMock(return_value=mock_qs)
        mock_qs.values.return_value = [{'id': 1}]
        mock_model.objects = mock_qs
        mock_model._meta.get_fields.return_value = []
        mock_get_model.return_value = mock_model

        mock_dbf_writer = MagicMock()
        mock_ydbf.open.return_value.__enter__ = MagicMock(return_value=mock_dbf_writer)
        mock_ydbf.open.return_value.__exit__ = MagicMock(return_value=False)

        out = StringIO()
        call_command(
            'export_to_dbf',
            model='app.Model',
            output='/tmp/test.dbf',
            limit=10,
            stdout=out,
        )

    @patch('utils.management.commands.export_to_dbf.YDBF_AVAILABLE', True)
    @patch('utils.management.commands.export_to_dbf.apps.get_model')
    @patch('utils.management.commands.export_to_dbf.ydbf', create=True)
    @patch('os.makedirs')
    def test_model_data_with_debug(self, mock_makedirs, mock_ydbf, mock_get_model):
        """Debug flag should output additional information."""
        mock_model = MagicMock()
        mock_qs = MagicMock()
        mock_qs.all.return_value = mock_qs
        mock_qs.values.return_value = [{'id': 1}]
        mock_model.objects = mock_qs
        mock_model._meta.get_fields.return_value = []
        mock_get_model.return_value = mock_model

        mock_dbf_writer = MagicMock()
        mock_ydbf.open.return_value.__enter__ = MagicMock(return_value=mock_dbf_writer)
        mock_ydbf.open.return_value.__exit__ = MagicMock(return_value=False)

        out = StringIO()
        call_command(
            'export_to_dbf',
            model='app.Model',
            output='/tmp/test.dbf',
            debug=True,
            stdout=out,
        )
        output_text = out.getvalue()
        self.assertIn('Retrieved', output_text)


class TestExportToDbfGetSqlData(SimpleTestCase):
    """Test get_sql_data method."""

    @patch('utils.management.commands.export_to_dbf.YDBF_AVAILABLE', True)
    @patch('utils.management.commands.export_to_dbf.connection')
    @patch('utils.management.commands.export_to_dbf.ydbf', create=True)
    @patch('os.makedirs')
    def test_sql_query_execution(self, mock_makedirs, mock_ydbf, mock_connection):
        """Should execute SQL query and export results."""
        mock_cursor = MagicMock()
        mock_cursor.description = [
            ('ID', 23, None, None, None, None, None),
            ('NAME', 25, 50, None, None, None, None),
        ]
        mock_cursor.fetchall.return_value = [(1, 'Test')]
        mock_connection.cursor.return_value.__enter__ = MagicMock(return_value=mock_cursor)
        mock_connection.cursor.return_value.__exit__ = MagicMock(return_value=False)

        mock_dbf_writer = MagicMock()
        mock_ydbf.open.return_value.__enter__ = MagicMock(return_value=mock_dbf_writer)
        mock_ydbf.open.return_value.__exit__ = MagicMock(return_value=False)

        out = StringIO()
        call_command(
            'export_to_dbf',
            sql='SELECT id, name FROM test_table',
            output='/tmp/test.dbf',
            stdout=out,
        )


class TestDjangoFieldToDbf(SimpleTestCase):
    """Test django_field_to_dbf conversion method."""

    def _get_command(self):
        from utils.management.commands.export_to_dbf import Command
        return Command()

    @patch('utils.management.commands.export_to_dbf.YDBF_AVAILABLE', True)
    def test_charfield_conversion(self):
        """CharField should map to YDBF_CHAR."""
        cmd = self._get_command()
        from django.db import models
        field = models.CharField(max_length=100)
        field.name = 'test_field'
        result = cmd.django_field_to_dbf(field)
        self.assertEqual(result[1], 'C')
        self.assertEqual(result[2], 100)

    @patch('utils.management.commands.export_to_dbf.YDBF_AVAILABLE', True)
    def test_textfield_conversion(self):
        """TextField should map to YDBF_CHAR with max length 254."""
        cmd = self._get_command()
        from django.db import models
        field = models.TextField()
        field.name = 'description'
        result = cmd.django_field_to_dbf(field)
        self.assertEqual(result[1], 'C')
        self.assertEqual(result[2], 254)

    @patch('utils.management.commands.export_to_dbf.YDBF_AVAILABLE', True)
    def test_integerfield_conversion(self):
        """IntegerField should map to YDBF_NUMERAL."""
        cmd = self._get_command()
        from django.db import models
        field = models.IntegerField()
        field.name = 'count'
        result = cmd.django_field_to_dbf(field)
        self.assertEqual(result[1], 'N')

    @patch('utils.management.commands.export_to_dbf.YDBF_AVAILABLE', True)
    def test_decimalfield_conversion(self):
        """DecimalField should map to YDBF_NUMERAL with decimal places."""
        cmd = self._get_command()
        from django.db import models
        field = models.DecimalField(max_digits=10, decimal_places=2)
        field.name = 'price'
        result = cmd.django_field_to_dbf(field)
        self.assertEqual(result[1], 'N')
        self.assertEqual(result[3], 2)

    @patch('utils.management.commands.export_to_dbf.YDBF_AVAILABLE', True)
    def test_floatfield_conversion(self):
        """FloatField should map to YDBF_NUMERAL."""
        cmd = self._get_command()
        from django.db import models
        field = models.FloatField()
        field.name = 'rate'
        result = cmd.django_field_to_dbf(field)
        self.assertEqual(result[1], 'N')

    @patch('utils.management.commands.export_to_dbf.YDBF_AVAILABLE', True)
    def test_booleanfield_conversion(self):
        """BooleanField should map to YDBF_LOGICAL."""
        cmd = self._get_command()
        from django.db import models
        field = models.BooleanField()
        field.name = 'active'
        result = cmd.django_field_to_dbf(field)
        self.assertEqual(result[1], 'L')

    @patch('utils.management.commands.export_to_dbf.YDBF_AVAILABLE', True)
    def test_datefield_conversion(self):
        """DateField should map to YDBF_DATE."""
        cmd = self._get_command()
        from django.db import models
        field = models.DateField()
        field.name = 'created'
        result = cmd.django_field_to_dbf(field)
        self.assertEqual(result[1], 'D')

    @patch('utils.management.commands.export_to_dbf.YDBF_AVAILABLE', True)
    def test_datetimefield_conversion(self):
        """DateTimeField is a subclass of DateField, matches DateField branch first."""
        cmd = self._get_command()
        from django.db import models
        field = models.DateTimeField()
        field.name = 'timestamp'
        result = cmd.django_field_to_dbf(field)
        # DateTimeField extends DateField, so isinstance(field, models.DateField)
        # matches first, returning a single tuple (not a list)
        self.assertIsInstance(result, tuple)
        self.assertEqual(result[1], 'D')

    @patch('utils.management.commands.export_to_dbf.YDBF_AVAILABLE', True)
    def test_foreignkey_conversion(self):
        """ForeignKey should map to YDBF_NUMERAL with '_ID' suffix."""
        cmd = self._get_command()
        from django.db import models
        field = MagicMock(spec=models.ForeignKey)
        field.name = 'user'
        result = cmd.django_field_to_dbf(field)
        self.assertIn('_ID', result[0])
        self.assertEqual(result[1], 'N')

    @patch('utils.management.commands.export_to_dbf.YDBF_AVAILABLE', True)
    def test_unknown_field_defaults_to_char(self):
        """Unknown field types should default to character."""
        cmd = self._get_command()
        from django.db import models
        field = MagicMock(spec=models.Field)
        field.name = 'custom_field'
        # Ensure isinstance checks fail for all known types
        result = cmd.django_field_to_dbf(field)
        self.assertEqual(result[1], 'C')


class TestSqlColumnToDbf(SimpleTestCase):
    """Test sql_column_to_dbf conversion method."""

    def _get_command(self):
        from utils.management.commands.export_to_dbf import Command
        return Command()

    @patch('utils.management.commands.export_to_dbf.YDBF_AVAILABLE', True)
    def test_numeric_type_with_scale(self):
        """Numeric SQL columns with scale should map to NUMERAL with decimal."""
        cmd = self._get_command()
        col_desc = ('PRICE', 3, 10, None, 10, 2, True)
        result = cmd.sql_column_to_dbf(col_desc)
        self.assertEqual(result[1], 'N')
        self.assertEqual(result[3], 2)

    @patch('utils.management.commands.export_to_dbf.YDBF_AVAILABLE', True)
    def test_numeric_type_without_scale(self):
        """Numeric SQL columns without scale should map to integer."""
        cmd = self._get_command()
        col_desc = ('ID', 4, 10, None, 0, 0, False)
        result = cmd.sql_column_to_dbf(col_desc)
        self.assertEqual(result[1], 'N')
        self.assertEqual(result[3], 0)

    @patch('utils.management.commands.export_to_dbf.YDBF_AVAILABLE', True)
    def test_string_type(self):
        """String SQL columns should map to CHAR."""
        cmd = self._get_command()
        col_desc = ('NAME', 12, 50, None, 0, 0, True)
        result = cmd.sql_column_to_dbf(col_desc)
        self.assertEqual(result[1], 'C')

    @patch('utils.management.commands.export_to_dbf.YDBF_AVAILABLE', True)
    def test_date_type(self):
        """Date SQL columns should map to DATE."""
        cmd = self._get_command()
        col_desc = ('CREATED', 9, 8, None, 0, 0, True)
        result = cmd.sql_column_to_dbf(col_desc)
        self.assertEqual(result[1], 'D')

    @patch('utils.management.commands.export_to_dbf.YDBF_AVAILABLE', True)
    def test_unknown_type_defaults_to_char(self):
        """Unknown SQL column types should default to CHAR."""
        cmd = self._get_command()
        col_desc = ('CUSTOM', 99, 50, None, 0, 0, True)
        result = cmd.sql_column_to_dbf(col_desc)
        self.assertEqual(result[1], 'C')


class TestPrepareDataForDbf(SimpleTestCase):
    """Test prepare_data_for_dbf method."""

    def _get_command(self):
        from utils.management.commands.export_to_dbf import Command
        return Command()

    @patch('utils.management.commands.export_to_dbf.YDBF_AVAILABLE', True)
    def test_null_values_get_defaults(self):
        """Null values should be replaced with type-appropriate defaults."""
        cmd = self._get_command()
        data = [{'ID': None, 'NAME': None, 'ACTIVE': None, 'CREATED': None}]
        field_defs = [
            ('ID', 'N', 10, 0),
            ('NAME', 'C', 50, 0),
            ('ACTIVE', 'L', 1, 0),
            ('CREATED', 'D', 8, 0),
        ]
        result = cmd.prepare_data_for_dbf(data, field_defs)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]['ID'], 0)
        self.assertEqual(result[0]['NAME'], '')
        self.assertFalse(result[0]['ACTIVE'])
        self.assertEqual(result[0]['CREATED'], datetime.date(1900, 1, 1))

    @patch('utils.management.commands.export_to_dbf.YDBF_AVAILABLE', True)
    def test_value_type_conversions(self):
        """Values should be converted to appropriate types."""
        cmd = self._get_command()
        dt = datetime.datetime(2025, 1, 15, 10, 30, 0)
        data = [{'ID': 42, 'NAME': 'Test', 'ACTIVE': True, 'CREATED': dt}]
        field_defs = [
            ('ID', 'N', 10, 0),
            ('NAME', 'C', 50, 0),
            ('ACTIVE', 'L', 1, 0),
            ('CREATED', 'D', 8, 0),
        ]
        result = cmd.prepare_data_for_dbf(data, field_defs)
        self.assertEqual(result[0]['ID'], 42)
        self.assertEqual(result[0]['NAME'], 'Test')
        self.assertTrue(result[0]['ACTIVE'])
        self.assertEqual(result[0]['CREATED'], datetime.date(2025, 1, 15))

    @patch('utils.management.commands.export_to_dbf.YDBF_AVAILABLE', True)
    def test_numeric_string_conversion(self):
        """String numbers should be converted to float."""
        cmd = self._get_command()
        data = [{'PRICE': '19.99'}]
        field_defs = [('PRICE', 'N', 10, 2)]
        result = cmd.prepare_data_for_dbf(data, field_defs)
        self.assertEqual(result[0]['PRICE'], 19.99)

    @patch('utils.management.commands.export_to_dbf.YDBF_AVAILABLE', True)
    def test_invalid_numeric_defaults_to_zero(self):
        """Invalid numeric strings should default to 0."""
        cmd = self._get_command()
        data = [{'PRICE': 'not_a_number'}]
        field_defs = [('PRICE', 'N', 10, 2)]
        result = cmd.prepare_data_for_dbf(data, field_defs)
        self.assertEqual(result[0]['PRICE'], 0)

    @patch('utils.management.commands.export_to_dbf.YDBF_AVAILABLE', True)
    def test_date_object_passes_through(self):
        """Date objects should pass through unchanged."""
        cmd = self._get_command()
        d = datetime.date(2025, 6, 15)
        data = [{'CREATED': d}]
        field_defs = [('CREATED', 'D', 8, 0)]
        result = cmd.prepare_data_for_dbf(data, field_defs)
        self.assertEqual(result[0]['CREATED'], d)

    @patch('utils.management.commands.export_to_dbf.YDBF_AVAILABLE', True)
    def test_non_date_defaults_to_epoch(self):
        """Non-date values for date fields should default to 1900-01-01."""
        cmd = self._get_command()
        data = [{'CREATED': 'not_a_date'}]
        field_defs = [('CREATED', 'D', 8, 0)]
        result = cmd.prepare_data_for_dbf(data, field_defs)
        self.assertEqual(result[0]['CREATED'], datetime.date(1900, 1, 1))

    @patch('utils.management.commands.export_to_dbf.YDBF_AVAILABLE', True)
    def test_char_truncation(self):
        """Character values should be truncated to field size."""
        cmd = self._get_command()
        data = [{'NAME': 'x' * 300}]
        field_defs = [('NAME', 'C', 10, 0)]
        result = cmd.prepare_data_for_dbf(data, field_defs)
        self.assertEqual(len(result[0]['NAME']), 10)

    @patch('utils.management.commands.export_to_dbf.YDBF_AVAILABLE', True)
    def test_unknown_field_type_becomes_string(self):
        """Unknown field types should stringify value."""
        cmd = self._get_command()
        data = [{'CUSTOM': 42}]
        field_defs = [('CUSTOM', 'X', 50, 0)]
        result = cmd.prepare_data_for_dbf(data, field_defs)
        self.assertEqual(result[0]['CUSTOM'], '42')


class TestExportToDbfExceptionHandling(SimpleTestCase):
    """Test error handling in export command."""

    @patch('utils.management.commands.export_to_dbf.YDBF_AVAILABLE', True)
    @patch('utils.management.commands.export_to_dbf.apps.get_model')
    def test_exception_with_debug_shows_traceback(self, mock_get_model):
        """Debug flag should show traceback on error."""
        mock_get_model.side_effect = Exception('DB error')
        with self.assertRaises(CommandError):
            call_command('export_to_dbf', model='app.Model', output='test.dbf', debug=True)

    @patch('utils.management.commands.export_to_dbf.YDBF_AVAILABLE', True)
    @patch('utils.management.commands.export_to_dbf.apps.get_model')
    def test_exception_without_debug(self, mock_get_model):
        """Without debug, exception should be wrapped in CommandError."""
        mock_get_model.side_effect = Exception('DB error')
        with self.assertRaises(CommandError):
            call_command('export_to_dbf', model='app.Model', output='test.dbf')


class TestExportToDbfFile(SimpleTestCase):
    """Test the export_to_dbf file writing method."""

    @patch('utils.management.commands.export_to_dbf.YDBF_AVAILABLE', True)
    @patch('utils.management.commands.export_to_dbf.DBFREAD_AVAILABLE', True)
    @patch('utils.management.commands.export_to_dbf.dbfread', create=True)
    @patch('utils.management.commands.export_to_dbf.ydbf', create=True)
    @patch('os.makedirs')
    def test_validates_with_dbfread(self, mock_makedirs, mock_ydbf, mock_dbfread):
        """Should validate file with dbfread when available."""
        cmd = self._get_command()
        mock_dbf_writer = MagicMock()
        mock_ydbf.open.return_value.__enter__ = MagicMock(return_value=mock_dbf_writer)
        mock_ydbf.open.return_value.__exit__ = MagicMock(return_value=False)

        mock_reader = MagicMock()
        mock_reader.__enter__ = MagicMock(return_value=mock_reader)
        mock_reader.__exit__ = MagicMock(return_value=False)
        mock_reader.__iter__ = MagicMock(return_value=iter([]))
        mock_dbfread.DBF.return_value = mock_reader

        out = StringIO()
        cmd.stdout = out
        cmd.style = MagicMock()
        cmd.style.SUCCESS = lambda x: x
        cmd.export_to_dbf([], [], {'output': '/tmp/test.dbf', 'encoding': 'cp1252', 'debug': False})

    def _get_command(self):
        from utils.management.commands.export_to_dbf import Command
        return Command()
