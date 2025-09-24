#!/usr/bin/env python
"""
Fix for order 199 issue - add essential data extraction to checkout flow
This script patches the cart/views.py file to always extract contact/delivery data
"""
import os
import re

def apply_fix():
    views_file = "cart/views.py"

    # Read the file
    with open(views_file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find the target location and add the fix
    pattern = r'(# Continue with checkout - preference saving failure shouldn\'t block checkout\n\n)(            # Transfer session acknowledgments to order before T&C processing)'

    replacement = r'\1            # CRITICAL FIX: Always extract essential contact and delivery data for order records\n            # This runs regardless of whether user_preferences exist from rules engine\n            try:\n                self._extract_and_save_essential_order_data(order, user, user_preferences)\n                logger.info(f"Successfully extracted essential contact/delivery data for order {order.id}")\n            except Exception as e:\n                logger.warning(f"Failed to extract essential order data for order {order.id}: {str(e)}")\n                # Continue with checkout - this is logged but shouldn\'t block\n\n\2'

    if re.search(pattern, content):
        new_content = re.sub(pattern, replacement, content)

        # Write back the modified content
        with open(views_file, 'w', encoding='utf-8') as f:
            f.write(new_content)

        print("✓ Successfully patched cart/views.py")
        return True
    else:
        print("✗ Could not find the target location in cart/views.py")
        return False

def add_essential_data_extraction_method():
    views_file = "cart/views.py"

    # Read the file
    with open(views_file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Add the new method at the end of the class
    new_method = '''
    def _extract_and_save_essential_order_data(self, order, user, user_preferences=None):
        """
        CRITICAL FIX: Always extract essential contact and delivery data for orders
        This method runs regardless of whether user_preferences exist from rules engine
        """
        import logging
        logger = logging.getLogger(__name__)

        try:
            # Always try to extract contact data (essential for email/phone)
            self._extract_and_save_contact_data_fallback(order, user, user_preferences)
        except Exception as e:
            logger.warning(f"Failed to extract contact data for order {order.id}: {str(e)}")

        try:
            # Always try to extract delivery data (essential for address)
            self._extract_and_save_delivery_preferences_fallback(order, user, user_preferences)
        except Exception as e:
            logger.warning(f"Failed to extract delivery data for order {order.id}: {str(e)}")

    def _extract_and_save_contact_data_fallback(self, order, user, user_preferences=None):
        """Extract contact data from user_preferences or fallback to user profile"""
        from .models import OrderUserContact

        contact_data = {}

        # Try to get data from user_preferences first
        if user_preferences:
            for pref_key, pref_data in user_preferences.items():
                value = pref_data.get('value', '') if isinstance(pref_data, dict) else pref_data

                # Map preference keys to contact fields
                if 'phone' in pref_key.lower() or 'mobile' in pref_key.lower():
                    contact_data['mobile_phone'] = str(value)
                elif 'email' in pref_key.lower():
                    contact_data['email_address'] = str(value)

        # Fallback to user profile data if no preferences
        if not contact_data.get('email_address') and user:
            contact_data['email_address'] = user.email

        # Get phone from user profile if available
        if not contact_data.get('mobile_phone') and user:
            try:
                if hasattr(user, 'profile') and hasattr(user.profile, 'phone'):
                    contact_data['mobile_phone'] = str(user.profile.phone)
                elif hasattr(user, 'phone'):
                    contact_data['mobile_phone'] = str(user.phone)
            except:
                pass  # No phone data available

        # Create contact record if we have any data
        if contact_data:
            try:
                OrderUserContact.objects.create(order=order, **contact_data)
                logger.info(f"Created OrderUserContact for order {order.id} with fallback data")
            except Exception as e:
                logger.error(f"Failed to create OrderUserContact for order {order.id}: {str(e)}")

    def _extract_and_save_delivery_preferences_fallback(self, order, user, user_preferences=None):
        """Extract delivery data from user_preferences or fallback to user profile"""
        from .models import OrderDeliveryDetail

        delivery_data = {}

        # Try to get data from user_preferences first
        if user_preferences:
            for pref_key, pref_data in user_preferences.items():
                value = pref_data.get('value', '') if isinstance(pref_data, dict) else pref_data

                # Map preference keys to delivery fields
                if 'address' in pref_key.lower():
                    if 'line1' in pref_key.lower() or 'street' in pref_key.lower():
                        delivery_data['delivery_address_line_1'] = str(value)
                    elif 'line2' in pref_key.lower():
                        delivery_data['delivery_address_line_2'] = str(value)
                    elif 'city' in pref_key.lower():
                        delivery_data['delivery_address_city'] = str(value)
                    elif 'postcode' in pref_key.lower() or 'postal' in pref_key.lower():
                        delivery_data['delivery_address_postcode'] = str(value)
                    elif 'country' in pref_key.lower():
                        delivery_data['delivery_address_country'] = str(value)

        # Fallback to user profile address data if available
        if not delivery_data and user:
            try:
                if hasattr(user, 'profile'):
                    profile = user.profile
                    if hasattr(profile, 'address_line_1'):
                        delivery_data['delivery_address_line_1'] = str(profile.address_line_1)
                    if hasattr(profile, 'address_line_2'):
                        delivery_data['delivery_address_line_2'] = str(profile.address_line_2)
                    if hasattr(profile, 'city'):
                        delivery_data['delivery_address_city'] = str(profile.city)
                    if hasattr(profile, 'postcode'):
                        delivery_data['delivery_address_postcode'] = str(profile.postcode)
                    if hasattr(profile, 'country'):
                        delivery_data['delivery_address_country'] = str(profile.country)
            except:
                pass  # No profile address data available

        # Create delivery record if we have any data
        if delivery_data:
            try:
                OrderDeliveryDetail.objects.create(order=order, **delivery_data)
                logger.info(f"Created OrderDeliveryDetail for order {order.id} with fallback data")
            except Exception as e:
                logger.error(f"Failed to create OrderDeliveryDetail for order {order.id}: {str(e)}")
'''

    # Add the method before the last line of the class
    # Find the last method or end of class
    pattern = r'(\n)(\s+)(def [^}]+)(\n\n\n)$'
    if re.search(pattern, content):
        new_content = re.sub(pattern, r'\1\2\3' + new_method + r'\4', content)
    else:
        # Fallback: add at the end of the file
        new_content = content + new_method

    # Write back the modified content
    with open(views_file, 'w', encoding='utf-8') as f:
        f.write(new_content)

    print("✓ Successfully added essential data extraction methods")

if __name__ == "__main__":
    print("Applying fix for order data extraction...")

    if apply_fix():
        add_essential_data_extraction_method()
        print("✓ All fixes applied successfully")
    else:
        print("✗ Fix failed - please check the file manually")