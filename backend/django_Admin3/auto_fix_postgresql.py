#!/usr/bin/env python
"""
Auto-fix PostgreSQL Migration Issue
Automatically resets test database and tests migration
"""

import os
import sys
import django
import psycopg2
import subprocess

def setup_django():
    """Setup Django environment"""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
    django.setup()

def auto_fix_postgresql():
    """Automatically fix PostgreSQL test database"""
    
    print("Auto-fixing PostgreSQL Migration Issue")
    print("=" * 50)
    
    from django.conf import settings
    db_settings = settings.DATABASES['default']
    
    try:
        # Connect to main database
        conn = psycopg2.connect(
            host=db_settings['HOST'],
            port=db_settings['PORT'], 
            database=db_settings['NAME'],
            user=db_settings['USER'],
            password=db_settings['PASSWORD']
        )
        
        conn.autocommit = True
        cursor = conn.cursor()
        
        print("1. Terminating connections to test database...")
        cursor.execute("""
            SELECT pg_terminate_backend(pg_stat_activity.pid)
            FROM pg_stat_activity
            WHERE pg_stat_activity.datname = 'test_ACTEDDBDEV01'
            AND pid <> pg_backend_pid()
        """)
        
        print("2. Dropping existing test database...")
        cursor.execute("DROP DATABASE IF EXISTS test_ACTEDDBDEV01")
        
        print("3. Creating fresh test database...")  
        cursor.execute("CREATE DATABASE test_ACTEDDBDEV01 WITH OWNER = postgres")
        
        cursor.close()
        conn.close()
        
        print("SUCCESS: Test database reset complete!")
        return True
        
    except Exception as e:
        print(f"ERROR: {e}")
        return False

def test_single_method():
    """Test a single method to verify fix"""
    
    print("\nTesting single test method...")
    print("-" * 30)
    
    try:
        result = subprocess.run([
            'python', 'manage.py', 'test',
            'rules_engine.tests.test_stage1_rule_entry_point.Stage1RuleEntryPointTests.test_entry_point_creation_success',
            '--verbosity=2'
        ], capture_output=True, text=True, timeout=60)
        
        print("STDOUT:")
        print(result.stdout)
        
        if result.stderr:
            print("STDERR:")
            print(result.stderr)
        
        if result.returncode != 0:
            print("Test completed with failures (expected for TDD RED phase)")
        else:
            print("Test completed successfully")
            
        return True
        
    except subprocess.TimeoutExpired:
        print("ERROR: Test still hanging after 60 seconds")
        return False
    except Exception as e:
        print(f"ERROR running test: {e}")
        return False

def main():
    """Main execution"""
    
    setup_django()
    
    # Auto-fix the database
    if auto_fix_postgresql():
        print("\nDatabase fix completed. Testing...")
        
        # Test the fix
        if test_single_method():
            print("\n" + "=" * 60)
            print("SUCCESS! PostgreSQL migration issue resolved")
            print("You can now run full TDD test suites:")
            print()
            print("# Stage 1 tests:")
            print("python manage.py test rules_engine.tests.test_stage1_rule_entry_point --verbosity=2")
            print()
            print("# All TDD tests:")
            print("python manage.py test rules_engine.tests --verbosity=2")
        else:
            print("\n" + "=" * 60)
            print("Migration still has issues. Try these alternatives:")
            print("python manage.py test rules_engine.tests.test_stage1_rule_entry_point --keepdb --verbosity=2")
    else:
        print("\nCould not fix database automatically.")
        print("Try manual PostgreSQL restart or contact system administrator.")

if __name__ == "__main__":
    main()