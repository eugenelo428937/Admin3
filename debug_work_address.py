"""
Debug script to see the exact content around work SmartAddressInput
"""

# Read the file
with open(r'C:\Code\Admin3\frontend\react-Admin3\src\components\User\UserFormWizard.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Find SmartAddressInput with work fieldPrefix
search = 'fieldPrefix="work"'
idx = content.find(search)

if idx > 0:
    # Show 200 characters before and after
    start = max(0, idx - 300)
    end = min(len(content), idx + 300)
    snippet = content[start:end]

    print("Found work SmartAddressInput at position", idx)
    print("\nContext around it:")
    print("="*80)
    print(repr(snippet))
    print("="*80)
else:
    print("Could not find work SmartAddressInput")
