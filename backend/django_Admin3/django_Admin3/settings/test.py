# test.py - Test-specific settings using SQLite for isolated testing
from .base import *

DEBUG = True
SECRET_KEY = 'test-secret-key-not-for-production'

# Use SQLite for tests to avoid PostgreSQL test DB creation issues
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
    }
}

# Disable all migrations for SQLite testing.
# Django's CREATE SCHEMA SQL in catalog.0001_initial is PostgreSQL-only.
# With migrations disabled, Django uses syncdb to create tables from models,
# bypassing all migration SQL (including schema creation).


class DisableMigrations:
    """Return None for all migration modules, disabling migrations."""

    def __contains__(self, item):
        return True

    def __getitem__(self, item):
        return None


MIGRATION_MODULES = DisableMigrations()

# Custom test runner that strips PostgreSQL schema prefixes from db_table
# so that SQLite can create tables. e.g. '"acted"."products"' -> '"products"'
TEST_RUNNER = 'django_Admin3.test_runner.SQLiteSchemaTestRunner'

# Disable password hashers for faster tests
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.MD5PasswordHasher',
]

# Administrate API Settings (dummy for tests)
ADMINISTRATE_INSTANCE_URL = 'test.example.com'
ADMINISTRATE_API_URL = 'https://api.example.com/graphql'
ADMINISTRATE_API_KEY = 'test-key'
ADMINISTRATE_API_SECRET = 'test-secret'
ADMINISTRATE_REST_API_URL = 'https://test.example.com'
GETADDRESS_API_KEY = 'test-key'
GETADDRESS_ADMIN_KEY = 'test-key'

# Postcoder.com API Settings
POSTCODER_API_KEY = 'test-key'

# Opayo Payment Gateway Settings
OPAYO_TEST_MODE = True
OPAYO_VENDOR_NAME = 'testvendor'
OPAYO_INTEGRATION_KEY = 'test_key'
OPAYO_INTEGRATION_PASSWORD = 'test_password'

# Use dummy payment gateway
USE_DUMMY_PAYMENT_GATEWAY = True

# Fuzzy Search Configuration
FUZZY_SEARCH_MIN_SCORE = 45

# Email settings
USE_SENDGRID = False
USE_INTERNAL_SMTP = False
EMAIL_FROM_NAME = 'Test'
DEFAULT_REPLY_TO_EMAIL = 'test@example.com'
DEV_EMAIL_OVERRIDE = False
DEV_EMAIL_RECIPIENTS = []
EMAIL_BCC_MONITORING = False
EMAIL_BCC_RECIPIENTS = []
