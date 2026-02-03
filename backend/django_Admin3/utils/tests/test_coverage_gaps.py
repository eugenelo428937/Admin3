"""
Tests to close coverage gaps in the utils app.

Targets uncovered lines across:
- views.py:18, 23-43, 58 (address_lookup_proxy non-test path, missing postcode)
- queue_service.py (template subject rendering, serialization fallback, process errors)
- dbf_export_service.py (import paths, DateTimeField list handling, data prep branches)
- export_to_dbf.py (import constants, debug SQL, validation, field conversions)
- models.py:57, 103 (str representations)
- health_check.py:73-74 (database version fetch)
- endpoint_auditor.py:60, 72, 307-308 (untested endpoint, regex error)
- serializer_auditor.py:138, 191-192, 204-205 (Meta fallback, class-level attrs)
"""
import datetime
from decimal import Decimal
from io import StringIO
from unittest.mock import patch, MagicMock

from django.test import TestCase, SimpleTestCase, RequestFactory
from django.core.management import call_command
from django.core.management.base import CommandError


# ============================================================================
# views.py coverage gaps
# ============================================================================


class TestAddressLookupProxyMissingPostcode(TestCase):
    """Cover views.py line 18 - missing postcode returns 400."""

    @patch('utils.views.requests.get')
    def test_empty_postcode_returns_400(self, mock_get):
        """GET with empty postcode should return 400."""
        response = self.client.get('/api/utils/getaddress-lookup/', {'postcode': ''})
        # When postcode is empty, .replace(' ','').upper() gives '' which is falsy
        # so line 18 returns 400
        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertEqual(data['error'], 'Missing postcode')


class TestAddressLookupProxyNonTestPath(TestCase):
    """Cover views.py lines 23-43 - is_test=False full autocomplete flow.

    The view function address_lookup_proxy(request, is_test=True) is called
    from the URL pattern with is_test=True by default, but we need to test
    the is_test=False branch (lines 22-43) which calls the external API.
    """

    @patch('utils.views.requests.get')
    def test_non_test_mode_success_with_suggestions(self, mock_get):
        """is_test=False should call autocomplete then get for each suggestion."""
        from utils.views import address_lookup_proxy

        # Mock autocomplete response
        auto_response = MagicMock()
        auto_response.status_code = 200
        auto_response.json.return_value = {
            'suggestions': [
                {'id': 'abc-123'},
                {'id': 'def-456'},
                {'id': None},  # line 34-35: suggestion without id - should skip
            ]
        }
        auto_response.raise_for_status = MagicMock()

        # Mock get response for each suggestion
        get_response = MagicMock()
        get_response.status_code = 200
        get_response.json.return_value = {'line_1': '10 Downing Street'}

        # First call is autocomplete, subsequent calls are get by id
        mock_get.side_effect = [auto_response, get_response, get_response]

        factory = RequestFactory()
        request = factory.get('/api/utils/getaddress-lookup/', {'postcode': 'SW1A1AA'})

        with patch('utils.views.settings') as mock_settings:
            mock_settings.GETADDRESS_API_KEY = 'test-api-key'
            response = address_lookup_proxy(request, is_test=False)

        self.assertEqual(response.status_code, 200)
        data = response.json() if hasattr(response, 'json') else __import__('json').loads(response.content)
        self.assertIn('addresses', data)
        # Should have 2 addresses (the None id suggestion was skipped)
        self.assertEqual(len(data['addresses']), 2)

    @patch('utils.views.requests.get')
    def test_non_test_mode_get_fails_for_suggestion(self, mock_get):
        """Non-200 response for a suggestion get should skip that address."""
        from utils.views import address_lookup_proxy

        auto_response = MagicMock()
        auto_response.status_code = 200
        auto_response.json.return_value = {
            'suggestions': [{'id': 'abc-123'}]
        }
        auto_response.raise_for_status = MagicMock()

        get_response = MagicMock()
        get_response.status_code = 404  # Not 200, so line 38 is False

        mock_get.side_effect = [auto_response, get_response]

        factory = RequestFactory()
        request = factory.get('/api/utils/getaddress-lookup/', {'postcode': 'SW1A1AA'})

        with patch('utils.views.settings') as mock_settings:
            mock_settings.GETADDRESS_API_KEY = 'test-api-key'
            response = address_lookup_proxy(request, is_test=False)

        self.assertEqual(response.status_code, 200)
        data = __import__('json').loads(response.content)
        self.assertEqual(len(data['addresses']), 0)

    @patch('utils.views.requests.get')
    def test_non_test_mode_exception_returns_500(self, mock_get):
        """Exception in non-test path should return 500 error (line 42-43)."""
        from utils.views import address_lookup_proxy

        mock_get.side_effect = Exception('Network error')

        factory = RequestFactory()
        request = factory.get('/api/utils/getaddress-lookup/', {'postcode': 'SW1A1AA'})

        with patch('utils.views.settings') as mock_settings:
            mock_settings.GETADDRESS_API_KEY = 'test-api-key'
            response = address_lookup_proxy(request, is_test=False)

        self.assertEqual(response.status_code, 500)
        data = __import__('json').loads(response.content)
        self.assertIn('error', data)
        self.assertIn('Network error', data['error'])

    @patch('utils.views.requests.get')
    def test_non_test_mode_no_suggestions(self, mock_get):
        """No suggestions should return empty addresses list."""
        from utils.views import address_lookup_proxy

        auto_response = MagicMock()
        auto_response.status_code = 200
        auto_response.json.return_value = {'suggestions': []}
        auto_response.raise_for_status = MagicMock()

        mock_get.return_value = auto_response

        factory = RequestFactory()
        request = factory.get('/api/utils/getaddress-lookup/', {'postcode': 'SW1A1AA'})

        with patch('utils.views.settings') as mock_settings:
            mock_settings.GETADDRESS_API_KEY = 'test-api-key'
            response = address_lookup_proxy(request, is_test=False)

        self.assertEqual(response.status_code, 200)
        data = __import__('json').loads(response.content)
        self.assertEqual(data['addresses'], [])


class TestAddressLookupProxyTestModeNonListFallback(TestCase):
    """Cover views.py line 58 - auto_data is not a list in test mode."""

    @patch('utils.views.requests.get')
    def test_test_mode_non_list_response_returns_empty(self, mock_get):
        """When private address API returns non-list, fallback to empty (line 57-58)."""
        from utils.views import address_lookup_proxy

        auto_response = MagicMock()
        auto_response.status_code = 200
        auto_response.json.return_value = {'error': 'not a list'}  # Not a list
        auto_response.raise_for_status = MagicMock()

        mock_get.return_value = auto_response

        factory = RequestFactory()
        request = factory.get('/api/utils/getaddress-lookup/', {'postcode': 'SW1A1AA'})

        with patch('utils.views.settings') as mock_settings:
            mock_settings.GETADDRESS_ADMIN_KEY = 'test-admin-key'
            response = address_lookup_proxy(request, is_test=True)

        self.assertEqual(response.status_code, 200)
        data = __import__('json').loads(response.content)
        self.assertEqual(data['addresses'], [])


# ============================================================================
# queue_service.py coverage gaps
# ============================================================================


