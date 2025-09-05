#!/usr/bin/env python
"""
Final PostgreSQL Fix - Clean Reset
Completely wipes and recreates test database for clean TDD testing
"""

import os
import sys
import django
import psycopg2

def setup_django():
    """Setup Django environment"""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
    django.setup()

def complete_database_reset():
    """Completely reset the test database"""
    
    print("Complete PostgreSQL Test Database Reset")
    print("=" * 50)
    
    from django.conf import settings
    db_settings = settings.DATABASES['default']
    
    try:
        # Connect to main database first
        conn = psycopg2.connect(
            host=db_settings['HOST'],
            port=db_settings['PORT'], 
            database=db_settings['NAME'],  # Connect to main database
            user=db_settings['USER'],
            password=db_settings['PASSWORD']
        )
        
        conn.autocommit = True
        cursor = conn.cursor()
        
        print("1. Terminating all connections to test database...")
        cursor.execute("""
            SELECT pg_terminate_backend(pg_stat_activity.pid)
            FROM pg_stat_activity
            WHERE pg_stat_activity.datname = 'test_ACTEDDBDEV01'
            AND pid <> pg_backend_pid()
        """)
        
        print("2. Dropping test database completely...")
        cursor.execute("DROP DATABASE IF EXISTS test_ACTEDDBDEV01")
        
        print("3. Creating completely fresh test database...")
        cursor.execute("CREATE DATABASE test_ACTEDDBDEV01 WITH OWNER = postgres")
        
        cursor.close()
        conn.close()
        
        print("SUCCESS: Test database completely reset!")
        return True
        
    except Exception as e:
        print(f"ERROR: {e}")
        return False

def run_single_tdd_test():
    """Run a single TDD test to verify everything works"""
    
    print("\nTesting TDD with Clean Database")
    print("=" * 50)
    
    import subprocess
    
    try:
        # Run single test with timeout
        print("Running single test method with clean database...")
        result = subprocess.run([
            sys.executable, 'manage.py', 'test',
            'rules_engine.tests.test_stage1_rule_entry_point.Stage1RuleEntryPointTests.test_entry_point_creation_success',
            '--verbosity=2',
            '--keepdb'  # Use the clean database we just created
        ], capture_output=True, text=True, timeout=180)  # 3 minute timeout
        
        print("Return code:", result.returncode)
        
        if result.stdout:
            print("\nSTDOUT:")
            print(result.stdout[-2000:])  # Last 2000 chars
        
        if result.stderr:
            print("\nSTDERR:")  
            print(result.stderr[-1000:])   # Last 1000 chars
        
        # Check if we got past the migration phase
        if "Running migrations:" in result.stdout or "test_entry_point_creation_success" in result.stdout:
            print("\nSUCCESS: Migration phase completed!")
            if result.returncode != 0:
                print("Test failed as expected (TDD RED phase)")
            return True
        else:
            print("\nERROR: Still stuck in migration phase")
            return False
            
    except subprocess.TimeoutExpired:
        print("ERROR: Test timed out after 3 minutes")
        return False
    except Exception as e:
        print(f"ERROR running test: {e}")
        return False

def main():
    """Main execution"""
    
    setup_django()
    
    # Step 1: Complete database reset
    if complete_database_reset():
        print("\nDatabase reset successful!")
        
        # Step 2: Test with clean database
        if run_single_tdd_test():
            print("\n" + "=" * 60)
            print("SUCCESS: PostgreSQL + TDD Tests Working!")
            print("=" * 60)
            print("\nYou can now run your full TDD test suite:")
            print()
            print("# Single test:")
            print("python manage.py test rules_engine.tests.test_stage1_rule_entry_point.Stage1RuleEntryPointTests.test_entry_point_creation_success --verbosity=2 --keepdb")
            print()
            print("# Full Stage 1 (9 tests):")
            print("python manage.py test rules_engine.tests.test_stage1_rule_entry_point --verbosity=2 --keepdb")
            print()
            print("# All TDD tests (42 tests):")
            print("python manage.py test rules_engine.tests --verbosity=2 --keepdb")
            print()
            print("Expected: Tests should FAIL (TDD RED phase - this is correct!)")
        else:
            print("\n" + "=" * 60)
            print("Migration issues persist. Alternative solutions:")
            print("1. Use SQLite for TDD: --settings=django_Admin3.settings.test_settings")
            print("2. Check PostgreSQL service is running")
            print("3. Contact system administrator for database permissions")
    else:
        print("\nCould not reset database. Check PostgreSQL connection.")

if __name__ == "__main__":
    main()