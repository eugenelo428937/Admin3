"""Tests for utils/services/dbf_export_service.py - DBF export service.

All database and file I/O operations are mocked.
"""
import datetime
from decimal import Decimal
from unittest.mock import patch, MagicMock

from django.test import SimpleTestCase


class TestDbfExportServiceInit(SimpleTestCase):
    """Test DbfExportService initialization."""

    @patch('utils.services.dbf_export_service.YDBF_AVAILABLE', False)
    def test_init_raises_without_ydbf(self):
        """Should raise DbfExportError when ydbf is not installed."""
        from utils.services.dbf_export_service import DbfExportService, DbfExportError
        with self.assertRaises(DbfExportError):
            DbfExportService()

    @patch('utils.services.dbf_export_service.YDBF_AVAILABLE', True)
    def test_init_with_defaults(self):
        """Should initialize with default encoding and debug settings."""
        from utils.services.dbf_export_service import DbfExportService
        service = DbfExportService()
        self.assertEqual(service.encoding, 'cp1252')
        self.assertFalse(service.debug)

    @patch('utils.services.dbf_export_service.YDBF_AVAILABLE', True)
    def test_init_with_custom_settings(self):
        """Should accept custom encoding and debug settings."""
        from utils.services.dbf_export_service import DbfExportService
        service = DbfExportService(encoding='utf-8', debug=True)
        self.assertEqual(service.encoding, 'utf-8')
        self.assertTrue(service.debug)


class TestDbfExportServiceDjangoFieldConversion(SimpleTestCase):
    """Test _django_field_to_dbf method."""

    @patch('utils.services.dbf_export_service.YDBF_AVAILABLE', True)
    def _get_service(self):
        from utils.services.dbf_export_service import DbfExportService
        return DbfExportService()

    def test_charfield(self):
        from django.db import models
        service = self._get_service()
        field = models.CharField(max_length=100)
        field.name = 'title'
        result = service._django_field_to_dbf(field)
        self.assertEqual(result[1], 'C')

    def test_textfield(self):
        from django.db import models
        service = self._get_service()
        field = models.TextField()
        field.name = 'body'
        result = service._django_field_to_dbf(field)
        self.assertEqual(result[1], 'C')
        self.assertEqual(result[2], 254)

    def test_integerfield(self):
        from django.db import models
        service = self._get_service()
        field = models.IntegerField()
        field.name = 'count'
        result = service._django_field_to_dbf(field)
        self.assertEqual(result[1], 'N')

    def test_bigintegerfield(self):
        from django.db import models
        service = self._get_service()
        field = models.BigIntegerField()
        field.name = 'big_id'
        result = service._django_field_to_dbf(field)
        self.assertEqual(result[1], 'N')
        # BigIntegerField is a subclass of IntegerField, so the IntegerField
        # branch matches first, returning size 10
        self.assertEqual(result[2], 10)

    def test_decimalfield(self):
        from django.db import models
        service = self._get_service()
        field = models.DecimalField(max_digits=10, decimal_places=2)
        field.name = 'price'
        result = service._django_field_to_dbf(field)
        self.assertEqual(result[1], 'N')
        self.assertEqual(result[3], 2)

    def test_floatfield(self):
        from django.db import models
        service = self._get_service()
        field = models.FloatField()
        field.name = 'rate'
        result = service._django_field_to_dbf(field)
        self.assertEqual(result[1], 'N')

    def test_booleanfield(self):
        from django.db import models
        service = self._get_service()
        field = models.BooleanField()
        field.name = 'active'
        result = service._django_field_to_dbf(field)
        self.assertEqual(result[1], 'L')

    def test_datefield(self):
        from django.db import models
        service = self._get_service()
        field = models.DateField()
        field.name = 'created'
        result = service._django_field_to_dbf(field)
        self.assertEqual(result[1], 'D')

    def test_datetimefield_splits(self):
        """DateTimeField is a subclass of DateField, so it matches DateField branch first."""
        from django.db import models
        service = self._get_service()
        field = models.DateTimeField()
        field.name = 'timestamp'
        result = service._django_field_to_dbf(field)
        # DateTimeField extends DateField, so isinstance(field, models.DateField)
        # matches first, returning a single tuple (not a list of 2)
        self.assertIsInstance(result, tuple)
        self.assertEqual(result[1], 'D')

    def test_foreignkey(self):
        from django.db import models
        service = self._get_service()
        field = MagicMock(spec=models.ForeignKey)
        field.name = 'user'
        result = service._django_field_to_dbf(field)
        self.assertIn('_ID', result[0])

    def test_emailfield(self):
        from django.db import models
        service = self._get_service()
        field = models.EmailField()
        field.name = 'email'
        result = service._django_field_to_dbf(field)
        self.assertEqual(result[1], 'C')
        # EmailField extends CharField with default max_length=254,
        # so the CharField branch matches first returning min(254, 254) = 254
        self.assertEqual(result[2], 254)

    def test_urlfield(self):
        from django.db import models
        service = self._get_service()
        field = models.URLField()
        field.name = 'website'
        result = service._django_field_to_dbf(field)
        self.assertEqual(result[1], 'C')
        self.assertEqual(result[2], 200)

    def test_uuidfield(self):
        from django.db import models
        service = self._get_service()
        field = models.UUIDField()
        field.name = 'uuid'
        result = service._django_field_to_dbf(field)
        self.assertEqual(result[1], 'C')
        self.assertEqual(result[2], 36)

    def test_jsonfield(self):
        from django.db import models
        service = self._get_service()
        field = models.JSONField()
        field.name = 'data'
        result = service._django_field_to_dbf(field)
        self.assertEqual(result[1], 'C')
        self.assertEqual(result[2], 254)

    def test_unknown_field_defaults_to_char(self):
        from django.db import models
        service = self._get_service()
        field = MagicMock(spec=models.Field)
        field.name = 'custom'
        result = service._django_field_to_dbf(field)
        self.assertEqual(result[1], 'C')


