# development.py
from .base import *

DEBUG = True
SECRET_KEY = env('DJANGO_SECRET_KEY')

# HTTPS settings for development
SECURE_SSL_REDIRECT = False
SECURE_HSTS_SECONDS = 0
SECURE_HSTS_INCLUDE_SUBDOMAINS = False
SECURE_HSTS_PRELOAD = False
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SESSION_COOKIE_SECURE = False  # Set to False for development
CSRF_COOKIE_SECURE = False    # Set to False for development
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# ALB Health Check Settings
if os.environ.get('USE_ALB_PROXY') == 'true':
    # ALB forwards the original protocol in this header
    USE_X_FORWARDED_HOST = True
    USE_X_FORWARDED_PORT = True
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    # Disable redirect in development behind ALB
    SECURE_SSL_REDIRECT = False

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME'),
        'USER': os.environ.get('DB_USER'),
        'PASSWORD': os.environ.get('DB_PASSWORD'),
        'HOST': os.environ.get('DB_HOST'),
        'PORT': os.environ.get('DB_PORT'),
    }
}


# Administrate API Settings
ADMINISTRATE_INSTANCE_URL = env('ADMINISTRATE_INSTANCE_URL')
ADMINISTRATE_API_URL = env('ADMINISTRATE_API_URL')
ADMINISTRATE_API_KEY = env('ADMINISTRATE_API_KEY')
ADMINISTRATE_API_SECRET = env('ADMINISTRATE_API_SECRET')
ADMINISTRATE_REST_API_URL = env('ADMINISTRATE_REST_API_URL')
GETADDRESS_API_KEY = env('GETADDRESS_API_KEY')
GETADDRESS_ADMIN_KEY = env('GETADDRESS_ADMIN_KEY')

# Opayo Payment Gateway Settings (Development)
OPAYO_TEST_MODE = True
OPAYO_VENDOR_NAME = env('OPAYO_VENDOR_NAME', default='testvendor')
OPAYO_INTEGRATION_KEY = env('OPAYO_INTEGRATION_KEY', default='test_key')
OPAYO_INTEGRATION_PASSWORD = env(
    'OPAYO_INTEGRATION_PASSWORD', default='test_password')

# Use dummy payment gateway for local development
USE_DUMMY_PAYMENT_GATEWAY = True

# Development Email Override Settings
# Redirect all emails to these addresses in development environment
DEV_EMAIL_OVERRIDE = True
DEV_EMAIL_RECIPIENTS = [
    'eugenelo@bpp.com',
    'eugene.lo1030@gmail.com',
]

# Token Expiry Configuration (in hours)
# These can be overridden in database via EmailSettings model
TOKEN_EXPIRY_PASSWORD_RESET_HOURS = 24        # 24 hours (1 day)
TOKEN_EXPIRY_ACCOUNT_ACTIVATION_HOURS = 168   # 168 hours (7 days)
TOKEN_EXPIRY_EMAIL_VERIFICATION_HOURS = 24    # 24 hours (1 day)
TOKEN_EXPIRY_RESEND_ACTIVATION_HOURS = 168    # 168 hours (7 days)

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '[{asctime}] {levelname} {name} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'file': {
            'level': 'DEBUG',
            'class': 'logging.FileHandler',
            'filename': os.path.join(BASE_DIR, 'django_debug.log'),
            'formatter': 'verbose',
        },
        'console': {
            'level': 'DEBUG',
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
    },
    'root': {
        'handlers': ['file', 'console'],
        'level': 'DEBUG',
    },
    'loggers': {
        '': {
            'handlers': ['file', 'console'],
            'level': 'DEBUG',
            'propagate': True,
        },
    },
}
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/1',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            # No password needed since Redis is running without auth
        }
    }
}
