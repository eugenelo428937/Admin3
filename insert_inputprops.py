"""
Script to insert InputProps readOnly line before closing /> in TextField.
"""

# Read the file
with open(r'C:\Code\Admin3\frontend\react-Admin3\src\components\Address\DynamicAddressForm.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find line with variant="standard" and insert InputProps before the next />
output_lines = []
i = 0
while i < len(lines):
    output_lines.append(lines[i])

    # If this line has variant="standard" and next line has />
    if 'variant="standard"' in lines[i] and i + 1 < len(lines) and '/>' in lines[i + 1]:
        # Insert InputProps line before the />
        indent = '\t\t\t\t'
        output_lines.append(f'{indent}InputProps={{{{ readOnly: readonly }}}}\n')

    i += 1

# Write the updated content
with open(r'C:\Code\Admin3\frontend\react-Admin3\src\components\Address\DynamicAddressForm.js', 'w', encoding='utf-8') as f:
    f.writelines(output_lines)

print("[OK] Added InputProps readOnly to TextField")
print("\nDynamicAddressForm now properly supports readonly mode")