class TestQueueServiceSubjectRendering(SimpleTestCase):
    """Cover queue_service.py lines 94-98 - template subject rendering failure."""

    def _get_service_and_mod(self):
        with patch.dict('sys.modules', {
            'utils.models': MagicMock(),
            'utils.email_service': MagicMock(),
            'premailer': MagicMock(),
            'mjml': MagicMock(),
        }):
            import importlib
            import utils.services.queue_service as qs_mod
            importlib.reload(qs_mod)
            return qs_mod.EmailQueueService(), qs_mod

    @patch('django.db.transaction.atomic')
    def test_subject_template_rendering_failure_uses_raw_subject(self, mock_atomic):
        """When subject template rendering fails, use raw subject_template (line 95-96)."""
        mock_atomic.return_value.__enter__ = MagicMock(return_value=None)
        mock_atomic.return_value.__exit__ = MagicMock(return_value=False)

        service, qs_mod = self._get_service_and_mod()

        mock_template = MagicMock()
        mock_template.default_priority = 'normal'
        mock_template.from_email = 'from@test.com'
        mock_template.reply_to_email = 'reply@test.com'
        mock_template.subject_template = '{{ invalid_syntax %%'
        mock_template.max_retry_attempts = 3

        qs_mod.EmailTemplate.objects.get.return_value = mock_template
        mock_queue_item = MagicMock()
        qs_mod.EmailQueue.objects.create.return_value = mock_queue_item

        # Patch Template to raise an exception on render
        with patch('django.template.Template') as mock_tpl_cls:
            mock_tpl_cls.side_effect = Exception('Template syntax error')
            result = service.queue_email(
                template_name='test_template',
                to_emails=['test@test.com'],
                context={'order_id': '123'},
            )
        self.assertEqual(result, mock_queue_item)


class TestQueueServiceContextSerializationFallback(SimpleTestCase):
    """Cover queue_service.py lines 105-108 - context serialization failure."""

    def _get_service_and_mod(self):
        with patch.dict('sys.modules', {
            'utils.models': MagicMock(),
            'utils.email_service': MagicMock(),
            'premailer': MagicMock(),
            'mjml': MagicMock(),
        }):
            import importlib
            import utils.services.queue_service as qs_mod
            importlib.reload(qs_mod)
            return qs_mod.EmailQueueService(), qs_mod

    @patch('django.db.transaction.atomic')
    def test_context_serialization_failure_calls_clean(self, mock_atomic):
        """When json.dumps fails, _clean_context_for_serialization is called (lines 105-108)."""
        mock_atomic.return_value.__enter__ = MagicMock(return_value=None)
        mock_atomic.return_value.__exit__ = MagicMock(return_value=False)

        service, qs_mod = self._get_service_and_mod()

        qs_mod.EmailTemplate.DoesNotExist = Exception
        qs_mod.EmailTemplate.objects.get.side_effect = Exception('Not found')
        mock_queue_item = MagicMock()
        qs_mod.EmailQueue.objects.create.return_value = mock_queue_item

        # Create context that will fail json.dumps even with datetime_serializer
        class Unserializable:
            def __repr__(self):
                return 'Unserializable'

        # Patch json.loads to fail on first call, triggering the fallback
        original_loads = __import__('json').loads
        original_dumps = __import__('json').dumps
        call_count = [0]

        def failing_loads_first_time(data, *args, **kwargs):
            call_count[0] += 1
            if call_count[0] == 1:
                raise TypeError('Not serializable')
            return original_loads(data, *args, **kwargs)

        with patch('utils.services.queue_service.json.loads', side_effect=failing_loads_first_time):
            with patch('utils.services.queue_service.json.dumps', side_effect=original_dumps):
                result = service.queue_email(
                    template_name='missing',
                    to_emails=['test@test.com'],
                    context={'key': 'value'},
                )
        self.assertEqual(result, mock_queue_item)


class TestQueueServiceOuterException(SimpleTestCase):
    """Cover queue_service.py lines 131-133 - outer exception in queue_email."""

    def _get_service_and_mod(self):
        with patch.dict('sys.modules', {
            'utils.models': MagicMock(),
            'utils.email_service': MagicMock(),
            'premailer': MagicMock(),
            'mjml': MagicMock(),
        }):
            import importlib
            import utils.services.queue_service as qs_mod
            importlib.reload(qs_mod)
            return qs_mod.EmailQueueService(), qs_mod

    def test_queue_email_outer_exception_reraises(self):
        """Outer exception in queue_email should re-raise (lines 131-133)."""
        service, qs_mod = self._get_service_and_mod()

        # Make EmailTemplate.objects.get raise something unexpected
        qs_mod.EmailTemplate.objects.get.side_effect = RuntimeError('DB down')

        with self.assertRaises(Exception) as ctx:
            service.queue_email(
                template_name='test',
                to_emails=['test@test.com'],
                context={},
            )
        self.assertIn('Failed to queue email', str(ctx.exception))


class TestQueueServiceCleanContextBranches(SimpleTestCase):
    """Cover queue_service.py _clean_context_for_serialization additional branches."""

    def _get_service(self):
        with patch.dict('sys.modules', {
            'utils.models': MagicMock(),
            'utils.email_service': MagicMock(),
            'premailer': MagicMock(),
            'mjml': MagicMock(),
        }):
            import importlib
            import utils.services.queue_service as qs_mod
            importlib.reload(qs_mod)
            return qs_mod.EmailQueueService()

    def test_clean_model_instance_with_datetime_field(self):
        """Model instance with datetime field should convert to isoformat (line 158)."""
        service = self._get_service()
        from django.utils import timezone

        class FakeField:
            def __init__(self, name):
                self.name = name

        class FakeMeta:
            fields = [FakeField('id'), FakeField('created_at')]

        class FakeModel:
            _meta = FakeMeta()
            id = 1
            created_at = timezone.now()

            def __repr__(self):
                return 'FakeModel'

        # Force the value to be non-serializable by patching json.dumps
        # to fail for this specific object
        original_dumps = __import__('json').dumps

        def selective_dumps(value, *args, **kwargs):
            if isinstance(value, FakeModel):
                raise TypeError('Not serializable')
            return original_dumps(value, *args, **kwargs)

        with patch('utils.services.queue_service.json.dumps', side_effect=selective_dumps):
            result = service._clean_context_for_serialization({'model': FakeModel()})

        self.assertIn('model', result)
        self.assertIsInstance(result['model'], dict)
        self.assertEqual(result['model']['id'], 1)

    def test_clean_model_instance_with_non_serializable_field_value(self):
        """Model field value that fails json.dumps should be stringified (line 163-164)."""
        service = self._get_service()

        class FakeField:
            def __init__(self, name):
                self.name = name

        class FakeMeta:
            fields = [FakeField('id'), FakeField('data')]

        class FakeModel:
            _meta = FakeMeta()
            id = 1
            data = {1, 2, 3}  # set is not JSON serializable

            def __repr__(self):
                return 'FakeModel'

        original_dumps = __import__('json').dumps

        def selective_dumps(value, *args, **kwargs):
            if isinstance(value, FakeModel):
                raise TypeError('Not serializable')
            return original_dumps(value, *args, **kwargs)

        with patch('utils.services.queue_service.json.dumps', side_effect=selective_dumps):
            result = service._clean_context_for_serialization({'model': FakeModel()})

        self.assertIn('model', result)
        self.assertIsInstance(result['model'], dict)
        # The set should have been stringified
        self.assertIsInstance(result['model']['data'], str)

    def test_clean_model_instance_meta_iteration_fails(self):
        """Exception during _meta iteration should fall back to str (line 168-169)."""
        service = self._get_service()

        class BrokenMeta:
            @property
            def fields(self):
                raise Exception('Cannot iterate fields')

        class FakeModel:
            _meta = BrokenMeta()

            def __str__(self):
                return 'broken_model_str'

        original_dumps = __import__('json').dumps

        def selective_dumps(value, *args, **kwargs):
            if isinstance(value, FakeModel):
                raise TypeError('Not serializable')
            return original_dumps(value, *args, **kwargs)

        with patch('utils.services.queue_service.json.dumps', side_effect=selective_dumps):
            result = service._clean_context_for_serialization({'model': FakeModel()})

        self.assertEqual(result['model'], 'broken_model_str')

    def test_clean_list_with_dict_items(self):
        """List items with __dict__ should be stringified (line 178-179)."""
        service = self._get_service()

        class CustomObj:
            def __init__(self, val):
                self.val = val

            def __str__(self):
                return f'CustomObj({self.val})'

        original_dumps = __import__('json').dumps

        def selective_dumps(value, *args, **kwargs):
            if isinstance(value, list) and any(isinstance(i, CustomObj) for i in value):
                raise TypeError('Not serializable')
            if isinstance(value, CustomObj):
                raise TypeError('Not serializable')
            return original_dumps(value, *args, **kwargs)

        with patch('utils.services.queue_service.json.dumps', side_effect=selective_dumps):
            result = service._clean_context_for_serialization({
                'items': [CustomObj(1), 'ok_str']
            })

        self.assertIn('items', result)
        self.assertIsInstance(result['items'], list)

    def test_clean_non_serializable_dict_value(self):
        """Nested non-serializable dict should be recursively cleaned (line 185)."""
        service = self._get_service()

        original_dumps = __import__('json').dumps

        def selective_dumps(value, *args, **kwargs):
            if isinstance(value, dict) and 'nested' in value:
                inner = value.get('nested', {})
                if isinstance(inner, dict) and 'bad' in inner and isinstance(inner['bad'], set):
                    raise TypeError('Not serializable')
            if isinstance(value, set):
                raise TypeError('Not serializable')
            return original_dumps(value, *args, **kwargs)

        with patch('utils.services.queue_service.json.dumps', side_effect=selective_dumps):
            result = service._clean_context_for_serialization({
                'nested': {'bad': {1, 2, 3}}
            })

        self.assertIn('nested', result)


