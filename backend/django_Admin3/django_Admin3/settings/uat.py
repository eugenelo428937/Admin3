# uat.py - Railway UAT Environment Settings
from .base import *
import dj_database_url
from django.core.exceptions import ImproperlyConfigured

# Middleware Configuration - Override base middleware to add HealthCheckMiddleware
# MUST be placed before SecurityMiddleware to exempt health checks from SSL redirect
MIDDLEWARE = [
    'utils.middleware.HealthCheckMiddleware',  # MUST be first - exempts /api/health/ from SSL redirect
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware'
]

# Security: Production-like settings for UAT
DEBUG = False
SECRET_KEY = env('DJANGO_SECRET_KEY')

# Security Settings for Railway HTTPS
SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True

# Allowed Hosts - Railway provides these via environment variables
ALLOWED_HOSTS = env.list('ALLOWED_HOSTS', default=[])
# Railway health check requires this domain
if 'healthcheck.railway.app' not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append('healthcheck.railway.app')

# Railway provides DATABASE_URL - use dj_database_url for parsing
database_url = os.environ.get('DATABASE_URL')
if database_url:
    # Runtime: Use actual Railway Postgres database
    DATABASES = {
        'default': dj_database_url.parse(
            database_url,
            conn_max_age=600,
            conn_health_checks=True,
            ssl_require=False  # Railway manages SSL internally
        )
    }
else:
    # Build time: DATABASE_URL not available during build phase
    # Use dummy database config for collectstatic (doesn't need DB access)
    import warnings
    warnings.warn(
        "DATABASE_URL not set - using dummy database configuration. "
        "This is expected during build phase for collectstatic."
    )
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': ':memory:',
        }
    }

# CORS Configuration - Must match frontend domain
CORS_ALLOWED_ORIGINS = env.list('CORS_ALLOWED_ORIGINS', default=[])
CSRF_TRUSTED_ORIGINS = env.list('CSRF_TRUSTED_ORIGINS', default=[])

# Static Files for Railway
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATIC_URL = '/static/'
STATICFILES_STORAGE = 'django.contrib.staticfiles.storage.StaticFilesStorage'

# Administrate API Settings
ADMINISTRATE_INSTANCE_URL = env('ADMINISTRATE_INSTANCE_URL')
ADMINISTRATE_API_URL = env('ADMINISTRATE_API_URL')
ADMINISTRATE_API_KEY = env('ADMINISTRATE_API_KEY')
ADMINISTRATE_API_SECRET = env('ADMINISTRATE_API_SECRET')
ADMINISTRATE_REST_API_URL = env('ADMINISTRATE_REST_API_URL')
GETADDRESS_API_KEY = env('GETADDRESS_API_KEY')
GETADDRESS_ADMIN_KEY = env('GETADDRESS_ADMIN_KEY', default='')

# Postcoder.com API Settings (UK address lookup alternative)
POSTCODER_API_KEY = env('POSTCODER_API_KEY', default='')

# Opayo Payment Gateway Settings (Test Mode for UAT)
OPAYO_TEST_MODE = True
OPAYO_VENDOR_NAME = env('OPAYO_VENDOR_NAME', default='testvendor')
OPAYO_INTEGRATION_KEY = env('OPAYO_INTEGRATION_KEY', default='test_key')
OPAYO_INTEGRATION_PASSWORD = env('OPAYO_INTEGRATION_PASSWORD', default='test_password')

# Use real payment gateway in UAT (not dummy)
USE_DUMMY_PAYMENT_GATEWAY = False

# Email Settings for UAT
# Email override for testing - set to True to redirect all emails to test recipients
DEV_EMAIL_OVERRIDE = env.bool('DEV_EMAIL_OVERRIDE', default=False)

# Email recipients for testing (when DEV_EMAIL_OVERRIDE is True)
# Set via environment variable: DEV_EMAIL_RECIPIENTS=email1@example.com,email2@example.com
DEV_EMAIL_RECIPIENTS = env.list('DEV_EMAIL_RECIPIENTS', default=[])

