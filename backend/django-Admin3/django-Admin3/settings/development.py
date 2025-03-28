# development.py
from .base import *


DEBUG = True
SECRET_KEY = 'development-secret-key'

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
        'NAME': 'ACTEDDBDEV01',
        'USER': 'actedadmin@bpp.com',
        'PASSWORD': 'Act3d@dm1n0EEoo',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}

