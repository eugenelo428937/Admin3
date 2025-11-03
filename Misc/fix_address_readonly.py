"""
Script to add readonly mode for address fields with edit button.
"""

# Read the file
with open(r'C:\Code\Admin3\frontend\react-Admin3\src\components\User\UserFormWizard.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update state declarations - add editing state for addresses
old_state = """\t// Address input mode state - false = manual entry, true = smart lookup
\tconst [useSmartInputHome, setUseSmartInputHome] = useState(false);
\tconst [useSmartInputWork, setUseSmartInputWork] = useState(false);"""

new_state = """\t// Address input mode state - false = manual entry, true = smart lookup
\tconst [useSmartInputHome, setUseSmartInputHome] = useState(false);
\tconst [useSmartInputWork, setUseSmartInputWork] = useState(false);
\t
\t// Address editing state - controls readonly vs editable mode
\tconst [isEditingHomeAddress, setIsEditingHomeAddress] = useState(!isProfileMode);
\tconst [isEditingWorkAddress, setIsEditingWorkAddress] = useState(!isProfileMode);"""

content = content.replace(old_state, new_state)

print("[OK] Added editing state for address fields")
print("\nUpdated state variables:")
print("  - isEditingHomeAddress: false in profile mode (readonly), true in registration mode")
print("  - isEditingWorkAddress: false in profile mode (readonly), true in registration mode")

# Write the updated content
with open(r'C:\Code\Admin3\frontend\react-Admin3\src\components\User\UserFormWizard.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("\nStep 1 complete: Added editing state")
print("Next: Update home and work address sections to support readonly mode")
