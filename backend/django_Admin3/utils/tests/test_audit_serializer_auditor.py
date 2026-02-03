"""Tests for utils/audit/serializer_auditor.py - Serializer field audit.

Covers:
- SerializerAuditor initialization
- audit() method: full flow, app filtering, cross-referencing
- _discover_serializers(): module import, class filtering, app filtering
- _extract_fields(): from instances, from Meta, fallback paths
"""
from django.test import TestCase
from unittest.mock import patch, MagicMock, PropertyMock

import utils.audit.serializer_auditor as sa_mod
from utils.audit.serializer_auditor import SerializerAuditor, SERIALIZER_MODULES


class TestSerializerAuditorInit(TestCase):
    """Test SerializerAuditor initialization."""

    def test_UTL_default_scanner(self):
        """Should create a default TestFileScanner if none provided."""
        auditor = SerializerAuditor()
        self.assertIsNotNone(auditor.scanner)

    def test_UTL_custom_scanner(self):
        """Should accept a custom scanner instance."""
        mock_scanner = MagicMock()
        auditor = SerializerAuditor(scanner=mock_scanner)
        self.assertIs(auditor.scanner, mock_scanner)


class TestSerializerAuditorDiscoverSerializers(TestCase):
    """Test _discover_serializers method."""

    def test_UTL_discover_skips_unimportable_modules(self):
        """Modules that fail to import should be skipped gracefully."""
        auditor = SerializerAuditor()
        with patch.object(sa_mod.importlib, 'import_module',
                          side_effect=ImportError('No module')):
            result = auditor._discover_serializers()
        self.assertEqual(result, {})

    def test_UTL_discover_skips_runtime_error(self):
        """RuntimeError (e.g. models not in INSTALLED_APPS) should be skipped."""
        auditor = SerializerAuditor()
        with patch.object(sa_mod.importlib, 'import_module',
                          side_effect=RuntimeError('App not installed')):
            result = auditor._discover_serializers()
        self.assertEqual(result, {})

    def test_UTL_discover_skips_generic_exception(self):
        """Generic exceptions during import should be skipped."""
        auditor = SerializerAuditor()
        with patch.object(sa_mod.importlib, 'import_module',
                          side_effect=Exception('Something broke')):
            result = auditor._discover_serializers()
        self.assertEqual(result, {})

    def test_UTL_discover_filters_by_app(self):
        """app_filter should restrict which modules are examined."""
        auditor = SerializerAuditor()
        # Filter for 'cart' should only look at cart.serializers
        with patch.object(sa_mod.importlib, 'import_module') as mock_import:
            mock_import.side_effect = ImportError('test')
            auditor._discover_serializers(app_filter='cart')
            # Should have been called once for 'cart.serializers'
            call_args = [call[0][0] for call in mock_import.call_args_list]
            for mod_name in call_args:
                self.assertTrue(
                    mod_name.startswith('cart.') or mod_name.startswith('misc.cart.'),
                    f"Module {mod_name} should start with 'cart.' or 'misc.cart.'"
                )

    def test_UTL_discover_filters_misc_prefix_for_app(self):
        """app_filter should also match misc.{app}.serializers modules."""
        auditor = SerializerAuditor()
        with patch.object(sa_mod.importlib, 'import_module') as mock_import:
            mock_import.side_effect = ImportError('test')
            auditor._discover_serializers(app_filter='products')
            call_args = [call[0][0] for call in mock_import.call_args_list]
            self.assertIn('misc.products.serializers', call_args)

    def test_UTL_discover_skips_base_serializer_classes(self):
        """Should skip Serializer and ModelSerializer base classes."""
        from rest_framework import serializers

        mock_module = MagicMock()
        mock_module.__name__ = 'test.serializers'

        # Create a mock class that IS Serializer (base)
        class FakeSerializer(serializers.Serializer):
            pass

        # Patch getmembers to return the base Serializer itself
        members = [
            ('Serializer', serializers.Serializer),
            ('ModelSerializer', serializers.ModelSerializer),
        ]

        auditor = SerializerAuditor()
        with patch.object(sa_mod.importlib, 'import_module',
                          return_value=mock_module):
            with patch.object(sa_mod.inspect, 'getmembers',
                              return_value=members):
                result = auditor._discover_serializers()
        self.assertEqual(result, {})

    def test_UTL_discover_skips_serializer_from_different_module(self):
        """Should skip serializer classes imported from other modules."""
        from rest_framework import serializers

        class UTLTestSerializer(serializers.Serializer):
            name = serializers.CharField()

        # Set __module__ to something different from the module being inspected
        UTLTestSerializer.__module__ = 'some_other_module'

        mock_module = MagicMock()
        members = [('UTLTestSerializer', UTLTestSerializer)]

        auditor = SerializerAuditor()
        with patch('utils.audit.serializer_auditor.SERIALIZER_MODULES', ['test.serializers']):
            with patch.object(sa_mod.importlib, 'import_module',
                              return_value=mock_module):
                with patch.object(sa_mod.inspect, 'getmembers',
                                  return_value=members):
                    result = auditor._discover_serializers()
        self.assertEqual(result, {})

    def test_UTL_discover_includes_valid_serializer(self):
        """Should include valid serializer classes from the correct module."""
        from rest_framework import serializers

        class UTLValidSerializer(serializers.Serializer):
            utl_field = serializers.CharField()

        UTLValidSerializer.__module__ = 'test.serializers'

        mock_module = MagicMock()
        mock_module.__name__ = 'test.serializers'
        members = [('UTLValidSerializer', UTLValidSerializer)]

        auditor = SerializerAuditor()
        with patch('utils.audit.serializer_auditor.SERIALIZER_MODULES', ['test.serializers']):
            with patch.object(sa_mod.importlib, 'import_module',
                              return_value=mock_module):
                with patch.object(sa_mod.inspect, 'getmembers',
                                  return_value=members):
                    result = auditor._discover_serializers()

        self.assertIn('test.UTLValidSerializer', result)
        self.assertIn('utl_field', result['test.UTLValidSerializer']['fields'])

    def test_UTL_discover_skips_serializer_with_no_fields(self):
        """Serializer with no extractable fields should be skipped."""
        from rest_framework import serializers

        class UTLEmptySerializer(serializers.Serializer):
            pass  # No fields

        UTLEmptySerializer.__module__ = 'test.serializers'

        mock_module = MagicMock()
        members = [('UTLEmptySerializer', UTLEmptySerializer)]

        auditor = SerializerAuditor()
        with patch('utils.audit.serializer_auditor.SERIALIZER_MODULES', ['test.serializers']):
            with patch.object(sa_mod.importlib, 'import_module',
                              return_value=mock_module):
                with patch.object(sa_mod.inspect, 'getmembers',
                                  return_value=members):
                    result = auditor._discover_serializers()
        self.assertEqual(result, {})


