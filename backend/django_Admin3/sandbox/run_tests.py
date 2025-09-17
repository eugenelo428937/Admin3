#!/usr/bin/env python
"""
Test runner script that properly sets up environment for TDD tests.

This script ensures the correct Django settings are used and provides
a clean test environment for PostgreSQL.
"""

import os
import sys
import django
from django.core.management import execute_from_command_line

# Force the correct settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.test_postgresql')

if __name__ == '__main__':
    print(f"[TEST RUNNER] Using settings: {os.environ.get('DJANGO_SETTINGS_MODULE')}")
    
    # Run Django setup
    django.setup()
    
    # Check if we should recreate the test database
    if '--fresh-db' in sys.argv:
        print("[TEST RUNNER] Recreating test database from scratch...")
        sys.argv.remove('--fresh-db')
        
        # Import after Django setup
        from django.conf import settings
        import psycopg2
        
        # Get database config
        db = settings.DATABASES['default']
        test_db_name = f"test_{db['NAME']}"
        
        # Connect and recreate database
        try:
            conn = psycopg2.connect(
                host=db['HOST'],
                port=db['PORT'],
                database='postgres',  # Connect to postgres to drop test DB
                user=db['USER'],
                password=db['PASSWORD']
            )
            conn.autocommit = True
            cursor = conn.cursor()
            
            # Force disconnect all sessions
            cursor.execute(f"""
                SELECT pg_terminate_backend(pid)
                FROM pg_stat_activity
                WHERE datname = '{test_db_name}' AND pid != pg_backend_pid();
            """)
            
            # Drop and recreate
            cursor.execute(f'DROP DATABASE IF EXISTS "{test_db_name}";')
            cursor.execute(f'CREATE DATABASE "{test_db_name}";')
            conn.close()
            print(f"[TEST RUNNER] Fresh database created: {test_db_name}")
        except Exception as e:
            print(f"[TEST RUNNER] Warning: Could not recreate database: {e}")
    
    # Prepare arguments for test command
    args = ['manage.py', 'test'] + sys.argv[1:]
    
    # Execute the test command
    execute_from_command_line(args)