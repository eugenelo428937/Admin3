# test.py - Test-specific settings using PostgreSQL
from .base import *

DEBUG = True
SECRET_KEY = 'test-secret-key-not-for-production'

# Use PostgreSQL for tests — same engine as production.
# Django creates a test_<NAME> database automatically.
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME', 'ACTEDDBDEV01'),
        'USER': os.environ.get('DB_USER', 'actedadmin'),
        'PASSWORD': os.environ.get('DB_PASSWORD', 'Act3d@dm1n0EEoo'),
        'HOST': os.environ.get('DB_HOST', '127.0.0.1'),
        'PORT': os.environ.get('DB_PORT', '5432'),
    }
}

# Use PostgreSQLTestRunner to handle test DB cleanup
TEST_RUNNER = 'django_Admin3.test_runner.PostgreSQLTestRunner'

# Enable assertion mode for migrations in test
MIGRATION_ASSERT_MODE = True

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
