"""
Test-specific Django settings
Simplified settings for running TDD tests without PostgreSQL complications
"""
from .development import *

# Use SQLite for testing to avoid PostgreSQL migration issues
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',  # Use in-memory database for speed
        'TEST': {
            'NAME': ':memory:',
        },
    }
}

# Disable migrations for testing - creates tables based on current models
class DisableMigrations:
    def __contains__(self, item):
        return True
    
    def __getitem__(self, item):
        return None

# Comment out the line below if you want to test migrations
MIGRATION_MODULES = DisableMigrations()

# Speed up testing
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.MD5PasswordHasher',
]

# Disable logging during tests
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'null': {
            'class': 'logging.NullHandler',
        },
    },
    'root': {
        'handlers': ['null'],
    },
}

# Keep all apps from development settings to avoid import issues
# Just use the same INSTALLED_APPS as development

# Test database settings
DATABASES['default']['OPTIONS'] = {}
DATABASES['default']['TEST'] = {
    'NAME': ':memory:',
    'ENGINE': 'django.db.backends.sqlite3',
}

# Debug mode for tests
DEBUG = True
TESTING = True