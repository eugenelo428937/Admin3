# test_db.py
import os
import django
from django.conf import settings
from django.db import connection

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "django-Admin3.settings")
django.setup()


def test_db_connection():
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            print("Database connection successful!")

            # Print current database settings
            print("\nDatabase Settings:")
            db_settings = settings.DATABASES['default']
            print(f"Engine: {db_settings['ENGINE']}")
            print(f"Name: {db_settings['NAME']}")
            print(f"User: {db_settings['USER']}")
            print(f"Host: {db_settings['HOST']}")
            print(f"Port: {db_settings['PORT']}")

    except Exception as e:
        print(f"Database connection failed: {str(e)}")


if __name__ == "__main__":
    test_db_connection()
