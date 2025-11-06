# backend/django_Admin3/django_Admin3/settings/production.py
import os
from .base import *

DEBUG = False
ALLOWED_HOSTS = ['your-domain.com', 'www.your-domain.com']
SECRET_KEY = env('DJANGO_SECRET_KEY')

# CORS configuration
CORS_ALLOWED_ORIGINS = [
    "https://your-domain.com",
    "https://www.your-domain.com",
]

DEBUG = False
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY')

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME'),
        'USER': os.environ.get('DB_USER'),
        'PASSWORD': os.environ.get('DB_PASSWORD'),
        'HOST': os.environ.get('DB_HOST'),
        'PORT': os.environ.get('DB_PORT'),
        'OPTIONS': {
            'sslmode': 'require',
            'options': '-c default_transaction_isolation=read committed'
        },
        'CONN_MAX_AGE': 600,  # 10 minutes
        'CONN_HEALTH_CHECKS': True,
    }
}
# Database connection pooling
DATABASE_POOL_CLASS = 'django_db_pool.pools.postgresql.DatabasePool'
DATABASE_POOL_PARAMS = {
    'max_connections': 20,
    'min_connections': 5,
}
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': f'redis://{os.environ.get("REDIS_HOST")}:{os.environ.get("REDIS_PORT")}/1',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'PASSWORD': os.environ.get('REDIS_PASSWORD'),
        }
    }
}

# Security headers
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"

# Administrate API Settings
ADMINISTRATE_INSTANCE_URL = env('ADMINISTRATE_INSTANCE_URL')
ADMINISTRATE_API_URL = env('ADMINISTRATE_API_URL')
ADMINISTRATE_API_KEY = env('ADMINISTRATE_API_KEY')
ADMINISTRATE_API_SECRET = env('ADMINISTRATE_API_SECRET')
ADMINISTRATE_REST_API_URL = env('ADMINISTRATE_REST_API_URL')

# Address Lookup API Settings
GETADDRESS_API_KEY = env('GETADDRESS_API_KEY', default='')
GETADDRESS_ADMIN_KEY = env('GETADDRESS_ADMIN_KEY', default='')
POSTCODER_API_KEY = env('POSTCODER_API_KEY', default='')

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '[{levelname}] {asctime} {name} {process:d} {thread:d} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': 'C:\\logs\\admin3\\django.log',
            'maxBytes': 10485760,  # 10MB
            'backupCount': 5,
            'formatter': 'verbose',
        },
        'security': {
            'level': 'WARNING',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': 'C:\\logs\\admin3\\security.log',
            'maxBytes': 10485760,  # 10MB
            'backupCount': 5,
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['file'],
            'level': 'INFO',
            'propagate': True,
        },
        'django.security': {
            'handlers': ['security'],
            'level': 'WARNING',
            'propagate': False,
        },
        'admin3': {
            'handlers': ['file'],
            'level': 'INFO',
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