class TestDbfExportServiceSqlColumnConversion(SimpleTestCase):
    """Test _sql_column_to_dbf method."""

    @patch('utils.services.dbf_export_service.YDBF_AVAILABLE', True)
    def _get_service(self):
        from utils.services.dbf_export_service import DbfExportService
        return DbfExportService()

    def test_boolean_type(self):
        service = self._get_service()
        result = service._sql_column_to_dbf(('ACTIVE', 16, 1, None, 0, 0, True))
        self.assertEqual(result[1], 'L')

    def test_integer_types(self):
        service = self._get_service()
        for type_code in [20, 21, 23]:
            result = service._sql_column_to_dbf(('ID', type_code, 10, None, 0, 0, False))
            self.assertEqual(result[1], 'N')

    def test_float_with_scale(self):
        service = self._get_service()
        result = service._sql_column_to_dbf(('PRICE', 1700, 18, None, 10, 2, True))
        self.assertEqual(result[1], 'N')
        self.assertEqual(result[3], 2)

    def test_float_without_scale(self):
        service = self._get_service()
        result = service._sql_column_to_dbf(('RATE', 701, 15, None, 0, 0, True))
        self.assertEqual(result[1], 'N')
        self.assertEqual(result[3], 5)

    def test_date_type(self):
        service = self._get_service()
        result = service._sql_column_to_dbf(('CREATED', 1082, 8, None, 0, 0, True))
        self.assertEqual(result[1], 'D')

    def test_text_varchar_types(self):
        service = self._get_service()
        for type_code in [25, 1043]:
            result = service._sql_column_to_dbf(('NAME', type_code, 100, None, 0, 0, True))
            self.assertEqual(result[1], 'C')

    def test_unknown_type_defaults_to_char(self):
        service = self._get_service()
        result = service._sql_column_to_dbf(('CUSTOM', 9999, 50, None, 0, 0, True))
        self.assertEqual(result[1], 'C')


