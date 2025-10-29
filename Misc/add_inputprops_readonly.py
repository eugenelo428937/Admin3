"""
Script to add InputProps readOnly to TextField in DynamicAddressForm.
"""

# Read the file
with open(r'C:\Code\Admin3\frontend\react-Admin3\src\components\Address\DynamicAddressForm.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Add InputProps after variant="standard"
old_variant = '\t\t\t\tvariant="standard"\n\t\t\t/>'
new_variant = '\t\t\t\tvariant="standard"\n\t\t\t\tInputProps={{ readOnly: readonly }}\n\t\t\t/>'

if old_variant in content:
    content = content.replace(old_variant, new_variant)
    print("[OK] Added InputProps readOnly to TextField")
else:
    print("[ERROR] Could not find TextField variant to update")
    print("Searching for the pattern...")
    if 'variant="standard"' in content:
        idx = content.find('variant="standard"')
        print(f"Found at position {idx}")
        start = max(0, idx - 50)
        end = min(len(content), idx + 100)
        print(repr(content[start:end]))

# Also update country Select to use disabled prop
old_select = '\t\t\t\t\terror={!!displayError}\n\t\t\t\t\tvariant="standard"'
new_select = '\t\t\t\t\terror={!!displayError}\n\t\t\t\t\tdisabled={readonly}\n\t\t\t\t\tvariant="standard"'

if old_select in content:
    content = content.replace(old_select, new_select)
    print("[OK] Added disabled prop to country Select")
else:
    print("[WARNING] Could not find country Select to update")

# Write the updated content
with open(r'C:\Code\Admin3\frontend\react-Admin3\src\components\Address\DynamicAddressForm.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("\nDynamicAddressForm readonly implementation complete!")
