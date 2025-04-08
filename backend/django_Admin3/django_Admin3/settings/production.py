# development.py
from .base import *
print("Loading production settings")
DEBUG = True
SECRET_KEY = env('DJANGO_SECRET_KEY')

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'ACTEDDBTEST01',
        'USER': 'dev_user',
        'PASSWORD': 'dev_password',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}

# production.py
from .base import *

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
    }
}

# Additional security settings for production
SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# Administrate API Settings
ADMINISTRATE_INSTANCE_URL = env('ADMINISTRATE_INSTANCE_URL')
ADMINISTRATE_API_URL = env('ADMINISTRATE_API_URL')
ADMINISTRATE_API_KEY = env('ADMINISTRATE_API_KEY')
ADMINISTRATE_API_SECRET = env('ADMINISTRATE_API_SECRET')
ADMINISTRATE_REST_API_URL = env('ADMINISTRATE_REST_API_URL')