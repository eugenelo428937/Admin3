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
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    
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
