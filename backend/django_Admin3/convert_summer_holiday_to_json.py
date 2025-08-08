#!/usr/bin/env python
"""
Convert the summer holiday template to JSON content format
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

def convert_summer_holiday_template():
    """Convert the summer holiday template to use JSON format"""
    
    # Summer holiday JSON content structure
    json_content = {
        "message_container": {
            "element": "container",
            "text_align": "left",
            "class": "summer-holiday-notice",
            "title": "h4",
            "text": "Summer Holiday Notice"
        },
        "content": [
            {
                "seq": 1,
                "element": "box",
                "class": "alert alert-warning holiday-alert",
                "content": [
                    {
                        "seq": 1.1,
                        "element": "h5",
                        "text": "**Summer Holiday 09/08/2025 - 21/08/2025**",
                        "class": "holiday-dates"
                    },
                    {
                        "seq": 1.2,
                        "element": "p",
                        "text": "The office will be closed for summer holidays. Delivery might take longer than expected during this period.",
                        "class": "holiday-description"
                    },
                    {
                        "seq": 1.3,
                        "element": "p",
                        "text": "Please contact **{staff_name}** if there are any urgent orders that need immediate attention.",
                        "class": "contact-info"
                    }
                ]
            },
            {
                "seq": 2,
                "element": "box",
                "class": "holiday-tips",
                "content": [
                    {
                        "seq": 2.1,
                        "element": "h6",
                        "text": "Important Information:",
                        "class": "tips-title"
                    },
                    {
                        "seq": 2.2,
                        "element": "ul",
                        "text": [
                            "Orders placed before the holiday will be processed normally",
                            "Digital materials remain available during the closure",
                            "Customer support will resume after 21/08/2025",
                            "Emergency contacts are available for urgent matters"
                        ]
                    }
                ]
            }
        ]
    }
    
    try:
        # Get the existing summer holiday template
        template = MessageTemplate.objects.get(name='summer_holiday_2025')
        
        print(f"Found existing template: {template.name}")
        print(f"Current content format: {template.content_format}")
        print(f"Current variables: {template.variables}")
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
        print(f"[SUCCESS] JSON content structure: {len(json_content.get('content', []))} main elements")
        print(f"[SUCCESS] Template now uses content_format: {template.content_format}")
        print(f"[SUCCESS] Variables preserved: {template.variables}")
        
        return True
        
    except MessageTemplate.DoesNotExist:
        print("[ERROR] Template 'summer_holiday_2025' not found!")
        print("        Make sure the summer holiday rule setup has been run")
        return False
        
    except Exception as e:
        print(f"[ERROR] Error updating template: {str(e)}")
        return False

def main():
    """Main execution function"""
    print("Converting Summer Holiday template to JSON format...")
    print("=" * 60)
    
    success = convert_summer_holiday_template()
    
    print("=" * 60)
    if success:
        print("[SUCCESS] Summer Holiday template successfully updated to JSON format!")
        print("[INFO] The JSON content will now be rendered with Material UI components")
        print("[INFO] Enhanced styling and structure now available")
        print("[INFO] You can further customize the JSON structure in Django admin")
    else:
        print("[ERROR] Failed to update Summer Holiday template")
        print("[INFO] Make sure the template exists and database is accessible")
    
    return success

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)