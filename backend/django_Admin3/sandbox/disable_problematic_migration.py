#!/usr/bin/env python
"""
Temporarily disable problematic migration for TDD testing
"""

import os
import shutil

def disable_migration():
    """Temporarily rename problematic migration"""
    
    migration_file = "exam_sessions_subjects_products/migrations/0004_create_acted_current_product_view.py"
    backup_file = migration_file + ".backup"
    
    if os.path.exists(migration_file):
        print(f"Backing up problematic migration: {migration_file}")
        shutil.copy2(migration_file, backup_file)
        
        # Create a dummy migration that does nothing
        dummy_content = '''from django.db import migrations

class Migration(migrations.Migration):
    dependencies = [
        ('exam_sessions_subjects_products', '0003_examsessionsubjectproductvariation_product_code'),
    ]
    
    operations = [
        # Temporarily disabled for TDD testing
        # Original view creation disabled due to missing tables in test database
    ]
'''
        
        with open(migration_file, 'w') as f:
            f.write(dummy_content)
            
        print(f"✓ Created dummy migration (original backed up to {backup_file})")
        return True
    else:
        print(f"Migration file not found: {migration_file}")
        return False

def restore_migration():
    """Restore original migration"""
    
    migration_file = "exam_sessions_subjects_products/migrations/0004_create_acted_current_product_view.py"
    backup_file = migration_file + ".backup"
    
    if os.path.exists(backup_file):
        print(f"Restoring original migration: {migration_file}")
        shutil.copy2(backup_file, migration_file)
        os.remove(backup_file)
        print(f"✓ Original migration restored")
        return True
    else:
        print(f"Backup file not found: {backup_file}")
        return False

def main():
    """Main function"""
    
    print("Migration Fix Tool")
    print("=" * 40)
    
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == 'restore':
        restore_migration()
    else:
        disable_migration()
        print("\nNow try running your TDD tests:")
        print("python manage.py test rules_engine.tests.test_stage1_rule_entry_point --verbosity=2 --keepdb")
        print("\nTo restore the original migration:")
        print("python disable_problematic_migration.py restore")

if __name__ == "__main__":
    main()