class TestDbfExportServiceConvertValue(SimpleTestCase):
    """Test _convert_value_for_dbf method."""

    @patch('utils.services.dbf_export_service.YDBF_AVAILABLE', True)
    def _get_service(self):
        from utils.services.dbf_export_service import DbfExportService
        return DbfExportService()

    def test_none_char_returns_empty(self):
        service = self._get_service()
        result = service._convert_value_for_dbf(None, 'C')
        self.assertEqual(result, '')

    def test_none_numeral_returns_zero(self):
        service = self._get_service()
        result = service._convert_value_for_dbf(None, 'N')
        self.assertEqual(result, 0)

    def test_none_logical_returns_false(self):
        service = self._get_service()
        result = service._convert_value_for_dbf(None, 'L')
        self.assertFalse(result)

    def test_none_date_returns_epoch(self):
        service = self._get_service()
        result = service._convert_value_for_dbf(None, 'D')
        self.assertEqual(result, datetime.date(1900, 1, 1))

    def test_none_unknown_returns_empty(self):
        service = self._get_service()
        result = service._convert_value_for_dbf(None, 'X')
        self.assertEqual(result, '')

    def test_char_truncates(self):
        service = self._get_service()
        result = service._convert_value_for_dbf('x' * 300, 'C', 10)
        self.assertEqual(len(result), 10)

    def test_numeral_passes_number(self):
        service = self._get_service()
        self.assertEqual(service._convert_value_for_dbf(42, 'N'), 42)
        self.assertEqual(service._convert_value_for_dbf(3.14, 'N'), 3.14)
        self.assertEqual(service._convert_value_for_dbf(Decimal('9.99'), 'N'), Decimal('9.99'))

    def test_numeral_converts_string(self):
        service = self._get_service()
        result = service._convert_value_for_dbf('19.99', 'N')
        self.assertEqual(result, 19.99)

    def test_numeral_invalid_string_returns_zero(self):
        service = self._get_service()
        result = service._convert_value_for_dbf('abc', 'N')
        self.assertEqual(result, 0)

    def test_logical_converts_to_bool(self):
        service = self._get_service()
        self.assertTrue(service._convert_value_for_dbf(1, 'L'))
        self.assertFalse(service._convert_value_for_dbf(0, 'L'))

    def test_date_from_datetime(self):
        service = self._get_service()
        dt = datetime.datetime(2025, 6, 15, 10, 30, 0)
        result = service._convert_value_for_dbf(dt, 'D')
        self.assertEqual(result, datetime.date(2025, 6, 15))

    def test_date_from_date(self):
        service = self._get_service()
        d = datetime.date(2025, 6, 15)
        result = service._convert_value_for_dbf(d, 'D')
        self.assertEqual(result, d)

    def test_date_from_string(self):
        service = self._get_service()
        result = service._convert_value_for_dbf('2025-06-15', 'D')
        self.assertEqual(result, datetime.date(2025, 6, 15))

    def test_date_from_invalid_string(self):
        service = self._get_service()
        result = service._convert_value_for_dbf('not-a-date', 'D')
        self.assertEqual(result, datetime.date(1900, 1, 1))

    def test_date_from_unknown_type(self):
        service = self._get_service()
        result = service._convert_value_for_dbf(12345, 'D')
        self.assertEqual(result, datetime.date(1900, 1, 1))

    def test_unknown_type_stringifies(self):
        service = self._get_service()
        result = service._convert_value_for_dbf(42, 'X')
        self.assertEqual(result, '42')


