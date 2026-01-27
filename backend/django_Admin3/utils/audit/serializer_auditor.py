"""
Introspect DRF serializer classes to discover all declared fields,
then cross-reference with test files to identify untested fields.
"""
import importlib
import inspect
from rest_framework import serializers

from .test_file_scanner import TestFileScanner


# Modules known to contain serializers (exclude .venv)
SERIALIZER_MODULES = [
    'cart.serializers',
    'students.serializers',
    'rules_engine.serializers',
    'users.serializers',
    'tutorials.serializers',
    'marking.serializers',
    'marking_vouchers.serializers',
    'search.serializers',
    'filtering.serializers',
    'misc.products.serializers',
    'misc.subjects.serializers',
    'misc.country.serializers',
]


class SerializerAuditor:
    """Discover all serializer fields and check test coverage."""

    def __init__(self, scanner=None):
        self.scanner = scanner or TestFileScanner()

    def audit(self, app_filter=None):
        """Run the serializer field audit.

        Args:
            app_filter: Optional app name to filter (e.g., 'cart')

        Returns:
            dict with 'serializers', 'summary'
        """
        # Step 1: Discover all serializer classes and their fields
        all_serializers = self._discover_serializers(app_filter)

        # Step 2: Scan test files for field references
        field_refs = self.scanner.scan_for_fields(app_filter)

        # Step 3: Cross-reference
        results = {}
        total_fields = 0
        total_read_tested = 0
        total_write_tested = 0
        total_untested = 0

        for ser_key, ser_info in all_serializers.items():
            fields = ser_info['fields']
            field_results = {}

            for field_name, field_data in fields.items():
                is_read_tested = field_name in field_refs['read_fields']
                is_write_tested = field_name in field_refs['write_fields']
                is_read_only = field_data.get('read_only', False)

                field_results[field_name] = {
                    'type': field_data['type'],
                    'read_only': is_read_only,
                    'read_tested': is_read_tested,
                    'write_tested': is_write_tested,
                    'untested': not is_read_tested and not is_write_tested,
                }

                total_fields += 1
                if is_read_tested:
                    total_read_tested += 1
                if is_write_tested:
                    total_write_tested += 1
                if not is_read_tested and not is_write_tested:
                    total_untested += 1

            untested_fields = [
                name for name, info in field_results.items()
                if info['untested']
            ]

            results[ser_key] = {
                'module': ser_info['module'],
                'total_fields': len(fields),
                'read_tested': [n for n, i in field_results.items() if i['read_tested']],
                'write_tested': [n for n, i in field_results.items() if i['write_tested']],
                'untested': untested_fields,
                'fields': field_results,
            }

        return {
            'serializers': results,
            'summary': {
                'total_serializers': len(results),
                'total_fields': total_fields,
                'read_tested_count': total_read_tested,
                'write_tested_count': total_write_tested,
                'untested_count': total_untested,
                'read_coverage_pct': round(total_read_tested / max(total_fields, 1) * 100, 1),
                'write_coverage_pct': round(total_write_tested / max(total_fields, 1) * 100, 1),
                'untested_pct': round(total_untested / max(total_fields, 1) * 100, 1),
            }
        }

    def _discover_serializers(self, app_filter=None):
        """Import and introspect all serializer classes.

        Returns:
            dict: {
                'app.SerializerName': {
                    'module': 'app.serializers',
                    'fields': {
                        'field_name': {'type': 'CharField', 'read_only': False},
                    }
                }
            }
        """
        all_serializers = {}

        modules = SERIALIZER_MODULES
        if app_filter:
            modules = [m for m in modules if m.startswith(app_filter + '.') or m.startswith(f'misc.{app_filter}.')]

        for module_name in modules:
            try:
                module = importlib.import_module(module_name)
            except (ImportError, RuntimeError, Exception):
                # RuntimeError for models not in INSTALLED_APPS (e.g., misc.products)
                continue

            for name, obj in inspect.getmembers(module, inspect.isclass):
                if not issubclass(obj, serializers.Serializer):
                    continue
                if obj is serializers.Serializer or obj is serializers.ModelSerializer:
                    continue
                # Skip if defined in a different module (imported)
                if obj.__module__ != module_name:
                    continue

                fields = self._extract_fields(obj)
                if fields:
                    key = f"{module_name.split('.')[0]}.{name}"
                    all_serializers[key] = {
                        'module': module_name,
                        'fields': fields,
                    }

        return all_serializers

    def _extract_fields(self, serializer_class):
        """Extract field information from a serializer class.

        Handles:
        - Meta.fields
        - SerializerMethodField
        - Explicitly declared fields
        """
        fields = {}

        try:
            # Instantiate the serializer to get resolved fields
            # Some serializers may need context, so use a try/except
            instance = serializer_class()
            resolved_fields = instance.get_fields()

            for field_name, field_obj in resolved_fields.items():
                fields[field_name] = {
                    'type': type(field_obj).__name__,
                    'read_only': getattr(field_obj, 'read_only', False),
                    'write_only': getattr(field_obj, 'write_only', False),
                    'required': getattr(field_obj, 'required', False),
                }
        except Exception:
            # Fallback: inspect Meta.fields and class attributes
            meta = getattr(serializer_class, 'Meta', None)
            if meta and hasattr(meta, 'fields'):
                meta_fields = meta.fields
                if meta_fields == '__all__':
                    # Can't enumerate without model instance
                    meta_fields = []
                elif isinstance(meta_fields, (list, tuple)):
                    for field_name in meta_fields:
                        # Check if there's an explicit field declaration
                        field_type = 'unknown'
                        if hasattr(serializer_class, field_name):
                            attr = getattr(serializer_class, field_name)
                            field_type = type(attr).__name__
                        fields[field_name] = {
                            'type': field_type,
                            'read_only': False,
                        }

            # Also check class-level field declarations
            for attr_name in dir(serializer_class):
                if attr_name.startswith('_'):
                    continue
                attr = getattr(serializer_class, attr_name, None)
                if isinstance(attr, serializers.Field):
                    if attr_name not in fields:
                        fields[attr_name] = {
                            'type': type(attr).__name__,
                            'read_only': getattr(attr, 'read_only', False),
                        }

        return fields