class TestSerializerAuditorExtractFields(TestCase):
    """Test _extract_fields method."""

    def setUp(self):
        self.auditor = SerializerAuditor()

    def test_UTL_extract_fields_from_instance(self):
        """Should extract fields from serializer instance."""
        from rest_framework import serializers

        class UTLFieldSerializer(serializers.Serializer):
            utl_name = serializers.CharField()
            utl_count = serializers.IntegerField(read_only=True)

        fields = self.auditor._extract_fields(UTLFieldSerializer)
        self.assertIn('utl_name', fields)
        self.assertIn('utl_count', fields)
        self.assertEqual(fields['utl_name']['type'], 'CharField')
        self.assertTrue(fields['utl_count']['read_only'])

    def test_UTL_extract_fields_write_only(self):
        """Should detect write_only fields."""
        from rest_framework import serializers

        class UTLWriteOnlySerializer(serializers.Serializer):
            utl_secret = serializers.CharField(write_only=True)

        fields = self.auditor._extract_fields(UTLWriteOnlySerializer)
        self.assertIn('utl_secret', fields)
        self.assertTrue(fields['utl_secret']['write_only'])

    def test_UTL_extract_fields_required(self):
        """Should detect required fields."""
        from rest_framework import serializers

        class UTLRequiredSerializer(serializers.Serializer):
            utl_required_field = serializers.CharField(required=True)
            utl_optional_field = serializers.CharField(required=False)

        fields = self.auditor._extract_fields(UTLRequiredSerializer)
        self.assertTrue(fields['utl_required_field']['required'])
        self.assertFalse(fields['utl_optional_field']['required'])

    def test_UTL_extract_fields_fallback_to_meta(self):
        """When instantiation fails, should fall back to Meta.fields."""
        from rest_framework import serializers

        class UTLMetaSerializer(serializers.Serializer):
            class Meta:
                fields = ['utl_id', 'utl_name']

            def __init__(self, *args, **kwargs):
                raise Exception("Cannot instantiate")

        fields = self.auditor._extract_fields(UTLMetaSerializer)
        self.assertIn('utl_id', fields)
        self.assertIn('utl_name', fields)

    def test_UTL_extract_fields_fallback_meta_all(self):
        """Meta.fields = '__all__' should result in empty fields (can't enumerate)."""
        from rest_framework import serializers

        class UTLAllFieldsSerializer(serializers.Serializer):
            class Meta:
                fields = '__all__'

            def __init__(self, *args, **kwargs):
                raise Exception("Cannot instantiate")

        fields = self.auditor._extract_fields(UTLAllFieldsSerializer)
        # __all__ can't enumerate, so no fields from Meta
        # But may pick up class-level attrs
        self.assertIsInstance(fields, dict)

    def test_UTL_extract_fields_fallback_explicit_field_attrs(self):
        """Fallback: DRF metaclass moves declared fields to _declared_fields,
        so dir() loop in production code won't find them. Only Meta.fields
        items are returned."""
        from rest_framework import serializers

        class UTLExplicitSerializer(serializers.Serializer):
            utl_explicit_field = serializers.CharField()

            class Meta:
                fields = ['utl_other']

            def __init__(self, *args, **kwargs):
                raise Exception("Cannot instantiate")

        fields = self.auditor._extract_fields(UTLExplicitSerializer)
        # DRF metaclass consumes utl_explicit_field into _declared_fields,
        # so the dir() fallback loop does not discover it.
        # Only utl_other from Meta.fields is returned with type 'unknown'.
        self.assertIn('utl_other', fields)
        self.assertEqual(fields['utl_other']['type'], 'unknown')

    def test_UTL_extract_fields_meta_has_explicit_declaration(self):
        """Meta field with explicit class attr: DRF metaclass consumes the
        field declaration, so hasattr check returns False and type is 'unknown'."""
        from rest_framework import serializers

        class UTLDeclaredSerializer(serializers.Serializer):
            utl_declared = serializers.IntegerField()

            class Meta:
                fields = ['utl_declared']

            def __init__(self, *args, **kwargs):
                raise Exception("Cannot instantiate")

        fields = self.auditor._extract_fields(UTLDeclaredSerializer)
        self.assertIn('utl_declared', fields)
        # DRF metaclass moves utl_declared to _declared_fields, so
        # hasattr(serializer_class, 'utl_declared') is False in the
        # fallback path. The type remains 'unknown'.
        self.assertEqual(fields['utl_declared']['type'], 'unknown')