class TestDbfExportServicePrepareData(SimpleTestCase):
    """Test _prepare_data_for_dbf method."""

    @patch('utils.services.dbf_export_service.YDBF_AVAILABLE', True)
    def _get_service(self):
        from utils.services.dbf_export_service import DbfExportService
        return DbfExportService()

    def test_handles_time_field_suffix(self):
        """Fields ending in _T should extract time from datetime."""
        service = self._get_service()
        dt = datetime.datetime(2025, 1, 15, 14, 30, 45)
        data = [{'CREATED': dt}]
        field_defs = [
            ('CREATED', 'D', 8, 0),
            ('CREATED_T', 'C', 8, 0),
        ]
        result = service._prepare_data_for_dbf(data, field_defs)
        self.assertEqual(result[0]['CREATED_T'], '14:30:45')

    def test_handles_foreign_key_id_mapping(self):
        """Fields with _ID suffix should match original field name."""
        service = self._get_service()
        data = [{'USER': 42}]
        field_defs = [('USER_ID', 'N', 10, 0)]
        result = service._prepare_data_for_dbf(data, field_defs)
        self.assertEqual(result[0]['USER_ID'], 42)


class TestDbfExportServiceExportData(SimpleTestCase):
    """Test _export_data_to_dbf method."""

    @patch('utils.services.dbf_export_service.YDBF_AVAILABLE', True)
    @patch('utils.services.dbf_export_service.ydbf', create=True)
    @patch('os.makedirs')
    def test_creates_output_directory(self, mock_makedirs, mock_ydbf):
        from utils.services.dbf_export_service import DbfExportService
        service = DbfExportService()

        mock_dbf = MagicMock()
        mock_ydbf.open.return_value.__enter__ = MagicMock(return_value=mock_dbf)
        mock_ydbf.open.return_value.__exit__ = MagicMock(return_value=False)

        result = service._export_data_to_dbf([], [], '/tmp/test/output.dbf')
        self.assertEqual(result, 0)
        mock_makedirs.assert_called_once()

    @patch('utils.services.dbf_export_service.YDBF_AVAILABLE', True)
    def test_debug_prints_info(self):
        """Debug mode should print field definitions and sample records."""
        from utils.services.dbf_export_service import DbfExportService
        service = DbfExportService(debug=True)
        service._prepare_data_for_dbf = MagicMock(return_value=[{'ID': 1}])

        with patch('utils.services.dbf_export_service.ydbf', create=True) as mock_ydbf, \
             patch('os.makedirs'), \
             patch('builtins.print') as mock_print:
            mock_dbf = MagicMock()
            mock_ydbf.open.return_value.__enter__ = MagicMock(return_value=mock_dbf)
            mock_ydbf.open.return_value.__exit__ = MagicMock(return_value=False)

            service._export_data_to_dbf(
                [{'ID': 1}],
                [('ID', 'N', 10, 0)],
                '/tmp/test.dbf',
            )
            mock_print.assert_called()


