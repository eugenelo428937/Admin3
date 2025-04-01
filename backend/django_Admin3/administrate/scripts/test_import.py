import os
import sys
import django
from pprint import pprint
from pathlib import Path

# Add project root to path
project_root = Path(__file__).resolve().parent.parent.parent
sys.path.append(str(project_root))

# Configure Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE',
                      'django_Admin3.settings.development')
django.setup()

from administrate.models import CourseTemplate
from administrate.services.api_service import AdministrateAPIService
from administrate.utils.event_importer import validate_course_template, validate_and_process_event_excel

def test_course_template_validation():
    """Simple script to test the course template validation function"""
    # Initialize API service    
    api_service = AdministrateAPIService()
    result = validate_and_process_event_excel(
        r"C:\Users\elo\OneDrive - BPP SERVICES LIMITED\Documents\Code\Admin3\backend\django_Admin3\administrate\src\EventSessionImportTemplate2025Stest.xlsx", "CB1_LO_6")
    if result:
        # print(f"✅ Found template: {result['title']} (ID: {result['id']})")
        # print(f"{result}")
        print(f"result")
    else:
        print(f"❌ Template validation failed")
    # Test with existing course templates
    # print("Fetching all course templates from local database...")
    # local_templates = CourseTemplate.objects.filter(is_active=True)
    # for template in local_templates[:5]:  # Test first 5 templates
    #     print(f"\nTesting local template: {template.code}")
    #     result = validate_course_template(api_service, template.code)
    #     if result:
    #         print(f"✅ Found template: {result['name']} (ID: {result['id']})")
    #     else:
    #         print(f"❌ Template validation failed")
    
    # # Test with a non-existent template
    # print("\nTesting non-existent template: NONEXISTENT123")
    # result = validate_course_template(api_service, "NONEXISTENT123")
    # if result:
    #     print(f"✅ Found template (unexpected): {result['name']}")
    # else:
    #     print(f"❌ Template not found (expected)")
    
    # # Test with case-insensitive search
    # if local_templates.exists():
    #     template = local_templates.first()
    #     lowercase_code = template.code.lower()
    #     print(f"\nTesting case-insensitive search: {lowercase_code}")
    #     result = validate_course_template(api_service, lowercase_code)
    #     if result:
    #         print(f"✅ Found template with case-insensitive search: {result['name']}")
    #     else:
    #         print(f"❌ Case-insensitive search failed")

if __name__ == "__main__":
    test_course_template_validation()