# Email monitoring - BCC copy of all emails to designated address(es)
# Sends email to actual recipient PLUS a blind carbon copy to monitoring addresses
# Perfect for UAT: verify what users receive without redirecting emails
EMAIL_BCC_MONITORING = env.bool('EMAIL_BCC_MONITORING', default=False)
EMAIL_BCC_RECIPIENTS = env.list('EMAIL_BCC_RECIPIENTS', default=[])

# Email Backend Configuration
# Use SendGrid for Railway (HTTP API, no SMTP port blocking)
# Use SMTP for local development
USE_SENDGRID = env.bool('USE_SENDGRID', default=False)

if USE_SENDGRID:
    # SendGrid Email Backend (for Railway deployment)
    EMAIL_BACKEND = 'anymail.backends.sendgrid.EmailBackend'
    ANYMAIL = {
        "SENDGRID_API_KEY": env('SENDGRID_API_KEY'),
    }
    DEFAULT_FROM_EMAIL = env('DEFAULT_FROM_EMAIL', default='noreply@acted.co.uk')
else:
    # SMTP Email Backend (for local development)
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
    EMAIL_HOST = 'smtp.gmail.com'
    EMAIL_PORT = 587
    EMAIL_USE_TLS = True
    EMAIL_HOST_USER = env('EMAIL_HOST_USER', default='')
    EMAIL_HOST_PASSWORD = env('EMAIL_HOST_PASSWORD', default='')
    DEFAULT_FROM_EMAIL = env('DEFAULT_FROM_EMAIL', default='noreply@acted.com')

SERVER_EMAIL = DEFAULT_FROM_EMAIL

# Email Queue Processing Settings
EMAIL_QUEUE_BATCH_SIZE = env.int('EMAIL_QUEUE_BATCH_SIZE', default=50)
EMAIL_QUEUE_INTERVAL = env.int('EMAIL_QUEUE_INTERVAL', default=30)  # seconds

# Frontend URL for password reset emails, etc.
FRONTEND_URL = env('FRONTEND_URL', default='http://localhost:3000')

# Token Expiry Configuration (in hours)
TOKEN_EXPIRY_PASSWORD_RESET_HOURS = 24        # 24 hours (1 day)
TOKEN_EXPIRY_ACCOUNT_ACTIVATION_HOURS = 168   # 168 hours (7 days)
TOKEN_EXPIRY_EMAIL_VERIFICATION_HOURS = 24    # 24 hours (1 day)
TOKEN_EXPIRY_RESEND_ACTIVATION_HOURS = 168    # 168 hours (7 days)

# Logging Configuration - Console output for Railway
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '[{asctime}] {levelname} {name} {message}',
            'style': '{',
            'datefmt': '%Y-%m-%d %H:%M:%S',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'django.request': {
            'handlers': ['console'],
            'level': 'WARNING',
            'propagate': False,
        },
        'django.db.backends': {
            'handlers': ['console'],
            'level': 'WARNING',  # Set to DEBUG to see SQL queries
            'propagate': False,
        },
    },
}

# Cache Configuration - Use DATABASE cache for Railway (no Redis in starter)
# Can be upgraded to Redis later if needed
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.db.DatabaseCache',
        'LOCATION': 'django_cache_table',
    }
}

# Session Configuration
SESSION_ENGINE = 'django.contrib.sessions.backends.db'
SESSION_COOKIE_AGE = 86400  # 24 hours
SESSION_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
SESSION_SAVE_EVERY_REQUEST = True

# reCAPTCHA Configuration
RECAPTCHA_SITE_KEY = env('RECAPTCHA_SITE_KEY', default='6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI')
RECAPTCHA_SECRET_KEY = env('RECAPTCHA_SECRET_KEY', default='6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe')
RECAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify'
RECAPTCHA_VERSION = '3'
RECAPTCHA_DEFAULT_MIN_SCORE = float(env('RECAPTCHA_MIN_SCORE', default='0.5'))

# Password Reset Settings
PASSWORD_RESET_TIMEOUT_HOURS = float(env('PASSWORD_RESET_TIMEOUT_HOURS', default='24'))
PASSWORD_RESET_TIMEOUT = int(PASSWORD_RESET_TIMEOUT_HOURS * 3600)  # Convert to seconds