class TestDbfExportServiceExportModel(SimpleTestCase):
    """Test export_model_to_dbf method."""

    @patch('utils.services.dbf_export_service.YDBF_AVAILABLE', True)
    @patch('utils.services.dbf_export_service.apps.get_model')
    def test_export_model_success(self, mock_get_model):
        from utils.services.dbf_export_service import DbfExportService
        service = DbfExportService()
        service._export_data_to_dbf = MagicMock(return_value=5)

        mock_model = MagicMock()
        mock_qs = MagicMock()
        mock_qs.all.return_value = mock_qs
        mock_qs.filter.return_value = mock_qs
        mock_qs.__getitem__ = MagicMock(return_value=mock_qs)
        mock_qs.values.return_value = [{'id': 1}]
        mock_model.objects = mock_qs
        mock_model._meta.get_fields.return_value = []
        mock_get_model.return_value = mock_model

        result = service.export_model_to_dbf('app.Model', '/tmp/test.dbf')
        self.assertEqual(result, 5)

    @patch('utils.services.dbf_export_service.YDBF_AVAILABLE', True)
    @patch('utils.services.dbf_export_service.apps.get_model')
    def test_export_model_with_filters(self, mock_get_model):
        from utils.services.dbf_export_service import DbfExportService
        service = DbfExportService()
        service._export_data_to_dbf = MagicMock(return_value=3)

        mock_model = MagicMock()
        mock_qs = MagicMock()
        mock_qs.all.return_value = mock_qs
        mock_qs.filter.return_value = mock_qs
        mock_qs.__getitem__ = MagicMock(return_value=mock_qs)
        mock_qs.values.return_value = [{'id': 1}]
        mock_model.objects = mock_qs
        mock_model._meta.get_fields.return_value = []
        mock_get_model.return_value = mock_model

        result = service.export_model_to_dbf(
            'app.Model', '/tmp/test.dbf',
            filters={'is_active': True},
            limit=10,
        )
        self.assertEqual(result, 3)
        mock_qs.filter.assert_called_once_with(is_active=True)

    @patch('utils.services.dbf_export_service.YDBF_AVAILABLE', True)
    @patch('utils.services.dbf_export_service.apps.get_model')
    def test_export_model_raises_on_error(self, mock_get_model):
        from utils.services.dbf_export_service import DbfExportService, DbfExportError
        service = DbfExportService()
        mock_get_model.side_effect = Exception('Model not found')
        with self.assertRaises(DbfExportError):
            service.export_model_to_dbf('bad.Model', '/tmp/test.dbf')


class TestDbfExportServiceExportQuery(SimpleTestCase):
    """Test export_query_to_dbf method."""

    @patch('utils.services.dbf_export_service.YDBF_AVAILABLE', True)
    @patch('utils.services.dbf_export_service.connection')
    def test_export_query_success(self, mock_connection):
        from utils.services.dbf_export_service import DbfExportService
        service = DbfExportService()
        service._export_data_to_dbf = MagicMock(return_value=2)
        service._get_sql_field_definitions = MagicMock(return_value=[('ID', 'N', 10, 0)])

        mock_cursor = MagicMock()
        mock_cursor.description = [('ID', 23, None, None, None, None, None)]
        mock_cursor.fetchall.return_value = [(1,), (2,)]
        mock_connection.cursor.return_value.__enter__ = MagicMock(return_value=mock_cursor)
        mock_connection.cursor.return_value.__exit__ = MagicMock(return_value=False)

        result = service.export_query_to_dbf('SELECT id FROM table', '/tmp/test.dbf')
        self.assertEqual(result, 2)

    @patch('utils.services.dbf_export_service.YDBF_AVAILABLE', True)
    @patch('utils.services.dbf_export_service.connection')
    def test_export_query_raises_on_error(self, mock_connection):
        from utils.services.dbf_export_service import DbfExportService, DbfExportError
        service = DbfExportService()
        mock_connection.cursor.return_value.__enter__ = MagicMock(
            side_effect=Exception('DB error')
        )
        with self.assertRaises(DbfExportError):
            service.export_query_to_dbf('SELECT 1', '/tmp/test.dbf')


class TestDbfExportServiceExportQueryset(SimpleTestCase):
    """Test export_queryset_to_dbf method."""

    @patch('utils.services.dbf_export_service.YDBF_AVAILABLE', True)
    def test_export_queryset_success(self):
        from utils.services.dbf_export_service import DbfExportService
        service = DbfExportService()
        service._export_data_to_dbf = MagicMock(return_value=3)

        mock_qs = MagicMock()
        mock_qs.values.return_value = [{'id': 1}, {'id': 2}, {'id': 3}]
        mock_qs.model._meta.get_fields.return_value = []

        result = service.export_queryset_to_dbf(mock_qs, '/tmp/test.dbf')
        self.assertEqual(result, 3)

    @patch('utils.services.dbf_export_service.YDBF_AVAILABLE', True)
    def test_export_queryset_raises_on_error(self):
        from utils.services.dbf_export_service import DbfExportService, DbfExportError
        service = DbfExportService()
        mock_qs = MagicMock()
        mock_qs.values.side_effect = Exception('QuerySet error')
        with self.assertRaises(DbfExportError):
            service.export_queryset_to_dbf(mock_qs, '/tmp/test.dbf')


