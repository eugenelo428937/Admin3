#!/usr/bin/env python
"""
Test cart API with authentication using live server
"""
import requests
import json

def test_cart_with_auth():
    """Test cart API with authentication via live server"""
    print("=" * 60)
    print("CART AUTHENTICATION TEST")
    print("=" * 60)
    
    base_url = "http://127.0.0.1:8888"
    
    # First, let's try to login with the test user
    login_data = {
        "username": "testcart_user@example.com",
        "password": "testpass123"
    }
    
    print("1. Attempting login...")
    
    try:
        # Login to get JWT token
        login_response = requests.post(f"{base_url}/api/auth/login/", json=login_data)
        
        print(f"Login status: {login_response.status_code}")
        
        if login_response.status_code == 200:
            login_result = login_response.json()
            print(f"Login response: {json.dumps(login_result, indent=2)}")
            access_token = login_result.get('token') or login_result.get('access')
            
            if access_token:
                print("Login successful, got access token")
                
                # Now make authenticated cart request
                headers = {
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                }
                
                print("\n2. Fetching cart with authentication...")
                cart_response = requests.get(f"{base_url}/api/cart/", headers=headers)
                
                print(f"Cart status: {cart_response.status_code}")
                
                if cart_response.status_code == 200:
                    cart_data = cart_response.json()
                    
                    print(f"Cart data keys: {list(cart_data.keys())}")
                    print(f"Has user_context: {'user_context' in cart_data}")
                    
                    if 'user_context' in cart_data:
                        user_ctx = cart_data['user_context']
                        print(f"User context: {json.dumps(user_ctx, indent=2)}")
                        
                        # Test the rules engine with this context
                        print("\n3. Testing rules engine with cart context...")
                        
                        rules_context = {
                            "cart": {
                                "id": cart_data.get("id"),
                                "items": cart_data.get("items", [])
                            },
                            "user": user_ctx
                        }
                        
                        rules_response = requests.post(
                            f"{base_url}/api/rules/engine/execute/",
                            headers=headers,
                            json={
                                "entryPoint": "checkout_start",
                                "context": rules_context
                            }
                        )
                        
                        print(f"Rules engine status: {rules_response.status_code}")
                        
                        if rules_response.status_code == 200:
                            rules_result = rules_response.json()
                            print(f"Rules result: {json.dumps(rules_result, indent=2)}")
                        else:
                            print(f"Rules engine error: {rules_response.text}")
                        
                        return True
                    else:
                        print("ERROR: No user_context in cart response")
                        print(f"Full cart response: {json.dumps(cart_data, indent=2)}")
                        return False
                else:
                    print(f"Cart request failed: {cart_response.text}")
                    return False
            else:
                print("ERROR: No access token in login response")
                return False
        else:
            print(f"Login failed: {login_response.text}")
            return False
            
    except Exception as e:
        print(f"ERROR: {e}")
        return False

if __name__ == "__main__":
    success = test_cart_with_auth()
    print(f"\nTest result: {'SUCCESS' if success else 'FAILED'}")