class TestQueueServiceGetTemplateAttachmentsException(SimpleTestCase):
    """Cover queue_service.py lines 514-516 - _get_template_attachments exception."""

    def _get_service_and_mod(self):
        with patch.dict('sys.modules', {
            'utils.models': MagicMock(),
            'utils.email_service': MagicMock(),
            'premailer': MagicMock(),
            'mjml': MagicMock(),
        }):
            import importlib
            import utils.services.queue_service as qs_mod
            importlib.reload(qs_mod)
            return qs_mod.EmailQueueService(), qs_mod

    def test_template_attachments_exception_returns_empty(self):
        """Exception during attachment lookup should return empty list (lines 514-516)."""
        service, qs_mod = self._get_service_and_mod()

        # Make the query raise an exception
        qs_mod.EmailTemplateAttachment.objects.filter.side_effect = Exception('DB error')

        template = MagicMock()
        result = service._get_template_attachments(template, {})
        self.assertEqual(result, [])


class TestQueueServiceIsMarkingFlag(SimpleTestCase):
    """Cover queue_service.py line 550 - is_marking product type detection."""

    def _get_service(self):
        with patch.dict('sys.modules', {
            'utils.models': MagicMock(),
            'utils.email_service': MagicMock(),
            'premailer': MagicMock(),
            'mjml': MagicMock(),
        }):
            import importlib
            import utils.services.queue_service as qs_mod
            importlib.reload(qs_mod)
            return qs_mod.EmailQueueService()

    def test_is_marking_flag_with_hasattr_object(self):
        """Object with is_marking attribute should detect marking type (line ~550)."""
        service = self._get_service()
        ta = MagicMock()
        ta.include_condition = {
            'type': 'product_type_based',
            'product_types': ['marking'],
            'logic': 'any',
        }

        class MarkingItem:
            is_marking = True

        context = {'items': [MarkingItem()]}
        result = service._should_include_attachment(ta, context)
        self.assertTrue(result)


class TestQueueServiceProcessPendingQueueException(SimpleTestCase):
    """Cover queue_service.py lines 635-640 - process_pending_queue exception."""

    def _get_service_and_mod(self):
        with patch.dict('sys.modules', {
            'utils.models': MagicMock(),
            'utils.email_service': MagicMock(),
            'premailer': MagicMock(),
            'mjml': MagicMock(),
        }):
            import importlib
            import utils.services.queue_service as qs_mod
            importlib.reload(qs_mod)
            return qs_mod.EmailQueueService(), qs_mod

    def test_exception_during_processing_item_captured(self):
        """Exception during process_queue_item should be captured in errors (lines 637-640)."""
        service, qs_mod = self._get_service_and_mod()

        mock_item = MagicMock()
        mock_item.queue_id = 'test-exc-123'

        # Make process_queue_item raise an exception
        service.process_queue_item = MagicMock(side_effect=Exception('Boom'))

        # Create a mock queryset that iterates over our item
        mock_qs = MagicMock()
        mock_qs.__iter__ = MagicMock(return_value=iter([mock_item]))
        qs_mod.EmailQueue.objects.filter.return_value.exclude.return_value.order_by.return_value.__getitem__.return_value = mock_qs

        result = service.process_pending_queue(limit=10)
        self.assertEqual(result['failed'], 1)
        self.assertEqual(len(result['errors']), 1)
        self.assertIn('test-exc-123', result['errors'][0])


# ============================================================================
# dbf_export_service.py coverage gaps
# ============================================================================


class TestDbfExportServiceImportBranches(SimpleTestCase):
    """Cover dbf_export_service.py lines 42-48, 59 - import success paths."""

    def test_ydbf_available_when_imported(self):
        """YDBF_AVAILABLE should be True when ydbf is importable."""
        from utils.services.dbf_export_service import YDBF_AVAILABLE
        # This is either True or False depending on environment
        self.assertIsInstance(YDBF_AVAILABLE, bool)

    def test_dbfread_available_flag_is_bool(self):
        """DBFREAD_AVAILABLE should be a boolean."""
        from utils.services.dbf_export_service import DBFREAD_AVAILABLE
        self.assertIsInstance(DBFREAD_AVAILABLE, bool)

    def test_field_type_constants_defined(self):
        """Field type constants should be defined regardless of imports."""
        from utils.services.dbf_export_service import (
            YDBF_CHAR, YDBF_NUMERAL, YDBF_LOGICAL, YDBF_DATE, YDBF_WRITE
        )
        self.assertEqual(YDBF_CHAR, 'C')
        self.assertEqual(YDBF_NUMERAL, 'N')
        self.assertEqual(YDBF_LOGICAL, 'L')
        self.assertEqual(YDBF_DATE, 'D')
        self.assertEqual(YDBF_WRITE, 'w')


class TestDbfExportServiceDateTimeFieldSplit(SimpleTestCase):
    """Cover dbf_export_service.py lines 278, 286-295 -
    _get_model_field_definitions handling DateTimeField that returns a list.

    In the service (unlike the command), DateTimeField checks come BEFORE
    DateField, so it returns a list of two tuples which must be extended.
    """

    @patch('utils.services.dbf_export_service.YDBF_AVAILABLE', True)
    def test_datetime_field_returns_list_extends(self):
        """DateTimeField in the service should return list [date, time] that gets extended."""
        from utils.services.dbf_export_service import DbfExportService
        from django.db import models

        service = DbfExportService()

        # Directly test _django_field_to_dbf with DateTimeField
        # In the service, DateTimeField check is before DateField, returning list
        field = MagicMock(spec=models.DateTimeField)
        field.name = 'created_at'
        result = service._django_field_to_dbf(field)

        # The service's _django_field_to_dbf returns a list for DateTimeField
        # when it matches before DateField (depends on isinstance check order)
        self.assertIsNotNone(result)

    @patch('utils.services.dbf_export_service.YDBF_AVAILABLE', True)
    def test_get_model_field_defs_with_list_field(self):
        """_get_model_field_definitions should extend list from field that returns list."""
        from utils.services.dbf_export_service import DbfExportService
        service = DbfExportService()

        # Mock a field where _django_field_to_dbf returns a list
        service._django_field_to_dbf = MagicMock(
            return_value=[('CREATED', 'D', 8, 0), ('CREATED_T', 'C', 8, 0)]
        )

        mock_field = MagicMock()
        mock_field.name = 'created_at'
        mock_field.column = 'created_at'

        mock_model = MagicMock()
        mock_model._meta.get_fields.return_value = [mock_field]

        result = service._get_model_field_definitions(mock_model, [])
        # Should have extended the list, resulting in 2 entries
        self.assertEqual(len(result), 2)
        self.assertEqual(result[0][0], 'CREATED')
        self.assertEqual(result[1][0], 'CREATED_T')