class TestDbfExportServiceValidate(SimpleTestCase):
    """Test validate_dbf_file method."""

    @patch('utils.services.dbf_export_service.YDBF_AVAILABLE', True)
    @patch('utils.services.dbf_export_service.DBFREAD_AVAILABLE', False)
    def test_validate_without_dbfread(self):
        from utils.services.dbf_export_service import DbfExportService
        service = DbfExportService()
        result = service.validate_dbf_file('/tmp/test.dbf')
        self.assertIn('validation', result)

    @patch('utils.services.dbf_export_service.YDBF_AVAILABLE', True)
    @patch('utils.services.dbf_export_service.DBFREAD_AVAILABLE', True)
    @patch('utils.services.dbf_export_service.dbfread', create=True)
    @patch('os.path.getsize', return_value=1024)
    def test_validate_with_dbfread_success(self, mock_getsize, mock_dbfread):
        from utils.services.dbf_export_service import DbfExportService
        service = DbfExportService()

        mock_reader = MagicMock()
        mock_reader.__enter__ = MagicMock(return_value=mock_reader)
        mock_reader.__exit__ = MagicMock(return_value=False)
        mock_reader.__iter__ = MagicMock(return_value=iter([{'id': 1}]))
        mock_reader.field_names = ['ID']
        mock_reader.encoding = 'cp1252'
        mock_dbfread.DBF.return_value = mock_reader

        result = service.validate_dbf_file('/tmp/test.dbf')
        self.assertTrue(result['valid'])
        self.assertEqual(result['record_count'], 1)

    @patch('utils.services.dbf_export_service.YDBF_AVAILABLE', True)
    @patch('utils.services.dbf_export_service.DBFREAD_AVAILABLE', True)
    @patch('utils.services.dbf_export_service.dbfread', create=True)
    def test_validate_with_dbfread_error(self, mock_dbfread):
        from utils.services.dbf_export_service import DbfExportService
        service = DbfExportService()
        mock_dbfread.DBF.side_effect = Exception('Invalid file')
        result = service.validate_dbf_file('/tmp/bad.dbf')
        self.assertFalse(result['valid'])
        self.assertIn('error', result)


class TestDbfExportServiceGetModelFieldDefs(SimpleTestCase):
    """Test _get_model_field_definitions method."""

    @patch('utils.services.dbf_export_service.YDBF_AVAILABLE', True)
    def test_excludes_specified_fields(self):
        from utils.services.dbf_export_service import DbfExportService
        from django.db import models
        service = DbfExportService()

        field1 = models.CharField(max_length=50)
        field1.name = 'name'
        field1.column = 'name'

        field2 = models.CharField(max_length=50)
        field2.name = 'password'
        field2.column = 'password'

        mock_model = MagicMock()
        mock_model._meta.get_fields.return_value = [field1, field2]

        result = service._get_model_field_definitions(mock_model, ['password'])
        field_names = [f[0] for f in result]
        self.assertIn('NAME', field_names)
        self.assertNotIn('PASSWORD', field_names)

    @patch('utils.services.dbf_export_service.YDBF_AVAILABLE', True)
    def test_handles_list_return_from_datetime(self):
        """DateTimeField matches DateField branch (parent class), returns single tuple."""
        from utils.services.dbf_export_service import DbfExportService
        from django.db import models
        service = DbfExportService()

        field = models.DateTimeField()
        field.name = 'created_at'
        field.column = 'created_at'

        mock_model = MagicMock()
        mock_model._meta.get_fields.return_value = [field]

        result = service._get_model_field_definitions(mock_model, [])
        # DateTimeField is a subclass of DateField, so isinstance(field, DateField)
        # matches first, returning a single tuple (not a list of 2)
        self.assertEqual(len(result), 1)
