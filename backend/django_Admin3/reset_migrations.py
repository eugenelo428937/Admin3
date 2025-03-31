from django.db import connection
import django
import os

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "django_Admin3.settings.development")
django.setup()

# Reset migration history for administrate app
with connection.cursor() as cursor:
    cursor.execute("DELETE FROM django_migrations WHERE app = 'administrate';")
    print("Deleted migration history for administrate app")

# Create schema if not exists
with connection.cursor() as cursor:
    cursor.execute("CREATE SCHEMA IF NOT EXISTS adm;")
    print("Created schema 'adm' if it didn't exist")

print("Migration reset complete")
# EOL

# # Run the reset script
# python reset_migrations.py

# # Remove existing migrations
# rm - rf administrate/migrations/

# # Create __init__.py in migrations directory
# mkdir - p administrate/migrations
# touch administrate/migrations/__init__.py

# # Create fresh migrations
# python manage.py makemigrations administrate

# # Apply migrations
# python manage.py migrate administrate
