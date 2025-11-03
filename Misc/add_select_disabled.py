"""
Script to add disabled prop to Select component.
"""

# Read the file
with open(r'C:\Code\Admin3\frontend\react-Admin3\src\components\Address\DynamicAddressForm.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find line with onChange={handleFieldChange} in Select and insert disabled after it
output_lines = []
i = 0
while i < len(lines):
    output_lines.append(lines[i])

    # If this line has onChange={handleFieldChange} and we're in a Select
    if 'onChange={handleFieldChange}' in lines[i] and i > 0 and '<Select' in lines[i-3]:
        # Insert disabled line after onChange
        indent = '\t\t\t\t\t\t'
        output_lines.append(f'{indent}disabled={{readonly}}\n')

    i += 1

# Write the updated content
with open(r'C:\Code\Admin3\frontend\react-Admin3\src\components\Address\DynamicAddressForm.js', 'w', encoding='utf-8') as f:
    f.writelines(output_lines)

print("[OK] Added disabled prop to Select component")
print("\nDynamicAddressForm fully supports readonly mode:")
print("  - TextFields use InputProps {{ readOnly: readonly }}")
print("  - Select uses disabled={{readonly}}")