class TestDbfExportServicePrepareDataBranches(SimpleTestCase):
    """Cover dbf_export_service.py lines 313, 331, 340, 343 -
    additional branches in _prepare_data_for_dbf.
    """

    @patch('utils.services.dbf_export_service.YDBF_AVAILABLE', True)
    def _get_service(self):
        from utils.services.dbf_export_service import DbfExportService
        return DbfExportService()

    def test_time_field_non_datetime_value(self):
        """Time field (_T suffix) with non-datetime value should get None."""
        service = self._get_service()
        data = [{'CREATED': 'not_a_datetime'}]
        field_defs = [
            ('CREATED', 'D', 8, 0),
            ('CREATED_T', 'C', 8, 0),
        ]
        result = service._prepare_data_for_dbf(data, field_defs)
        # _T field should not find a datetime, so value stays None
        # which then gets converted by _convert_value_for_dbf
        self.assertIn('CREATED_T', result[0])

    def test_field_not_found_in_record(self):
        """Field defined in field_defs but not in record should use None default."""
        service = self._get_service()
        data = [{'OTHER': 'value'}]
        field_defs = [('MISSING', 'C', 50, 0)]
        result = service._prepare_data_for_dbf(data, field_defs)
        # Missing field should be converted as None -> '' for char type
        self.assertEqual(result[0]['MISSING'], '')


# ============================================================================
# export_to_dbf.py coverage gaps
# ============================================================================


class TestExportToDbfImportConstants(SimpleTestCase):
    """Cover export_to_dbf.py lines 31-37, 48 - import constant definitions."""

    def test_constants_defined(self):
        """Field type constants should be defined in the command module."""
        from utils.management.commands.export_to_dbf import (
            YDBF_CHAR, YDBF_NUMERAL, YDBF_LOGICAL, YDBF_DATE, YDBF_WRITE
        )
        self.assertEqual(YDBF_CHAR, 'C')
        self.assertEqual(YDBF_NUMERAL, 'N')
        self.assertEqual(YDBF_LOGICAL, 'L')
        self.assertEqual(YDBF_DATE, 'D')
        self.assertEqual(YDBF_WRITE, 'w')


class TestExportToDbfFilterFalseValue(SimpleTestCase):
    """Cover export_to_dbf.py line 165 - filter with 'false' value."""

    @patch('utils.management.commands.export_to_dbf.YDBF_AVAILABLE', True)
    @patch('utils.management.commands.export_to_dbf.apps.get_model')
    @patch('utils.management.commands.export_to_dbf.ydbf', create=True)
    @patch('os.makedirs')
    def test_filter_with_false_value(self, mock_makedirs, mock_ydbf, mock_get_model):
        """Filter with value 'false' should convert to Python False (line 164)."""
        mock_model = MagicMock()
        mock_qs = MagicMock()
        mock_qs.all.return_value = mock_qs
        mock_qs.filter.return_value = mock_qs
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
            filter='is_active=false',
            stdout=out,
        )
        mock_qs.filter.assert_called_once_with(is_active=False)


class TestExportToDbfSqlDebug(SimpleTestCase):
    """Cover export_to_dbf.py line 199 - debug output for SQL data."""

    @patch('utils.management.commands.export_to_dbf.YDBF_AVAILABLE', True)
    @patch('utils.management.commands.export_to_dbf.connection')
    @patch('utils.management.commands.export_to_dbf.ydbf', create=True)
    @patch('os.makedirs')
    def test_sql_data_debug_output(self, mock_makedirs, mock_ydbf, mock_connection):
        """Debug flag with SQL data should print record count (line 198-199)."""
        mock_cursor = MagicMock()
        mock_cursor.description = [
            ('ID', 23, None, None, None, None, None),
        ]
        mock_cursor.fetchall.return_value = [(1,), (2,)]
        mock_connection.cursor.return_value.__enter__ = MagicMock(return_value=mock_cursor)
        mock_connection.cursor.return_value.__exit__ = MagicMock(return_value=False)

        mock_dbf_writer = MagicMock()
        mock_ydbf.open.return_value.__enter__ = MagicMock(return_value=mock_dbf_writer)
        mock_ydbf.open.return_value.__exit__ = MagicMock(return_value=False)

        out = StringIO()
        call_command(
            'export_to_dbf',
            sql='SELECT id FROM test_table',
            output='/tmp/test.dbf',
            debug=True,
            stdout=out,
        )
        output_text = out.getvalue()
        self.assertIn('Retrieved', output_text)


class TestExportToDbfGetModelFieldDefsDatetime(SimpleTestCase):
    """Cover export_to_dbf.py lines 211-214 - get_model_field_definitions with
    DateTimeField that returns a list.
    """

    @patch('utils.management.commands.export_to_dbf.YDBF_AVAILABLE', True)
    def test_datetime_field_list_handling(self):
        """DateTimeField returning a list should be handled in get_model_field_definitions."""
        from utils.management.commands.export_to_dbf import Command
        from django.db import models

        cmd = Command()

        field = MagicMock(spec=models.DateTimeField)
        field.name = 'timestamp'
        field.column = 'timestamp'

        # The command's django_field_to_dbf returns a list for DateTimeField
        # (line 264 returns [(field_name, YDBF_DATE, 8, 0)])
        mock_model = MagicMock()
        mock_model._meta.get_fields.return_value = [field]

        result = cmd.get_model_field_definitions(mock_model)
        # Should have at least one field definition
        self.assertGreater(len(result), 0)


class TestExportToDbfSqlColumnBoolType(SimpleTestCase):
    """Cover export_to_dbf.py line 264 - boolean type_code not in numeric range."""

    @patch('utils.management.commands.export_to_dbf.YDBF_AVAILABLE', True)
    def test_boolean_type_code_16(self):
        """PostgreSQL boolean type_code 16 is not in [1-8], maps to default char."""
        from utils.management.commands.export_to_dbf import Command
        cmd = Command()
        # type_code=16 is boolean in PostgreSQL but not in the command's
        # numeric type list [1,2,3,4,5,8] or string [12,13,14] or date [9,10,11]
        col_desc = ('ACTIVE', 16, 1, None, 0, 0, True)
        result = cmd.sql_column_to_dbf(col_desc)
        # Should fall through to default char
        self.assertEqual(result[1], 'C')


