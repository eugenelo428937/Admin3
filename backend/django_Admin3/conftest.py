"""Root conftest.py for pytest-django.

All tests run against PostgreSQL. SQLite is no longer supported.
"""
from django.conf import settings


def pytest_configure(config):
    """Verify PostgreSQL is being used for tests."""
    db_engine = settings.DATABASES.get('default', {}).get('ENGINE', '')
    if 'sqlite' in db_engine:
        raise RuntimeError(
            "SQLite is no longer supported for testing. "
            "Use DJANGO_SETTINGS_MODULE=django_Admin3.settings.test "
            "which configures PostgreSQL."
        )