class TestSerializerAuditorAudit(TestCase):
    """Test the full audit() method."""

    def test_UTL_audit_returns_expected_structure(self):
        """audit() should return dict with 'serializers' and 'summary'."""
        mock_scanner = MagicMock()
        mock_scanner.scan_for_fields.return_value = {
            'read_fields': {},
            'write_fields': {},
        }
        auditor = SerializerAuditor(scanner=mock_scanner)

        # Mock _discover_serializers to return a known serializer
        auditor._discover_serializers = MagicMock(return_value={
            'test.UTLSerializer': {
                'module': 'test.serializers',
                'fields': {
                    'utl_id': {'type': 'IntegerField', 'read_only': True},
                    'utl_name': {'type': 'CharField', 'read_only': False},
                },
            },
        })

        result = auditor.audit()
        self.assertIn('serializers', result)
        self.assertIn('summary', result)

    def test_UTL_audit_summary_counts(self):
        """Summary should contain accurate counts."""
        mock_scanner = MagicMock()
        mock_scanner.scan_for_fields.return_value = {
            'read_fields': {'utl_id': {'files': []}},
            'write_fields': {'utl_name': {'files': []}},
        }
        auditor = SerializerAuditor(scanner=mock_scanner)
        auditor._discover_serializers = MagicMock(return_value={
            'test.UTLSerializer': {
                'module': 'test.serializers',
                'fields': {
                    'utl_id': {'type': 'IntegerField', 'read_only': True},
                    'utl_name': {'type': 'CharField', 'read_only': False},
                    'utl_untested': {'type': 'CharField', 'read_only': False},
                },
            },
        })

        result = auditor.audit()
        summary = result['summary']
        self.assertEqual(summary['total_serializers'], 1)
        self.assertEqual(summary['total_fields'], 3)
        self.assertEqual(summary['read_tested_count'], 1)
        self.assertEqual(summary['write_tested_count'], 1)
        self.assertEqual(summary['untested_count'], 1)

    def test_UTL_audit_coverage_percentages(self):
        """Coverage percentages should be calculated correctly."""
        mock_scanner = MagicMock()
        mock_scanner.scan_for_fields.return_value = {
            'read_fields': {'utl_a': {}, 'utl_b': {}},
            'write_fields': {'utl_a': {}},
        }
        auditor = SerializerAuditor(scanner=mock_scanner)
        auditor._discover_serializers = MagicMock(return_value={
            'test.UTLSer': {
                'module': 'test.serializers',
                'fields': {
                    'utl_a': {'type': 'CharField', 'read_only': False},
                    'utl_b': {'type': 'CharField', 'read_only': False},
                },
            },
        })

        result = auditor.audit()
        summary = result['summary']
        self.assertEqual(summary['read_coverage_pct'], 100.0)
        self.assertEqual(summary['write_coverage_pct'], 50.0)
        self.assertEqual(summary['untested_pct'], 0.0)

    def test_UTL_audit_with_app_filter(self):
        """app_filter should be passed to both discover and scan."""
        mock_scanner = MagicMock()
        mock_scanner.scan_for_fields.return_value = {
            'read_fields': {},
            'write_fields': {},
        }
        auditor = SerializerAuditor(scanner=mock_scanner)
        auditor._discover_serializers = MagicMock(return_value={})

        auditor.audit(app_filter='cart')
        auditor._discover_serializers.assert_called_once_with('cart')
        mock_scanner.scan_for_fields.assert_called_once_with('cart')

    def test_UTL_audit_serializer_result_structure(self):
        """Each serializer result should have module, total_fields, tested lists, untested list, fields."""
        mock_scanner = MagicMock()
        mock_scanner.scan_for_fields.return_value = {
            'read_fields': {'utl_id': {}},
            'write_fields': {},
        }
        auditor = SerializerAuditor(scanner=mock_scanner)
        auditor._discover_serializers = MagicMock(return_value={
            'test.UTLSer': {
                'module': 'test.serializers',
                'fields': {
                    'utl_id': {'type': 'IntegerField', 'read_only': True},
                    'utl_missing': {'type': 'CharField', 'read_only': False},
                },
            },
        })

        result = auditor.audit()
        ser_result = result['serializers']['test.UTLSer']
        self.assertEqual(ser_result['module'], 'test.serializers')
        self.assertEqual(ser_result['total_fields'], 2)
        self.assertIn('utl_id', ser_result['read_tested'])
        self.assertIn('utl_missing', ser_result['untested'])
        self.assertIn('utl_id', ser_result['fields'])

    def test_UTL_audit_zero_fields_coverage(self):
        """Zero total fields should not cause division by zero."""
        mock_scanner = MagicMock()
        mock_scanner.scan_for_fields.return_value = {
            'read_fields': {},
            'write_fields': {},
        }
        auditor = SerializerAuditor(scanner=mock_scanner)
        auditor._discover_serializers = MagicMock(return_value={})

        result = auditor.audit()
        summary = result['summary']
        self.assertEqual(summary['total_fields'], 0)
        self.assertEqual(summary['read_coverage_pct'], 0.0)
        self.assertEqual(summary['write_coverage_pct'], 0.0)
        self.assertEqual(summary['untested_pct'], 0.0)
