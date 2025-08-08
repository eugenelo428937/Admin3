#!/usr/bin/env python
"""
Update the existing T&C message template to use JSON content format
"""
import os
import sys
import json
import django

# Add the project directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set up Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "django_Admin3.settings.development")
django.setup()

from rules_engine.models import MessageTemplate

def update_tc_template():
    """Update the general T&C template to use JSON format"""
    
    # Sample JSON content structure
    json_content = {
        "message_container": {
            "element": "container",
            "text_align": "left",
            "class": "terms-conditions-content",
            "title": "h4",
            "text": "Terms & Conditions"
        },
        "content": [
            {
                "seq": 1,
                "element": "p",
                "text": "By completing this purchase, you agree to our Terms & Conditions which include:"
            },
            {
                "seq": 2,
                "element": "ul",
                "text": [
                    "Product delivery terms and conditions",
                    "Refund and cancellation policy",
                    "Academic integrity requirements",
                    "Data protection and privacy policy"
                ]
            },
            {
                "seq": 3,
                "element": "p",
                "text": "You can view our full [/terms-and-conditions](Terms & Conditions) and [/privacy-policy](Privacy Policy)."
            },
            {
                "seq": 4,
                "element": "p",
                "text": "**This acceptance is required to complete your order.**"
            }
        ]
    }
    
    try:
        # Get the existing T&C template
        template = MessageTemplate.objects.get(name='general_terms_conditions')
        
        print(f"Found existing template: {template.name}")
        print(f"Current content format: {template.content_format}")
        print(f"Current content length: {len(template.content)}")
        
        # Update to JSON format
        template.content_format = 'json'
        template.json_content = json_content
        
        # Keep the original HTML content as backup
        if not template.content.startswith('<!-- Converted to JSON'):
            template.content = f"""<!-- Converted to JSON format on migration -->
{template.content}"""
        
        template.save()
        
        print(f"[SUCCESS] Successfully updated template '{template.name}' to JSON format")
        print(f"[SUCCESS] JSON content structure: {len(json_content.get('content', []))} elements")
        print(f"[SUCCESS] Template now uses content_format: {template.content_format}")
        
        return True
        
    except MessageTemplate.DoesNotExist:
        print("[ERROR] Template 'general_terms_conditions' not found!")
        print("        Make sure you've run the setup_tc_rules.py script first")
        return False
        
    except Exception as e:
        print(f"[ERROR] Error updating template: {str(e)}")
        return False

def main():
    """Main execution function"""
    print("Updating T&C message template to JSON format...")
    print("=" * 60)
    
    success = update_tc_template()
    
    print("=" * 60)
    if success:
        print("[SUCCESS] T&C template successfully updated to JSON format!")
        print("[INFO] The JSON content will now be rendered with Material UI components")
        print("[INFO] You can further customize the JSON structure in Django admin")
    else:
        print("[ERROR] Failed to update T&C template")
        print("[INFO] Make sure the template exists and database is accessible")
    
    return success

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)