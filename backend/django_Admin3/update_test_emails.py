#!/usr/bin/env python
"""
Script to update test_emails.py with email verification templates
"""

with open('utils/management/commands/test_emails.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Update the template choices
content = content.replace(
    "'account_activation', 'sample_email',",
    "'account_activation', 'email_verification', 'sample_email',"
)

content = content.replace(
    "'account_activation_content'",
    "'account_activation_content', 'email_verification_content'"
)

with open('utils/management/commands/test_emails.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated test_emails.py with email_verification templates") 