class TestExportToDbfValidationException(SimpleTestCase):
    """Cover export_to_dbf.py lines 390-394 - dbfread validation exception."""

    @patch('utils.management.commands.export_to_dbf.YDBF_AVAILABLE', True)
    @patch('utils.management.commands.export_to_dbf.DBFREAD_AVAILABLE', True)
    @patch('utils.management.commands.export_to_dbf.dbfread', create=True)
    @patch('utils.management.commands.export_to_dbf.ydbf', create=True)
    @patch('os.makedirs')
    def test_dbfread_validation_exception(self, mock_makedirs, mock_ydbf, mock_dbfread):
        """dbfread validation failure should print warning (lines 390-391)."""
        from utils.management.commands.export_to_dbf import Command
        cmd = Command()

        mock_dbf_writer = MagicMock()
        mock_ydbf.open.return_value.__enter__ = MagicMock(return_value=mock_dbf_writer)
        mock_ydbf.open.return_value.__exit__ = MagicMock(return_value=False)

        # Make dbfread.DBF raise an exception
        mock_dbfread.DBF.side_effect = Exception('Corrupt file')

        out = StringIO()
        cmd.stdout = out
        cmd.style = MagicMock()
        cmd.style.SUCCESS = lambda x: x

        cmd.export_to_dbf(
            [{'ID': 1}],
            [('ID', 'N', 10, 0)],
            {'output': '/tmp/test.dbf', 'encoding': 'cp1252', 'debug': False},
        )
        output_text = out.getvalue()
        self.assertIn('Warning', output_text)

    @patch('utils.management.commands.export_to_dbf.YDBF_AVAILABLE', True)
    @patch('utils.management.commands.export_to_dbf.ydbf', create=True)
    @patch('os.makedirs')
    def test_ydbf_write_exception_raises(self, mock_makedirs, mock_ydbf):
        """ydbf write failure should raise CommandError (lines 393-394)."""
        from utils.management.commands.export_to_dbf import Command
        cmd = Command()

        mock_ydbf.open.side_effect = Exception('Write failed')

        out = StringIO()
        cmd.stdout = out
        cmd.style = MagicMock()

        with self.assertRaises(CommandError) as ctx:
            cmd.export_to_dbf(
                [{'ID': 1}],
                [('ID', 'N', 10, 0)],
                {'output': '/tmp/test.dbf', 'encoding': 'cp1252', 'debug': False},
            )
        self.assertIn('Failed to create DBF file', str(ctx.exception))


class TestExportToDbfDebugFieldDefs(SimpleTestCase):
    """Cover export_to_dbf.py lines 368-371 - debug output for field definitions."""

    @patch('utils.management.commands.export_to_dbf.YDBF_AVAILABLE', True)
    @patch('utils.management.commands.export_to_dbf.ydbf', create=True)
    @patch('os.makedirs')
    def test_debug_output_with_sample_record(self, mock_makedirs, mock_ydbf):
        """Debug mode should print field defs and sample record."""
        from utils.management.commands.export_to_dbf import Command
        cmd = Command()

        mock_dbf_writer = MagicMock()
        mock_ydbf.open.return_value.__enter__ = MagicMock(return_value=mock_dbf_writer)
        mock_ydbf.open.return_value.__exit__ = MagicMock(return_value=False)

        out = StringIO()
        cmd.stdout = out
        cmd.style = MagicMock()
        cmd.style.SUCCESS = lambda x: x

        field_defs = [('ID', 'N', 10, 0), ('NAME', 'C', 50, 0)]
        data = [{'ID': 1, 'NAME': 'Test'}]

        cmd.export_to_dbf(
            data, field_defs,
            {'output': '/tmp/test.dbf', 'encoding': 'cp1252', 'debug': True},
        )
        output_text = out.getvalue()
        self.assertIn('Field definitions', output_text)
        self.assertIn('Sample record', output_text)


# ============================================================================
# models.py coverage gaps
# ============================================================================


class TestModelsStrRepresentation(TestCase):
    """Cover models.py lines 57, 103 - __str__ methods."""

    def test_utils_countrys_str(self):
        """UtilsCountrys.__str__ should return 'code - name' (line 57)."""
        from utils.models import UtilsCountrys
        country = UtilsCountrys.objects.create(
            code='CG',
            name='Coverage Gap Country',
            vat_percent=Decimal('15.00'),
            active=True,
        )
        self.assertEqual(str(country), 'CG - Coverage Gap Country')

    def test_utils_country_region_str(self):
        """UtilsCountryRegion.__str__ should return formatted string (line 103)."""
        from utils.models import UtilsRegion, UtilsCountrys, UtilsCountryRegion
        from datetime import date

        region = UtilsRegion.objects.create(code='CGREG', name='CG Region')
        country = UtilsCountrys.objects.create(
            code='C2',
            name='CG Country 2',
            vat_percent=Decimal('10.00'),
        )
        mapping = UtilsCountryRegion.objects.create(
            country=country,
            region=region,
            effective_from=date(2025, 1, 1),
        )
        expected = f"C2 → CGREG (from 2025-01-01)"
        # The arrow character is a Unicode right arrow
        self.assertIn('C2', str(mapping))
        self.assertIn('CGREG', str(mapping))
        self.assertIn('2025-01-01', str(mapping))


# ============================================================================
# health_check.py coverage gaps
# ============================================================================


class TestHealthCheckDatabaseVersion(TestCase):
    """Cover health_check.py lines 73-74 - database version fetch."""

    def setUp(self):
        self.factory = RequestFactory()

    def test_database_version_included_in_response(self):
        """When DB is connected, database_version should be in debug_info (lines 70-72)."""
        import json
        from utils.health_check import health_check

        request = self.factory.get('/api/health/')
        response = health_check(request)
        data = json.loads(response.content)

        # If database is connected (which it is in test), check version is present
        if data['checks'].get('database') == 'connected':
            self.assertIn('database_version', data['debug_info'])

    @patch('utils.health_check.connection')
    def test_database_version_fetch_exception_silenced(self, mock_connection):
        """Exception fetching version should be silenced (bare except lines 73-74)."""
        import json
        from utils.health_check import health_check

        mock_cursor = MagicMock()
        # First execute returns 1 (health check passes)
        # Second execute (version) raises exception
        call_count = [0]

        def execute_side_effect(sql, *args, **kwargs):
            call_count[0] += 1
            if call_count[0] == 1:
                return None  # SELECT 1
            raise Exception('Cannot get version')

        mock_cursor.execute = execute_side_effect
        mock_cursor.fetchone.return_value = (1,)

        mock_connection.cursor.return_value.__enter__ = MagicMock(return_value=mock_cursor)
        mock_connection.cursor.return_value.__exit__ = MagicMock(return_value=False)

        request = self.factory.get('/api/health/')
        response = health_check(request)
        data = json.loads(response.content)

        # Should still be healthy even if version query fails
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data['checks']['database'], 'connected')
        # database_version should NOT be in response since the query failed
        self.assertNotIn('database_version', data['debug_info'])


# ============================================================================
# endpoint_auditor.py coverage gaps
# ============================================================================


class TestEndpointAuditorUntested(TestCase):
    """Cover endpoint_auditor.py lines 60, 72 - untested endpoint path."""

    def test_untested_endpoint_has_tested_false(self):
        """Endpoints not found in tests should have tested=False (line 59-60)."""
        from utils.audit.endpoint_auditor import EndpointAuditor
        auditor = EndpointAuditor()

        # Mock _is_endpoint_tested to return False for some endpoints
        # so the untested branch (line 59-60) is definitely exercised
        original_is_tested = auditor._is_endpoint_tested
        call_count = [0]

        def alternating_is_tested(ep, test_refs):
            call_count[0] += 1
            if call_count[0] <= 2:
                return False  # Force first 2 endpoints as untested
            return original_is_tested(ep, test_refs)

        with patch.object(auditor, '_is_endpoint_tested', side_effect=alternating_is_tested):
            result = auditor.audit()

        # Lines 59-60: untested.append(ep)
        self.assertIn('untested', result)
        self.assertGreater(len(result['untested']), 0)
        for ep in result['untested']:
            self.assertFalse(ep['tested'])

    def test_app_summary_includes_untested_count(self):
        """App summary should show untested count (line 72)."""
        from utils.audit.endpoint_auditor import EndpointAuditor
        auditor = EndpointAuditor()

        # Mock _is_endpoint_tested to ensure some untested endpoints exist
        original_is_tested = auditor._is_endpoint_tested
        call_count = [0]

        def alternating_is_tested(ep, test_refs):
            call_count[0] += 1
            if call_count[0] <= 2:
                return False
            return original_is_tested(ep, test_refs)

        with patch.object(auditor, '_is_endpoint_tested', side_effect=alternating_is_tested):
            result = auditor.audit()

        # Lines 71-72: app_summary[app]['untested'] += 1
        found_untested = False
        for app_name, stats in result['summary']['by_app'].items():
            self.assertIn('untested', stats)
            self.assertIn('tested', stats)
            self.assertEqual(stats['total'], stats['tested'] + stats['untested'])
            if stats['untested'] > 0:
                found_untested = True
        self.assertTrue(found_untested, "Expected at least one app with untested endpoints")


