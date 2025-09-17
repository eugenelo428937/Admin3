#!/usr/bin/env python
"""
Test script for the new rules engine API
"""
import os
import django
import requests
import json

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

def test_rules_engine_endpoint():
    """Test the new rules engine API endpoint"""
    base_url = "http://127.0.0.1:8888"
    endpoint = f"{base_url}/api/rules/engine/evaluate/"
    
    # Test data for each entry point
    test_cases = [
        {
            'entry_point_code': 'home_page_mount',
            'context': {
                'current_date': '2025-08-24',
                'user_location': 'home_page'
            }
        },
        {
            'entry_point_code': 'product_list_mount',
            'context': {
                'search_mode': False,
                'total_products': 25
            }
        },
        {
            'entry_point_code': 'checkout_start',
            'context': {
                'cart_items': [{'id': 1, 'name': 'Test Product'}],
                'cart_total': 99.99
            }
        }
    ]
    
    print("🧪 Testing New Rules Engine API")
    print("=" * 50)
    
    for test_case in test_cases:
        entry_point = test_case['entry_point_code']
        print(f"\n🎯 Testing entry point: {entry_point}")
        
        try:
            response = requests.post(
                endpoint,
                json=test_case,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ Success: {result.get('rules_evaluated', 0)} rules evaluated")
                print(f"⏱️  Execution time: {result.get('execution_time_ms', 0):.2f}ms")
                
                messages = result.get('messages', [])
                if messages:
                    print(f"📨 Messages returned: {len(messages)}")
                    for msg in messages:
                        print(f"   - {msg.get('type', 'unknown')}: {msg.get('title', 'No title')}")
                else:
                    print("📭 No messages returned")
                    
            else:
                print(f"❌ Error: HTTP {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Details: {error_data}")
                except:
                    print(f"   Response: {response.text}")
                
        except requests.exceptions.ConnectionError:
            print("❌ Connection error: Is the Django server running on port 8888?")
        except Exception as e:
            print(f"❌ Exception: {e}")
    
    print("\n" + "=" * 50)
    print("🏁 Test completed!")

if __name__ == "__main__":
    test_rules_engine_endpoint()