#!/usr/bin/env python
"""
Script to update email_testing.py with email verification support
"""

with open('utils/email_testing.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Add email_verification to the master template check
old_check = "if template_name in ['order_confirmation', 'password_reset', 'password_reset_completed', 'account_activation']:"
new_check = "if template_name in ['order_confirmation', 'password_reset', 'password_reset_completed', 'account_activation', 'email_verification']:"

content = content.replace(old_check, new_check)

# Add email_verification to the content template map
old_map = "'account_activation': 'account_activation_content'"
new_map = "'account_activation': 'account_activation_content',\n                                'email_verification': 'email_verification_content'"

content = content.replace(old_map, new_map)

# Add email_verification to test_send_email method  
old_case = "elif template_name == 'account_activation':\n                return email_service.send_account_activation(recipient_email, context)"
new_case = "elif template_name == 'account_activation':\n                return email_service.send_account_activation(recipient_email, context)\n            \n            elif template_name == 'email_verification':\n                return email_service.send_email_verification(recipient_email, context)"

content = content.replace(old_case, new_case)

with open('utils/email_testing.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated email_testing.py with email_verification support") 