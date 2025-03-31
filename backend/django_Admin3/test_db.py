import os
import sys
import django
from pathlib import Path

# Print current directory and Python path for debugging
print(f"Current directory: {os.getcwd()}")
print(f"Python path: {sys.path}")

# Get the project base directory
BASE_DIR = Path(__file__).resolve().parent
print(f"Base directory: {BASE_DIR}")

# Add the base directory to Python path if needed
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))
    print(f"Added {BASE_DIR} to Python path")

# Try different settings module paths
settings_module_options = [
    "django_Admin3.settings",
    "django_Admin3.settings",
    "django_Admin3.django_Admin3.settings"
]

# Find the correct settings module
settings_module = None
for option in settings_module_options:
    print(f"Trying settings module: {option}")
    os.environ["DJANGO_SETTINGS_MODULE"] = option
    try:
        import django.conf
        django.conf.settings.DATABASES  # Try to access DATABASES
        settings_module = option
        print(f"Found working settings module: {option}")
        break
    except (ImportError, AttributeError) as e:
        print(f"Failed with: {e}")
        django.conf.settings._wrapped = None  # Reset settings

if not settings_module:
    print("Could not find working settings module!")
    sys.exit(1)

# Now try to connect to the database
try:
    # Force Django to reload settings
    django.setup()
    
    # Import settings and check database configuration
    from django.conf import settings
    if 'default' not in settings.DATABASES:
        print("No 'default' database in settings.DATABASES!")
        sys.exit(1)
        
    db_config = settings.DATABASES['default']
    print("\nDatabase configuration:")
    for key, value in db_config.items():
        if key != 'PASSWORD':
            print(f"  {key}: {value}")
    
    # Test the connection
    from django.db import connection
    with connection.cursor() as cursor:
        cursor.execute("SELECT 1")
        print("\nDatabase connection successful!")
        
except Exception as e:
    print(f"Error: {type(e).__name__}: {e}")
    
    # If it's still failing with ENGINE error, manually set the database config
    if "ENGINE" in str(e):
        print("\nTrying with manual database configuration...")
        from django.conf import settings
        
        settings.DATABASES = {
            'default': {
                'ENGINE': 'django.db.backends.postgresql',
                'NAME': os.environ.get('DB_NAME', 'ACTEDDBDEV01'),
                'USER': os.environ.get('DB_USER', 'actedadmin@bpp.com'),
                'PASSWORD': os.environ.get('DB_PASSWORD', 'Act3d@dm1n0EEoo'),
                'HOST': os.environ.get('DB_HOST', 'localhost'),
                'PORT': os.environ.get('DB_PORT', '5432'),
            }
        }
        
        try:
            from django.db import connection
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                print("Manual database connection successful!")
        except Exception as e2:
            print(f"Manual connection failed: {e2}")
