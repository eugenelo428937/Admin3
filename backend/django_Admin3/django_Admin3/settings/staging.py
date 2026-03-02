"""
Django settings for staging environment (Docker Compose).

Combines UAT security/middleware patterns with production Redis caching.
Connects to PostgreSQL and Redis via Docker service names.
"""
import os
import warnings

import dj_database_url
import environ

from .base import *  # noqa: F401, F403

env = environ.Env(
    DEBUG=(bool, False),
    ALLOWED_HOSTS=(list, []),
    CORS_ALLOWED_ORIGINS=(list, []),
    CSRF_TRUSTED_ORIGINS=(list, []),
)

# --- Core ---
DEBUG = False
SECRET_KEY = env('DJANGO_SECRET_KEY')

ALLOWED_HOSTS = env.list('ALLOWED_HOSTS', default=['*'])

# --- Database ---
# Three-way: DATABASE_URL > DB_HOST env vars > build-time SQLite fallback
database_url = os.environ.get('DATABASE_URL')
db_host = os.environ.get('DB_HOST')

if database_url:
    DATABASES = {
        'default': dj_database_url.parse(
            database_url,
            conn_max_age=600,
            conn_health_checks=True,
            ssl_require=False,
        )
    }
elif db_host:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.environ.get('DB_NAME', 'admin3'),
            'USER': os.environ.get('DB_USER', 'admin3'),
            'PASSWORD': os.environ.get('DB_PASSWORD', ''),
            'HOST': db_host,
            'PORT': os.environ.get('DB_PORT', '5432'),
            'OPTIONS': {'client_encoding': 'UTF8'},
            'CONN_MAX_AGE': 600,
            'CONN_HEALTH_CHECKS': True,
        }
    }
else:
    warnings.warn("No database configured — using in-memory SQLite (build-time only)")
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': ':memory:',
        }
    }

# --- Cache (Redis) ---
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': env('REDIS_URL', default='redis://redis:6379/1'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        }
    }
}

# --- Middleware ---
# HealthCheckMiddleware first (exempts /api/health/ from SSL redirect)
# WhiteNoise after SecurityMiddleware (serves Django admin/DRF statics)
MIDDLEWARE = [
    'utils.middleware.HealthCheckMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# --- Security ---
SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 0  # No HSTS for self-signed cert staging
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True

# --- CORS / CSRF ---
CORS_ALLOWED_ORIGINS = env.list('CORS_ALLOWED_ORIGINS', default=[])
CSRF_TRUSTED_ORIGINS = env.list('CSRF_TRUSTED_ORIGINS', default=[])
CORS_ALLOW_CREDENTIALS = True

# --- Session cookies (same-origin since Nginx serves both) ---
SESSION_ENGINE = 'django.contrib.sessions.backends.db'
SESSION_COOKIE_AGE = 86400
SESSION_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'  # Same origin (not cross-origin like Railway UAT)
SESSION_SAVE_EVERY_REQUEST = True
CSRF_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SECURE = True

# --- Static files (WhiteNoise) ---
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATIC_URL = '/static/'
STORAGES = {
    'staticfiles': {
        'BACKEND': 'whitenoise.storage.CompressedManifestStaticFilesStorage',
    },
}

# --- Logging (console + file) ---
LOG_DIR = os.environ.get('LOG_DIR', '/app/logs')
os.makedirs(LOG_DIR, exist_ok=True)

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '[{asctime}] {levelname} {name} {message}',
            'style': '{',
            'datefmt': '%Y-%m-%d %H:%M:%S',
        },
    },
    'handlers': {
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
        'file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': os.path.join(LOG_DIR, 'django.log'),
            'formatter': 'verbose',
            'encoding': 'utf-8',
        },
    },
    'root': {
        'handlers': ['console', 'file'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
        'django.request': {
            'handlers': ['console', 'file'],
            'level': 'WARNING',
            'propagate': False,
        },
    },
}

# --- Email ---
USE_INTERNAL_SMTP = env.bool('USE_INTERNAL_SMTP', default=True)
USE_SENDGRID = env.bool('USE_SENDGRID', default=False)

if USE_INTERNAL_SMTP:
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
    EMAIL_HOST = env('EMAIL_HOST', default='host.docker.internal')
    EMAIL_PORT = env.int('EMAIL_PORT', default=25)
    EMAIL_USE_TLS = env.bool('EMAIL_USE_TLS', default=False)
    EMAIL_USE_SSL = env.bool('EMAIL_USE_SSL', default=False)
    EMAIL_HOST_USER = env('EMAIL_HOST_USER', default='')
    EMAIL_HOST_PASSWORD = env('EMAIL_HOST_PASSWORD', default='')
elif USE_SENDGRID:
    EMAIL_BACKEND = 'anymail.backends.sendgrid.EmailBackend'
    ANYMAIL = {'SENDGRID_API_KEY': env('SENDGRID_API_KEY', default='')}
