#!/usr/bin/env python3
"""
Test script to verify user profile API response format for phone numbers.
"""
import requests
import json
import sys

def test_user_profile_api():
    """Test the user profile API to check phone number format"""

    # Login to get JWT token
    login_url = "http://127.0.0.1:8888/api/auth/login/"
    login_data = {
        "email": "eugene.lo1115@gmail.com",
        "password": "P@ssw0rd!"
    }

    print("Logging in...")
    try:
        login_response = requests.post(login_url, json=login_data)
        login_response.raise_for_status()

        login_result = login_response.json()
        if login_result.get("status") != "success":
            print(f"Login failed: {login_result.get('message')}")
            return False

        access_token = login_result.get("data", {}).get("access_token")
        if not access_token:
            print("No access token received")
            return False

        print("Login successful")

        # Get user profile
        profile_url = "http://127.0.0.1:8888/api/users/profile/"
        headers = {"Authorization": f"Bearer {access_token}"}

        print("Fetching user profile...")
        profile_response = requests.get(profile_url, headers=headers)
        profile_response.raise_for_status()

        profile_result = profile_response.json()
        if profile_result.get("status") != "success":
            print(f"Profile fetch failed: {profile_result.get('message')}")
            return False

        profile_data = profile_result.get("data", {})

        print("Profile fetch successful")
        print("\nProfile Data Structure:")
        print(json.dumps(profile_data, indent=2))

        # Check phone number format
        contact_numbers = profile_data.get("contact_numbers", {})
        profile_section = profile_data.get("profile", {})

        print("\nPhone Number Analysis:")
        print(f"Contact Numbers: {contact_numbers}")
        print(f"Profile Section: {profile_section}")

        # Check if phone numbers exist in contact_numbers
        if contact_numbers:
            print("Phone numbers found in contact_numbers:")
            for phone_type, number in contact_numbers.items():
                print(f"  - {phone_type}: {number}")
        else:
            print("No phone numbers found in contact_numbers")

        # Check if phone numbers exist in profile section
        phone_fields_in_profile = {k: v for k, v in profile_section.items() if 'phone' in k}
        if phone_fields_in_profile:
            print("Phone numbers also found in profile section:")
            for phone_type, number in phone_fields_in_profile.items():
                print(f"  - {phone_type}: {number}")

        return True

    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")
        return False
    except Exception as e:
        print(f"Unexpected error: {e}")
        return False

if __name__ == "__main__":
    success = test_user_profile_api()
    sys.exit(0 if success else 1)