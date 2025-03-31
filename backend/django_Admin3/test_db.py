import os
import sys
from pathlib import Path
import django

# Print current directory and Python path for debugging
print(f"Current directory: {os.getcwd()}")

# Set the Django settings module to the proper path with development settings
os.environ["DJANGO_SETTINGS_MODULE"] = "django_Admin3.settings.development"
print(f"Setting DJANGO_SETTINGS_MODULE to: {os.environ['DJANGO_SETTINGS_MODULE']}")

# Add the project root to the path if needed
BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))
    print(f"Added {BASE_DIR} to Python path")

try:
    # Initialize Django
    django.setup()
    
    # Import settings and check database configuration
    from django.conf import settings
    
    # Print the loaded settings module
    print(f"\nLoaded settings module: {settings.SETTINGS_MODULE}")
    
    # Verify if DATABASES is configured
    if not hasattr(settings, 'DATABASES'):
        print("settings.DATABASES is missing!")
        sys.exit(1)
        
    if 'default' not in settings.DATABASES:
        print("No 'default' database in settings.DATABASES!")
        db_keys = list(settings.DATABASES.keys()) if hasattr(settings.DATABASES, 'keys') else "Not a dict"
        print(f"Available keys: {db_keys}")
        print(f"DATABASES content: {settings.DATABASES}")
        sys.exit(1)
        
    # Display database config
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
