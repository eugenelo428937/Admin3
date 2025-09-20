"""
Clean up failed template creation
"""
import os
import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "django_Admin3.settings.development")
django.setup()

from rules_engine.models import MessageTemplate

# Delete the template we just created
template = MessageTemplate.objects.filter(name="special_needs_preference_template").first()
if template:
    print(f"Deleting template ID: {template.id}")
    template.delete()
    print("Template deleted successfully")
else:
    print("Template not found")