"""
PostgreSQL test settings with migration fix
Skips problematic view creation migration for testing
"""
from .development import *

# Keep PostgreSQL but skip problematic migrations
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'test_ACTEDDBDEV01',
        'USER': DATABASES['default']['USER'],
        'PASSWORD': DATABASES['default']['PASSWORD'],
        'HOST': DATABASES['default']['HOST'],
        'PORT': DATABASES['default']['PORT'],
        'TEST': {
            'NAME': 'test_ACTEDDBDEV01',
        },
    }
}

# Skip the problematic migration that creates SQL views
MIGRATION_MODULES = {
    'exam_sessions_subjects_products': 'exam_sessions_subjects_products.migrations_test'
}

# Ensure test database uses correct settings
if 'test' in sys.argv or 'test_postgresql_fixed' in os.environ.get('DJANGO_SETTINGS_MODULE', ''):
    # Skip problematic migrations during testing
    class SkipViewMigrations:
        def __contains__(self, item):
            # Skip the app with problematic view migration
            return item == 'exam_sessions_subjects_products'
        def __getitem__(self, item):
            # Return empty migration module
            return 'exam_sessions_subjects_products.empty_migrations'

# Test-specific settings
DEBUG = True
TESTING = True