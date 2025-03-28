# scripts/test_custom_field_db.py
import os
import django
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).resolve().parent.parent.parent
sys.path.append(str(project_root))

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "django-Admin3.settings")
django.setup()

from administrate.models import CustomField

def test_custom_field_creation():
    """Test creating a custom field in the database"""
    try:
        # Create a test field
        test_field = CustomField.objects.create(
            external_id='test_field_1',
            label='Test Field',
            field_type='TEXT',
            description='Test description',
            is_required=True,
            roles=['admin'],
            entity_type='Account'
        )
        print(f"Created test field: {test_field}")
        
        # Verify it exists
        retrieved = CustomField.objects.get(external_id='test_field_1')
        print(f"Retrieved field: {retrieved}")
        
        # Clean up
        test_field.delete()
        print("Test field deleted")
        
        return True
    except Exception as e:
        print(f"Error: {str(e)}")
        return False

if __name__ == "__main__":
    if test_custom_field_creation():
        print("Database operations test passed!")
    else:
        print("Database operations test failed!")
