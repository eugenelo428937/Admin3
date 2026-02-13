# ci.py - CI-specific settings using PostgreSQL with hardcoded test values
# This file is used by GitHub Actions CI to run tests without requiring secrets.
from .base import *

DEBUG = True
SECRET_KEY = 'ci-test-secret-key-not-for-production'

# PostgreSQL database for CI (matches GitHub Actions service)
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'test_admin3',
        'USER': 'postgres',
        'PASSWORD': 'postgres',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}

# Enable assertion mode — migrations raise exceptions instead of skipping
MIGRATION_ASSERT_MODE = True

# Use PostgreSQLTestRunner for reliable test DB management
TEST_RUNNER = 'django_Admin3.test_runner.PostgreSQLTestRunner'

# Disable password hashers for faster tests
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.MD5PasswordHasher',
]

# Administrate API Settings (dummy for CI)
ADMINISTRATE_INSTANCE_URL = 'test.example.com'
ADMINISTRATE_API_URL = 'https://api.example.com/graphql'
ADMINISTRATE_API_KEY = 'test-key'
ADMINISTRATE_API_SECRET = 'test-secret'
ADMINISTRATE_REST_API_URL = 'https://test.example.com'
ADMINISTRATE_AUTH_USER = 'test@example.com'
ADMINISTRATE_AUTH_URL="https://auth.getadministrate.com/oauth"
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

# Logging - minimal for CI
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'WARNING',
    },
}
