"""Root conftest.py for pytest-django.

Provides SQLite compatibility by stripping PostgreSQL schema prefixes
from model db_table values when running tests with SQLite backend.
"""
import re

import django
from django.conf import settings


def pytest_configure(config):
    """Strip PostgreSQL schema prefixes from db_table for SQLite testing."""
    # Only apply when using SQLite backend
    db_engine = settings.DATABASES.get('default', {}).get('ENGINE', '')
    if 'sqlite' not in db_engine:
        return

    # Ensure apps are ready before accessing models
    django.setup()

    from django.apps import apps

    pattern = re.compile(r'^"[^"]+"\."([^"]+)"$')
    for model in apps.get_models():
        db_table = model._meta.db_table
        match = pattern.match(db_table)
        if match:
            model._meta.db_table = match.group(1)