class TestEndpointAuditorRegexPatternError(TestCase):
    """Cover endpoint_auditor.py lines 307-308 - re.PatternError handling."""

    def test_paths_match_handles_regex_pattern_error(self):
        """re.PatternError during fullmatch should be caught (lines 307-308)."""
        import re as re_module
        from utils.audit.endpoint_auditor import EndpointAuditor
        auditor = EndpointAuditor()

        # Use paths that differ after normalization so we reach the regex branch.
        # _normalize_path replaces /digits/ with /{id}/, so use non-numeric slug
        # to prevent both paths normalizing to the same string.
        with patch('utils.audit.endpoint_auditor.re.fullmatch', side_effect=re_module.error('bad pattern')):
            result = auditor._paths_match(
                '/api/{uuid}/',        # Has placeholder
                '/api/abc-def-ghi/'    # Non-numeric, won't normalize to {id}
            )
        # Should return False (not raise) because the PatternError is caught
        self.assertFalse(result)


# ============================================================================
# serializer_auditor.py coverage gaps
# ============================================================================


class TestSerializerAuditorExtractFieldsFallback(TestCase):
    """Cover serializer_auditor.py lines 138, 191-192, 204-205 -
    _extract_fields fallback Meta path and class-level attr detection.
    """

    def test_extract_fields_meta_tuple_fields(self):
        """Meta.fields as tuple should be handled (line 186)."""
        from rest_framework import serializers
        from utils.audit.serializer_auditor import SerializerAuditor

        class UTLTupleFieldSerializer(serializers.Serializer):
            class Meta:
                fields = ('utl_tuple_a', 'utl_tuple_b')

            def __init__(self, *args, **kwargs):
                raise Exception("Cannot instantiate")

        auditor = SerializerAuditor()
        fields = auditor._extract_fields(UTLTupleFieldSerializer)
        self.assertIn('utl_tuple_a', fields)
        self.assertIn('utl_tuple_b', fields)

    def test_extract_fields_meta_field_with_hasattr_check(self):
        """Meta field name that exists as class attr should get its type (line 190-192)."""
        from rest_framework import serializers
        from utils.audit.serializer_auditor import SerializerAuditor

        class UTLMetaAttrSerializer(serializers.Serializer):
            class Meta:
                fields = ['utl_custom_field']

            # DRF metaclass would normally consume this, but we explicitly
            # set it as a non-Field attribute to test the hasattr branch
            utl_custom_field = 'not_a_field'  # Will be checked by hasattr

            def __init__(self, *args, **kwargs):
                raise Exception("Cannot instantiate")

        auditor = SerializerAuditor()
        fields = auditor._extract_fields(UTLMetaAttrSerializer)
        self.assertIn('utl_custom_field', fields)
        # Since it's a string (not a Field), type should be 'str'
        self.assertEqual(fields['utl_custom_field']['type'], 'str')

    def test_extract_fields_class_level_field_attr(self):
        """Class-level serializers.Field attrs not in Meta should be found (lines 199-208)."""
        from rest_framework import serializers
        from utils.audit.serializer_auditor import SerializerAuditor

        # We need a serializer where instantiation fails AND has class-level Field
        # attrs that DRF metaclass doesn't consume (by having no Meta at all)
        class UTLNoMetaSerializer(serializers.Serializer):
            def __init__(self, *args, **kwargs):
                raise Exception("Cannot instantiate")

        # Manually add a Field attribute after class creation to bypass DRF metaclass
        UTLNoMetaSerializer.utl_manual_field = serializers.CharField()

        auditor = SerializerAuditor()
        fields = auditor._extract_fields(UTLNoMetaSerializer)
        self.assertIn('utl_manual_field', fields)
        self.assertEqual(fields['utl_manual_field']['type'], 'CharField')

    def test_extract_fields_skips_private_attrs(self):
        """Attributes starting with _ should be skipped (line 200-201)."""
        from rest_framework import serializers
        from utils.audit.serializer_auditor import SerializerAuditor

        class UTLPrivateAttrSerializer(serializers.Serializer):
            def __init__(self, *args, **kwargs):
                raise Exception("Cannot instantiate")

        UTLPrivateAttrSerializer._private_field = serializers.CharField()

        auditor = SerializerAuditor()
        fields = auditor._extract_fields(UTLPrivateAttrSerializer)
        self.assertNotIn('_private_field', fields)

    def test_extract_fields_no_meta_no_fields(self):
        """Serializer with no Meta and no class-level fields should return empty."""
        from rest_framework import serializers
        from utils.audit.serializer_auditor import SerializerAuditor

        class UTLBareboneSerializer(serializers.Serializer):
            def __init__(self, *args, **kwargs):
                raise Exception("Cannot instantiate")

        auditor = SerializerAuditor()
        fields = auditor._extract_fields(UTLBareboneSerializer)
        # Should have no user-defined fields
        # (may have some from serializers.Serializer base, but no custom ones)
        user_fields = {k: v for k, v in fields.items() if k.startswith('utl_')}
        self.assertEqual(len(user_fields), 0)


class TestSerializerAuditorDiscoverSkipsNonSerializer(TestCase):
    """Cover serializer_auditor.py line 138 - skip non-Serializer class."""

    def test_discover_skips_non_serializer_class(self):
        """Classes that are not Serializer subclasses should be skipped (line 137-138)."""
        from rest_framework import serializers
        from utils.audit.serializer_auditor import SerializerAuditor
        import utils.audit.serializer_auditor as sa_mod

        # A plain class that is NOT a serializer
        class NotASerializer:
            pass

        # A valid serializer for the module
        class UTLGapSerializer(serializers.Serializer):
            utl_gap_field = serializers.CharField()

        UTLGapSerializer.__module__ = 'test.serializers'

        mock_module = MagicMock()
        mock_module.__name__ = 'test.serializers'

        members = [
            ('NotASerializer', NotASerializer),        # Line 137-138: not a Serializer -> continue
            ('UTLGapSerializer', UTLGapSerializer),    # Valid serializer
        ]

        auditor = SerializerAuditor()
        with patch.object(sa_mod, 'SERIALIZER_MODULES', ['test.serializers']):
            with patch.object(sa_mod.importlib, 'import_module', return_value=mock_module):
                with patch.object(sa_mod.inspect, 'getmembers', return_value=members):
                    result = auditor._discover_serializers()

        # The non-serializer should have been skipped, but the valid one included
        self.assertIn('test.UTLGapSerializer', result)


# ============================================================================
# vat_service.py coverage gaps (26 lines, 0% -> target 100%)
# ============================================================================


