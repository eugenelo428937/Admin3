"""Custom test runner for SQLite compatibility.

Strips PostgreSQL schema prefixes from model db_table values so that
SQLite (which has no schema concept) can create tables correctly.

For example: '"acted"."products"' -> '"products"'

This allows tests to run with in-memory SQLite instead of requiring
a PostgreSQL test database.
"""
import re

from django.apps import apps
from django.test.runner import DiscoverRunner


class SQLiteSchemaTestRunner(DiscoverRunner):
    """Test runner that patches db_table names for SQLite compatibility."""

    def setup_databases(self, **kwargs):
        # Before creating tables, strip schema prefixes from all models
        self._strip_schema_prefixes()
        return super().setup_databases(**kwargs)

    def _strip_schema_prefixes(self):
        """Remove PostgreSQL schema prefixes from db_table values.

        Converts '"acted"."tablename"' to '"tablename"' so SQLite
        can create the tables without a schema qualifier.
        """
        pattern = re.compile(r'^"[^"]+"\."([^"]+)"$')
        for model in apps.get_models():
            db_table = model._meta.db_table
            match = pattern.match(db_table)
            if match:
                model._meta.db_table = f'"{match.group(1)}"'
                # Also update the original_attrs to prevent Django
                # from resetting during test teardown
                if hasattr(model._meta, 'original_attrs'):
                    if 'db_table' in model._meta.original_attrs:
                        model._meta.original_attrs['db_table'] = model._meta.db_table