else:
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
    EMAIL_HOST = env('EMAIL_HOST', default='smtp.gmail.com')
    EMAIL_PORT = env.int('EMAIL_PORT', default=587)
    EMAIL_USE_TLS = True
    EMAIL_HOST_USER = env('EMAIL_HOST_USER', default='')
    EMAIL_HOST_PASSWORD = env('EMAIL_HOST_PASSWORD', default='')

EMAIL_FROM_NAME = env('EMAIL_FROM_NAME', default='ActEd Sales')
DEFAULT_FROM_EMAIL = env('DEFAULT_FROM_EMAIL', default='no-reply@acted.co.uk')
DEFAULT_REPLY_TO_EMAIL = env('DEFAULT_REPLY_TO_EMAIL', default='acted@bpp.com')

DEV_EMAIL_OVERRIDE = env.bool('DEV_EMAIL_OVERRIDE', default=True)
DEV_EMAIL_RECIPIENTS = env.list('DEV_EMAIL_RECIPIENTS', default=[])
EMAIL_BCC_MONITORING = env.bool('EMAIL_BCC_MONITORING', default=False)
EMAIL_BCC_RECIPIENTS = env.list('EMAIL_BCC_RECIPIENTS', default=[])
EMAIL_QUEUE_BATCH_SIZE = env.int('EMAIL_QUEUE_BATCH_SIZE', default=50)
EMAIL_QUEUE_INTERVAL = env.int('EMAIL_QUEUE_INTERVAL', default=30)

# --- Frontend URL ---
FRONTEND_URL = env('FRONTEND_URL', default='https://localhost')

# --- Token expiry ---
TOKEN_EXPIRY_PASSWORD_RESET_HOURS = 24
TOKEN_EXPIRY_ACCOUNT_ACTIVATION_HOURS = 168
TOKEN_EXPIRY_EMAIL_VERIFICATION_HOURS = 24
TOKEN_EXPIRY_RESEND_ACTIVATION_HOURS = 168
PASSWORD_RESET_TIMEOUT_HOURS = float(env('PASSWORD_RESET_TIMEOUT_HOURS', default='24'))
PASSWORD_RESET_TIMEOUT = int(PASSWORD_RESET_TIMEOUT_HOURS * 3600)

# --- Administrate API (placeholders for build-time) ---
ADMINISTRATE_INSTANCE_URL = env('ADMINISTRATE_INSTANCE_URL', default='build-placeholder.example.com')
ADMINISTRATE_API_URL = env('ADMINISTRATE_API_URL', default='https://api.example.com/graphql')
ADMINISTRATE_API_KEY = env('ADMINISTRATE_API_KEY', default='build-placeholder')
ADMINISTRATE_API_SECRET = env('ADMINISTRATE_API_SECRET', default='build-placeholder')
ADMINISTRATE_REST_API_URL = env('ADMINISTRATE_REST_API_URL', default='https://build-placeholder.example.com')
ADMINISTRATE_AUTH_USER = env('ADMINISTRATE_AUTH_USER', default='build-placeholder@example.com')

# --- Third-party API keys ---
GETADDRESS_API_KEY = env('GETADDRESS_API_KEY', default='')
GETADDRESS_ADMIN_KEY = env('GETADDRESS_ADMIN_KEY', default='')
POSTCODER_API_KEY = env('POSTCODER_API_KEY', default='')
RECAPTCHA_SITE_KEY = env('RECAPTCHA_SITE_KEY', default='')
RECAPTCHA_SECRET_KEY = env('RECAPTCHA_SECRET_KEY', default='')
RECAPTCHA_MIN_SCORE = env.float('RECAPTCHA_MIN_SCORE', default=0.6)

# --- Payment (always test mode on staging) ---
OPAYO_TEST_MODE = True
USE_DUMMY_PAYMENT_GATEWAY = env.bool('USE_DUMMY_PAYMENT_GATEWAY', default=True)
OPAYO_BASE_URL = env('OPAYO_BASE_URL', default='https://sandbox.opayo.eu.elavon.com/hosted-payment-pages/vendor/v12/payment-pages')
OPAYO_INTEGRATION_KEY = env('OPAYO_INTEGRATION_KEY', default='')
OPAYO_INTEGRATION_PASSWORD = env('OPAYO_INTEGRATION_PASSWORD', default='')
OPAYO_VENDOR_NAME = env('OPAYO_VENDOR_NAME', default='')

# --- Fuzzy search ---
FUZZY_SEARCH_MIN_SCORE = env.int('FUZZY_SEARCH_MIN_SCORE', default=45)

# --- Startup diagnostic ---
import re as _re
_cache_url = _re.sub(r'://:[^@]+@', '://:*****@', CACHES['default']['LOCATION'])
print(f"[STAGING] ALLOWED_HOSTS: {ALLOWED_HOSTS}")
print(f"[STAGING] CORS_ALLOWED_ORIGINS: {CORS_ALLOWED_ORIGINS}")
print(f"[STAGING] Database host: {DATABASES['default'].get('HOST', 'N/A')}")
print(f"[STAGING] Cache: {_cache_url}")