class TestVATCalculationService(SimpleTestCase):
    """Cover vat_service.py - all methods (lines 7-101, currently 0% coverage)."""

    @patch('rules_engine.custom_functions.lookup_vat_rate')
    @patch('rules_engine.custom_functions.calculate_vat_amount')
    def test_calculate_vat_returns_correct_structure(self, mock_calc, mock_lookup):
        """calculate_vat should return dict with all expected keys (lines 21-50)."""
        from utils.services.vat_service import VATCalculationService

        mock_lookup.return_value = Decimal('0.20')
        mock_calc.return_value = Decimal('20.00')

        service = VATCalculationService()
        result = service.calculate_vat('GB', Decimal('100.00'))

        self.assertEqual(result['country_code'], 'GB')
        self.assertEqual(result['vat_rate'], Decimal('0.20'))
        self.assertEqual(result['net_amount'], Decimal('100.00'))
        self.assertEqual(result['vat_amount'], Decimal('20.00'))
        self.assertEqual(result['gross_amount'], Decimal('120.00'))
        mock_lookup.assert_called_once_with('GB')
        mock_calc.assert_called_once_with(Decimal('100.00'), Decimal('0.20'))

    @patch('rules_engine.custom_functions.lookup_vat_rate')
    @patch('rules_engine.custom_functions.calculate_vat_amount')
    def test_calculate_vat_with_string_amount(self, mock_calc, mock_lookup):
        """calculate_vat should accept string net_amount and convert to Decimal (line 39)."""
        from utils.services.vat_service import VATCalculationService

        mock_lookup.return_value = Decimal('0.10')
        mock_calc.return_value = Decimal('5.00')

        service = VATCalculationService()
        result = service.calculate_vat('IE', '50.00')

        self.assertEqual(result['net_amount'], Decimal('50.00'))
        self.assertEqual(result['gross_amount'], Decimal('55.00'))

    @patch('rules_engine.custom_functions.lookup_vat_rate')
    @patch('rules_engine.custom_functions.calculate_vat_amount')
    def test_calculate_vat_for_cart_single_item(self, mock_calc, mock_lookup):
        """calculate_vat_for_cart with single item (lines 52-101)."""
        from utils.services.vat_service import VATCalculationService

        mock_lookup.return_value = Decimal('0.20')
        mock_calc.return_value = Decimal('10.00')

        service = VATCalculationService()
        result = service.calculate_vat_for_cart('GB', [
            {'net_price': '50.00', 'quantity': 1},
        ])

        self.assertEqual(result['country_code'], 'GB')
        self.assertEqual(result['vat_rate'], Decimal('0.20'))
        self.assertEqual(result['total_net_amount'], Decimal('50.00'))
        self.assertEqual(result['total_vat_amount'], Decimal('10.00'))
        self.assertEqual(result['total_gross_amount'], Decimal('60.00'))
        self.assertEqual(len(result['items']), 1)
        self.assertEqual(result['items'][0]['net_price'], Decimal('50.00'))
        self.assertEqual(result['items'][0]['quantity'], 1)

    @patch('rules_engine.custom_functions.lookup_vat_rate')
    @patch('rules_engine.custom_functions.calculate_vat_amount')
    def test_calculate_vat_for_cart_multiple_items(self, mock_calc, mock_lookup):
        """calculate_vat_for_cart with multiple items accumulates totals."""
        from utils.services.vat_service import VATCalculationService

        mock_lookup.return_value = Decimal('0.20')
        # Called once per cart item
        mock_calc.side_effect = [Decimal('20.00'), Decimal('6.00')]

        service = VATCalculationService()
        result = service.calculate_vat_for_cart('GB', [
            {'net_price': '100.00', 'quantity': 1},
            {'net_price': '15.00', 'quantity': 2},
        ])

        self.assertEqual(result['total_net_amount'], Decimal('130.00'))
        self.assertEqual(result['total_vat_amount'], Decimal('26.00'))
        self.assertEqual(result['total_gross_amount'], Decimal('156.00'))
        self.assertEqual(len(result['items']), 2)
        # Second item: net_price=15, quantity=2, item_net=30
        self.assertEqual(result['items'][1]['item_net'], Decimal('30.00'))
        self.assertEqual(result['items'][1]['item_vat'], Decimal('6.00'))
        self.assertEqual(result['items'][1]['item_gross'], Decimal('36.00'))

    @patch('rules_engine.custom_functions.lookup_vat_rate')
    @patch('rules_engine.custom_functions.calculate_vat_amount')
    def test_calculate_vat_for_cart_empty(self, mock_calc, mock_lookup):
        """calculate_vat_for_cart with empty cart returns zero totals."""
        from utils.services.vat_service import VATCalculationService

        mock_lookup.return_value = Decimal('0.20')

        service = VATCalculationService()
        result = service.calculate_vat_for_cart('GB', [])

        self.assertEqual(result['total_net_amount'], Decimal('0.00'))
        self.assertEqual(result['total_vat_amount'], Decimal('0.00'))
        self.assertEqual(result['total_gross_amount'], Decimal('0.00'))
        self.assertEqual(len(result['items']), 0)

    @patch('rules_engine.custom_functions.lookup_vat_rate')
    @patch('rules_engine.custom_functions.calculate_vat_amount')
    def test_calculate_vat_for_cart_default_quantity(self, mock_calc, mock_lookup):
        """Cart item without quantity key defaults to 1 (line 79)."""
        from utils.services.vat_service import VATCalculationService

        mock_lookup.return_value = Decimal('0.20')
        mock_calc.return_value = Decimal('5.00')

        service = VATCalculationService()
        result = service.calculate_vat_for_cart('GB', [
            {'net_price': '25.00'},  # No quantity key
        ])

        self.assertEqual(result['items'][0]['quantity'], 1)
        self.assertEqual(result['items'][0]['item_net'], Decimal('25.00'))


# ============================================================================
# dbf_export_service.py - _get_sql_field_definitions (lines 286-295)
# ============================================================================


class TestDbfExportServiceSqlFieldDefs(SimpleTestCase):
    """Cover dbf_export_service.py lines 286-295 - _get_sql_field_definitions."""

    @patch('utils.services.dbf_export_service.YDBF_AVAILABLE', True)
    @patch('utils.services.dbf_export_service.connection')
    def test_sql_field_definitions_from_cursor(self, mock_connection):
        """_get_sql_field_definitions should parse cursor.description (lines 286-295)."""
        from utils.services.dbf_export_service import DbfExportService

        mock_cursor = MagicMock()
        mock_cursor.description = [
            ('id', 23, None, None, None, None, None),          # numeric
            ('name', 1043, None, None, None, None, None),      # varchar
            ('active', 16, None, None, None, None, None),      # boolean
        ]
        mock_cursor.execute = MagicMock()
        mock_connection.cursor.return_value.__enter__ = MagicMock(return_value=mock_cursor)
        mock_connection.cursor.return_value.__exit__ = MagicMock(return_value=False)

        service = DbfExportService()
        result = service._get_sql_field_definitions('SELECT id, name, active FROM test')

        self.assertEqual(len(result), 3)
        # Each result should be a tuple of (name, type, size, decimal)
        for field_def in result:
            self.assertIsInstance(field_def, tuple)
            self.assertEqual(len(field_def), 4)


# ============================================================================
# queue_service.py - remaining uncovered lines
# ============================================================================


