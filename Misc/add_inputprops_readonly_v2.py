"""
Script to add InputProps readOnly to TextField - version 2 with correct indentation.
"""

# Read the file
with open(r'C:\Code\Admin3\frontend\react-Admin3\src\components\Address\DynamicAddressForm.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Add InputProps after variant="standard" with correct tabs
old_variant = '\t\t\t\t}}\n\t\t\t\tvariant="standard"\n\t\t\t/>'
new_variant = '\t\t\t\t}}\n\t\t\t\tvariant="standard"\n\t\t\t\tInputProps={{ readOnly: readonly }}\n\t\t\t/>'

if old_variant in content:
    content = content.replace(old_variant, new_variant)
    print("[OK] Added InputProps readOnly to TextField")
else:
    print("[ERROR] Could not find TextField to update")

# Also update country Select
# Find the Select component for country
old_country = '\t\t\t\t\tonChange={handleCountryChange}\n\t\t\t\t\terror={!!displayError}\n\t\t\t\t\tvariant="standard"'
new_country = '\t\t\t\t\tonChange={handleCountryChange}\n\t\t\t\t\terror={!!displayError}\n\t\t\t\t\tdisabled={readonly}\n\t\t\t\t\tvariant="standard"'

if old_country in content:
    content = content.replace(old_country, new_country)
    print("[OK] Added disabled prop to country Select")
else:
    print("[WARNING] Could not find country Select to update")

# Write the updated content
with open(r'C:\Code\Admin3\frontend\react-Admin3\src\components\Address\DynamicAddressForm.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("\nDynamicAddressForm readonly implementation complete!")
print("  - TextFields use InputProps {{ readOnly: readonly }}")
print("  - Country Select uses disabled={readonly}")
