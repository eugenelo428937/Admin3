#!/usr/bin/env python
"""
PostgreSQL Migration Fix for TDD Tests
Diagnoses and fixes the hanging auth migration issue
"""

import os
import sys
import django
import psycopg2
from django.conf import settings

def setup_django():
    """Setup Django environment"""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
    django.setup()

def check_postgresql_status():
    """Check PostgreSQL database status"""
    
    print("PostgreSQL Status Check")
    print("=" * 50)
    
    db_settings = settings.DATABASES['default']
    
    try:
        conn = psycopg2.connect(
            host=db_settings['HOST'],
            port=db_settings['PORT'], 
            database=db_settings['NAME'],
            user=db_settings['USER'],
            password=db_settings['PASSWORD']
        )
        print("OK: Main database connection successful")
        
        conn.autocommit = True
        cursor = conn.cursor()
        
        # Check if test database exists
        cursor.execute("SELECT 1 FROM pg_database WHERE datname='test_ACTEDDBDEV01'")
        test_db_exists = cursor.fetchone()
        
        if test_db_exists:
            print("FOUND: Test database 'test_ACTEDDBDEV01' exists")
            
            # Try to connect to test database
            try:
                test_conn = psycopg2.connect(
                    host=db_settings['HOST'],
                    port=db_settings['PORT'], 
                    database='test_ACTEDDBDEV01',
                    user=db_settings['USER'],
                    password=db_settings['PASSWORD']
                )
                test_conn.close()
                print("OK: Test database connection successful")
            except Exception as e:
                print(f"ERROR: Cannot connect to test database: {e}")
                
        else:
            print("NOT FOUND: Test database 'test_ACTEDDBDEV01' does not exist")
        
        # Check for blocking processes
        cursor.execute("""
            SELECT pid, state, query_start, left(query, 100) as query_snippet
            FROM pg_stat_activity 
            WHERE datname IN ('test_ACTEDDBDEV01', 'ACTEDDBDEV01')
            AND state != 'idle'
            AND query NOT LIKE '%pg_stat_activity%'
        """)
        
        active_queries = cursor.fetchall()
        if active_queries:
            print("\nACTIVE PROCESSES:")
            for pid, state, start, query in active_queries:
                print(f"  PID {pid}: {state} - {query}")
        else:
            print("OK: No blocking processes found")
            
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"ERROR: Database connection failed: {e}")
        return False

def fix_test_database():
    """Fix test database issues"""
    
    print("\nTest Database Fix")
    print("=" * 50)
    
    db_settings = settings.DATABASES['default']
    
    try:
        conn = psycopg2.connect(
            host=db_settings['HOST'],
            port=db_settings['PORT'], 
            database=db_settings['NAME'],
            user=db_settings['USER'],
            password=db_settings['PASSWORD']
        )
        
        conn.autocommit = True
        cursor = conn.cursor()
        
        print("Step 1: Dropping existing test database...")
        cursor.execute("DROP DATABASE IF EXISTS test_ACTEDDBDEV01")
        print("OK: Test database dropped")
        
        print("Step 2: Creating fresh test database...")
        cursor.execute("CREATE DATABASE test_ACTEDDBDEV01 WITH OWNER = postgres")
        print("OK: Fresh test database created")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"ERROR: Could not fix test database: {e}")
        return False

def test_migration_fix():
    """Test if migration fix worked"""
    
    print("\nTesting Migration Fix")
    print("=" * 50)
    
    import subprocess
    
    try:
        print("Running a single test method...")
        result = subprocess.run([
            'python', 'manage.py', 'test',
            'rules_engine.tests.test_stage1_rule_entry_point.Stage1RuleEntryPointTests.test_entry_point_creation_success',
            '--verbosity=1'
        ], capture_output=True, text=True, timeout=30)
        
        if result.returncode == 0:
            print("SUCCESS: Test completed without hanging!")
            return True
        else:
            print("WARNING: Test failed, but completed (no hanging)")
            print("STDOUT:", result.stdout[-500:])  # Last 500 chars
            print("STDERR:", result.stderr[-500:])
            return True  # No hanging is success
            
    except subprocess.TimeoutExpired:
        print("ERROR: Test still hanging after 30 seconds")
        return False
    except Exception as e:
        print(f"ERROR: Could not run test: {e}")
        return False

def main():
    """Main function"""
    
    print("PostgreSQL Migration Fix Tool")
    print("=" * 60)
    
    setup_django()
    
    # Step 1: Check current status
    if not check_postgresql_status():
        print("\nCannot connect to PostgreSQL. Check your database server.")
        return
    
    # Step 2: Ask user if they want to fix
    print("\n" + "=" * 60)
    response = input("Do you want to reset the test database? (y/n): ")
    
    if response.lower() == 'y':
        if fix_test_database():
            print("\nTest database reset complete!")
            
            # Step 3: Test the fix
            print("\n" + "=" * 60)  
            test_response = input("Test the migration fix now? (y/n): ")
            
            if test_response.lower() == 'y':
                if test_migration_fix():
                    print("\nSUCCESS: Migration issue fixed!")
                    print("You can now run TDD tests with PostgreSQL:")
                    print("python manage.py test rules_engine.tests.test_stage1_rule_entry_point --verbosity=2")
                else:
                    print("\nThe migration is still hanging. Try these alternatives:")
                    print("1. Restart PostgreSQL service")
                    print("2. Use SQLite for TDD tests")
                    print("3. Run tests with --keepdb flag")
        else:
            print("\nCould not fix test database.")
    
    print("\nAlternative commands if issues persist:")
    print("python manage.py test rules_engine.tests.test_stage1_rule_entry_point --keepdb --verbosity=2")
    print("python manage.py test rules_engine.tests --settings=django_Admin3.settings.test_settings --verbosity=2")

if __name__ == "__main__":
    main()