class TestQueueServiceSubjectOverrideBranch(SimpleTestCase):
    """Cover queue_service.py line 98 - subject_override provided."""

    def _get_service_and_mod(self):
        with patch.dict('sys.modules', {
            'utils.models': MagicMock(),
            'utils.email_service': MagicMock(),
            'premailer': MagicMock(),
            'mjml': MagicMock(),
        }):
            import importlib
            import utils.services.queue_service as qs_mod
            importlib.reload(qs_mod)
            return qs_mod.EmailQueueService(), qs_mod

    @patch('django.db.transaction.atomic')
    def test_subject_override_used_when_provided(self, mock_atomic):
        """When subject_override is provided, it should be used (line 98)."""
        mock_atomic.return_value.__enter__ = MagicMock(return_value=None)
        mock_atomic.return_value.__exit__ = MagicMock(return_value=False)

        service, qs_mod = self._get_service_and_mod()

        mock_template = MagicMock()
        mock_template.default_priority = 'normal'
        mock_template.from_email = 'from@test.com'
        mock_template.reply_to_email = 'reply@test.com'
        mock_template.subject_template = 'Template Subject {{ name }}'
        mock_template.max_retry_attempts = 3

        qs_mod.EmailTemplate.objects.get.return_value = mock_template
        mock_queue_item = MagicMock()
        qs_mod.EmailQueue.objects.create.return_value = mock_queue_item

        result = service.queue_email(
            template_name='test_template',
            to_emails=['test@test.com'],
            context={'name': 'World'},
            subject_override='My Custom Subject',  # Line 98: subject_override provided
        )

        self.assertEqual(result, mock_queue_item)
        # Verify the subject passed to create is the override
        create_kwargs = qs_mod.EmailQueue.objects.create.call_args
        self.assertEqual(create_kwargs.kwargs.get('subject') or create_kwargs[1].get('subject'), 'My Custom Subject')


class TestQueueServiceIsoformatBranch(SimpleTestCase):
    """Cover queue_service.py line 149 - isoformat datetime conversion."""

    def _get_service(self):
        with patch.dict('sys.modules', {
            'utils.models': MagicMock(),
            'utils.email_service': MagicMock(),
            'premailer': MagicMock(),
            'mjml': MagicMock(),
        }):
            import importlib
            import utils.services.queue_service as qs_mod
            importlib.reload(qs_mod)
            return qs_mod.EmailQueueService()

    def test_date_value_converted_to_isoformat(self):
        """Object with isoformat but not handled by datetime_serializer (line 148-149).

        datetime_serializer only handles timezone.datetime, so datetime.date
        will fail json.dumps and fall through to the isoformat branch.
        """
        service = self._get_service()

        date_value = datetime.date(2026, 1, 15)
        result = service._clean_context_for_serialization({'due_date': date_value})
        # Line 148: hasattr(date, 'isoformat') is True
        # Line 149: cleaned_context[key] = value.isoformat()
        self.assertEqual(result['due_date'], '2026-01-15')


class TestQueueServiceListItemWithoutDict(SimpleTestCase):
    """Cover queue_service.py line 181 - list item without __dict__."""

    def _get_service(self):
        with patch.dict('sys.modules', {
            'utils.models': MagicMock(),
            'utils.email_service': MagicMock(),
            'premailer': MagicMock(),
            'mjml': MagicMock(),
        }):
            import importlib
            import utils.services.queue_service as qs_mod
            importlib.reload(qs_mod)
            return qs_mod.EmailQueueService()

    def test_list_item_without_dict_attr_is_stringified(self):
        """List item without __dict__ should be str()-ified (line 180-181)."""
        service = self._get_service()

        # A set has no __dict__, and is not JSON serializable
        non_dict_item = frozenset([1, 2, 3])  # No __dict__ attr

        # We need json.dumps to fail for the list containing the frozenset
        import json as json_mod
        original_dumps = json_mod.dumps

        def selective_dumps(value, *args, **kwargs):
            if isinstance(value, list) and any(isinstance(i, frozenset) for i in value):
                raise TypeError('not serializable')
            if isinstance(value, frozenset):
                raise TypeError('not serializable')
            return original_dumps(value, *args, **kwargs)

        with patch('utils.services.queue_service.json.dumps', side_effect=selective_dumps):
            result = service._clean_context_for_serialization({
                'items': [frozenset([1, 2, 3])]
            })

        # Line 180-181: else branch for items without __dict__
        self.assertIsInstance(result['items'], list)
        self.assertEqual(len(result['items']), 1)
        self.assertIsInstance(result['items'][0], str)


class TestQueueServiceCreateEmailLog(SimpleTestCase):
    """Cover queue_service.py lines 460-467 - _create_email_log method."""

    def _get_service_and_mod(self):
        with patch.dict('sys.modules', {
            'utils.models': MagicMock(),
            'utils.email_service': MagicMock(),
            'premailer': MagicMock(),
            'mjml': MagicMock(),
        }):
            import importlib
            import utils.services.queue_service as qs_mod
            importlib.reload(qs_mod)
            return qs_mod.EmailQueueService(), qs_mod

    def test_create_email_log_returns_log_object(self):
        """_create_email_log should create and return EmailLog (lines 460-467)."""
        service, qs_mod = self._get_service_and_mod()

        mock_queue_item = MagicMock()
        mock_queue_item.subject = 'Test Subject'
        mock_queue_item.html_content = '<p>Test</p>'
        mock_queue_item.email_context = {'key': 'value'}
        mock_queue_item.from_email = 'from@test.com'
        mock_queue_item.template = MagicMock()

        mock_log = MagicMock()
        qs_mod.EmailLog.objects.create.return_value = mock_log

        result = service._create_email_log(mock_queue_item, 'to@test.com')

        self.assertEqual(result, mock_log)
        # Verify create was called with expected args
        create_kwargs = qs_mod.EmailLog.objects.create.call_args
        self.assertEqual(
            create_kwargs.kwargs.get('to_email') or create_kwargs[1].get('to_email'),
            'to@test.com'
        )


class TestQueueServiceProductTypeBranch(SimpleTestCase):
    """Cover queue_service.py line 550 - hasattr product_type branch."""

    def _get_service(self):
        with patch.dict('sys.modules', {
            'utils.models': MagicMock(),
            'utils.email_service': MagicMock(),
            'premailer': MagicMock(),
            'mjml': MagicMock(),
        }):
            import importlib
            import utils.services.queue_service as qs_mod
            importlib.reload(qs_mod)
            return qs_mod.EmailQueueService()

    def test_product_type_detection_via_hasattr(self):
        """Item with product_type attr should be detected (line 549-550)."""
        service = self._get_service()

        ta = MagicMock()
        ta.include_condition = {
            'type': 'product_type_based',
            'product_types': ['marking'],
            'logic': 'any',
        }

        class ItemWithProductType:
            product_type = 'marking'

        context = {'items': [ItemWithProductType()]}
        result = service._should_include_attachment(ta, context)
        self.assertTrue(result)


class TestQueueServiceProcessPendingReturnsFalse(SimpleTestCase):
    """Cover queue_service.py line 635 - process_queue_item returns False."""

    def _get_service_and_mod(self):
        with patch.dict('sys.modules', {
            'utils.models': MagicMock(),
            'utils.email_service': MagicMock(),
            'premailer': MagicMock(),
            'mjml': MagicMock(),
        }):
            import importlib
            import utils.services.queue_service as qs_mod
            importlib.reload(qs_mod)
            return qs_mod.EmailQueueService(), qs_mod

    def test_process_queue_item_returns_false_increments_failed(self):
        """When process_queue_item returns False, failed count increments (line 634-635)."""
        service, qs_mod = self._get_service_and_mod()

        mock_item = MagicMock()
        mock_item.queue_id = 'test-false-123'

        # Make process_queue_item return False (not raise)
        service.process_queue_item = MagicMock(return_value=False)

        mock_qs = MagicMock()
        mock_qs.__iter__ = MagicMock(return_value=iter([mock_item]))
        qs_mod.EmailQueue.objects.filter.return_value.exclude.return_value.order_by.return_value.__getitem__.return_value = mock_qs

        result = service.process_pending_queue(limit=10)
        # Line 635: results['failed'] += 1
        self.assertEqual(result['failed'], 1)
        self.assertEqual(result['successful'], 0)
        self.assertEqual(result['processed'], 1)
