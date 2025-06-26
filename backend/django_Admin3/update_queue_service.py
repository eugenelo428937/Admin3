#!/usr/bin/env python
"""
Script to update queue_service.py with email verification template mapping
"""

with open('utils/services/queue_service.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Add email_verification to the template map
old_mapping = "'account_activation': 'account_activation_content'"
new_mapping = "'account_activation': 'account_activation_content',\n                'email_verification': 'email_verification_content'"

content = content.replace(old_mapping, new_mapping)

with open('utils/services/queue_service.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated queue_service.py with email_verification template mapping") 