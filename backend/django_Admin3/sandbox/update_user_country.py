#!/usr/bin/env python
"""
Update user country for testing overseas scenarios
"""
import os
import sys
import django

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from django.contrib.auth.models import User
from userprofile.models import UserProfile
from userprofile.models.address import UserProfileAddress

def update_user_country(email, new_country):
    """Update user's country for testing"""

    try:
        user = User.objects.get(email=email)
        profile = UserProfile.objects.get(user=user)

        print(f"Updating country for {user.username} (ID: {user.id})")
        print(f"Changing to: {new_country}")

        # Update both HOME and WORK addresses
        updated = UserProfileAddress.objects.filter(user_profile=profile).update(country=new_country)

        if updated:
            print(f"\nSuccessfully updated {updated} address(es) to {new_country}")

            # Show the updated addresses
            addresses = UserProfileAddress.objects.filter(user_profile=profile)
            print("\nUpdated addresses:")
            for addr in addresses:
                print(f"  {addr.address_type}: {addr.country}")
        else:
            print("No addresses found to update")

        print("\n=== Expected Results ===")
        print(f"1. UK Import Tax Modal: WILL SHOW (user is now in {new_country})")
        print(f"2. ASET Warning: Will show if product_id 72 or 73 in cart")
        print(f"3. rules_evaluated: 2 (both rules processed)")
        print(f"4. UK import tax rule: condition_result=true")

    except User.DoesNotExist:
        print(f"User not found: {email}")
    except UserProfile.DoesNotExist:
        print(f"UserProfile not found for: {email}")

if __name__ == '__main__':
    # Change this to your desired country
    # Common overseas countries: Singapore, Malaysia, Hong Kong, Australia, USA, Canada, Germany, France

    import sys
    if len(sys.argv) > 1:
        country = sys.argv[1]
    else:
        country = "Singapore"  # Default overseas country

    update_user_country('eugene.lo1115@gmail.com', country)

    print("\n=== To restore to UK ===")
    print("Run: python update_user_country.py 'United Kingdom'")