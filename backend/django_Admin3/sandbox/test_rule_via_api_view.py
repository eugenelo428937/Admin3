#!/usr/bin/env python3
"""
Test holiday rule by calling the actual API view
"""

import os
import sys
import django
import json

# Add the parent directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from django.test import Client
from django.contrib.auth.models import AnonymousUser
from django.urls import reverse
import json

def test_holiday_rule_api():
    print("=== TESTING HOLIDAY RULE VIA API VIEW ===\n")

    client = Client()

    payload = {
        "entryPoint": "home_page_mount",
        "context": {
            "current_date": "2025-09-15",
            "page": {
                "name": "home",
                "path": "/"
            }
        }
    }

    print(f"Payload: {json.dumps(payload, indent=2)}")

    try:
        response = client.post(
            '/api/rules/engine/execute/',
            data=json.dumps(payload),
            content_type='application/json'
        )

        print(f"\nResponse Status: {response.status_code}")

        if response.status_code == 200:
            result = response.json()
            print(f"Response Data:")
            print(json.dumps(result, indent=2))
        else:
            print(f"Error: {response.content}")

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    test_holiday_rule_api()