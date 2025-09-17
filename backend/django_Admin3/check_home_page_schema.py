#!/usr/bin/env python
"""
Check the home_page_context_v1 schema to see if it's suitable for product_list_mount
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from rules_engine.models import ActedRulesFields
import json

def check_home_page_schema():
    """Check the home page schema details"""
    print("Checking home_page_context_v1 schema...")

    try:
        home_schema = ActedRulesFields.objects.get(fields_id='home_page_context_v1')
        print(f"Schema ID: {home_schema.fields_id}")
        print(f"Active: {home_schema.is_active}")
        print(f"Schema:")
        print(json.dumps(home_schema.schema, indent=2))
        return home_schema
    except ActedRulesFields.DoesNotExist:
        print("home_page_context_v1 schema not found")
        return None

def create_simple_product_list_schema():
    """Create a simple schema for product list context"""
    print("\nCreating simple product_list_context_v1 schema...")

    schema = {
        "type": "object",
        "properties": {
            "page": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "path": {"type": "string"}
                }
            },
            "products": {
                "type": "object",
                "properties": {
                    "count": {"type": "integer"}
                }
            }
        },
        "additionalProperties": True
    }

    # Check if it already exists
    try:
        existing = ActedRulesFields.objects.get(fields_id='product_list_context_v1')
        print(f"Schema product_list_context_v1 already exists")
        return existing
    except ActedRulesFields.DoesNotExist:
        pass

    # Create new schema
    new_schema = ActedRulesFields.objects.create(
        fields_id='product_list_context_v1',
        schema=schema,
        is_active=True,
        description="Simple context schema for product list pages"
    )

    print(f"Created schema: {new_schema.fields_id}")
    print(f"Schema:")
    print(json.dumps(new_schema.schema, indent=2))
    return new_schema

if __name__ == '__main__':
    try:
        home_schema = check_home_page_schema()
        product_schema = create_simple_product_list_schema()
        print(f"\nProduct list schema ready: {product_schema.fields_id}")

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()