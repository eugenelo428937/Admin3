"""
Script to fix the work address section that wasn't updated by the first script.
"""

# Read the file
with open(r'C:\Code\Admin3\frontend\react-Admin3\src\components\User\UserFormWizard.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the work address SmartAddressInput section and replace it
# Look for the SmartAddressInput with fieldPrefix="work"
output_lines = []
i = 0
while i < len(lines):
    if 'fieldPrefix="work"' in lines[i] and 'SmartAddressInput' in lines[i-3]:
        # Found the work address SmartAddressInput section
        # Go back to find the start (after the Grid container with company/department)
        # Find the closing </Grid> tag before SmartAddressInput
        j = i - 1
        while j >= 0 and '</Grid>' not in lines[j]:
            j -= 1

        # Add all lines up to and including the </Grid>
        while len(output_lines) < j + 2:
            output_lines.append(lines[len(output_lines)])

        # Now add the new toggle logic
        indent = '\t\t\t\t\t\t'
        output_lines.append(f'{indent}\n')
        output_lines.append(f'{indent}{{/* Toggle between manual entry and smart address lookup */}}\n')
        output_lines.append(f'{indent}{{!useSmartInputWork ? (\n')
        output_lines.append(f'{indent}\t<Box>\n')
        output_lines.append(f'{indent}\t\t<DynamicAddressForm\n')
        output_lines.append(f'{indent}\t\t\tcountry={{form.work_country}}\n')
        output_lines.append(f'{indent}\t\t\tvalues={{form}}\n')
        output_lines.append(f'{indent}\t\t\tonChange={{handleChange}}\n')
        output_lines.append(f'{indent}\t\t\terrors={{hasUserInteracted ? fieldErrors : {{}}}}\n')
        output_lines.append(f'{indent}\t\t\tfieldPrefix="work"\n')
        output_lines.append(f'{indent}\t\t\tshowOptionalFields={{true}}\n')
        output_lines.append(f'{indent}\t\t\tshakingFields={{shakingFields}}\n')
        output_lines.append(f'{indent}\t\t/>\n')
        output_lines.append(f'{indent}\t\t<Box sx={{{{ textAlign: \'center\', mt: 3 }}}}>\n')
        output_lines.append(f'{indent}\t\t\t<Button\n')
        output_lines.append(f'{indent}\t\t\t\tvariant="outlined"\n')
        output_lines.append(f'{indent}\t\t\t\tstartIcon={{<EditIcon />}}\n')
        output_lines.append(f'{indent}\t\t\t\tonClick={{() => setUseSmartInputWork(true)}}\n')
        output_lines.append(f'{indent}\t\t\t>\n')
        output_lines.append(f'{indent}\t\t\t\tUse address lookup\n')
        output_lines.append(f'{indent}\t\t\t</Button>\n')
        output_lines.append(f'{indent}\t\t</Box>\n')
        output_lines.append(f'{indent}\t</Box>\n')
        output_lines.append(f'{indent}) : (\n')
        output_lines.append(f'{indent}\t<Box>\n')
        output_lines.append(f'{indent}\t\t<Typography variant="body2" color="text.secondary" gutterBottom>\n')
        output_lines.append(f'{indent}\t\t\tUsing smart address lookup\n')
        output_lines.append(f'{indent}\t\t</Typography>\n')
        output_lines.append(f'{indent}\t\t<SmartAddressInput\n')
        output_lines.append(f'{indent}\t\t\tvalues={{form}}\n')
        output_lines.append(f'{indent}\t\t\tonChange={{handleChange}}\n')
        output_lines.append(f'{indent}\t\t\terrors={{hasUserInteracted ? fieldErrors : {{}}}}\n')
        output_lines.append(f'{indent}\t\t\tfieldPrefix="work"\n')
        output_lines.append(f'{indent}\t\t\tshakingFields={{shakingFields}}\n')
        output_lines.append(f'{indent}\t\t/>\n')
        output_lines.append(f'{indent}\t\t<Box sx={{{{ textAlign: \'center\', mt: 2 }}}}>\n')
        output_lines.append(f'{indent}\t\t\t<Button\n')
        output_lines.append(f'{indent}\t\t\t\tvariant="text"\n')
        output_lines.append(f'{indent}\t\t\t\tonClick={{() => setUseSmartInputWork(false)}}\n')
        output_lines.append(f'{indent}\t\t\t\tsize="small"\n')
        output_lines.append(f'{indent}\t\t\t>\n')
        output_lines.append(f'{indent}\t\t\t\t← Back to manual entry\n')
        output_lines.append(f'{indent}\t\t\t</Button>\n')
        output_lines.append(f'{indent}\t\t</Box>\n')
        output_lines.append(f'{indent}\t</Box>\n')
        output_lines.append(f'{indent})}}\n')

        # Skip the old SmartAddressInput section (lines with SmartAddressInput and its closing tag)
        # Find the closing /> for SmartAddressInput
        k = i
        while k < len(lines) and '/>' not in lines[k]:
            k += 1
        i = k + 1  # Skip past the SmartAddressInput closing tag

        # Continue with the next lines
        continue
    else:
        output_lines.append(lines[i])
        i += 1

# Write the updated content
with open(r'C:\Code\Admin3\frontend\react-Admin3\src\components\User\UserFormWizard.js', 'w', encoding='utf-8') as f:
    f.writelines(output_lines)

print("[OK] Work address section updated with manual entry default")
print("\nWork address now:")
print("  - Shows all fields manually by default (DynamicAddressForm)")
print("  - Provides 'Use address lookup' button to switch to SmartAddressInput")
print("  - Allows toggling back to manual entry")
