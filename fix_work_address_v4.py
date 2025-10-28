"""
Script to fix the work address section - simpler approach, just SmartAddressInput block.
"""

# Read the file
with open(r'C:\Code\Admin3\frontend\react-Admin3\src\components\User\UserFormWizard.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Just replace the SmartAddressInput block for work
old_smart = """\t\t\t\t\t\t<SmartAddressInput
\t\t\t\t\t\t\tvalues={form}
\t\t\t\t\t\t\tonChange={handleChange}
\t\t\t\t\t\t\terrors={hasUserInteracted ? fieldErrors : {}}
\t\t\t\t\t\t\tfieldPrefix="work"
\t\t\t\t\t\t\tshakingFields={shakingFields}
\t\t\t\t\t\t/>"""

new_smart = """\t\t\t\t\t\t{/* Toggle between manual entry and smart address lookup */}
\t\t\t\t\t\t{!useSmartInputWork ? (
\t\t\t\t\t\t\t<Box>
\t\t\t\t\t\t\t\t<DynamicAddressForm
\t\t\t\t\t\t\t\t\tcountry={form.work_country}
\t\t\t\t\t\t\t\t\tvalues={form}
\t\t\t\t\t\t\t\t\tonChange={handleChange}
\t\t\t\t\t\t\t\t\terrors={hasUserInteracted ? fieldErrors : {}}
\t\t\t\t\t\t\t\t\tfieldPrefix="work"
\t\t\t\t\t\t\t\t\tshowOptionalFields={true}
\t\t\t\t\t\t\t\t\tshakingFields={shakingFields}
\t\t\t\t\t\t\t\t/>
\t\t\t\t\t\t\t\t<Box sx={{ textAlign: 'center', mt: 3 }}>
\t\t\t\t\t\t\t\t\t<Button
\t\t\t\t\t\t\t\t\t\tvariant="outlined"
\t\t\t\t\t\t\t\t\t\tstartIcon={<EditIcon />}
\t\t\t\t\t\t\t\t\t\tonClick={() => setUseSmartInputWork(true)}
\t\t\t\t\t\t\t\t\t>
\t\t\t\t\t\t\t\t\t\tUse address lookup
\t\t\t\t\t\t\t\t\t</Button>
\t\t\t\t\t\t\t\t</Box>
\t\t\t\t\t\t\t</Box>
\t\t\t\t\t\t) : (
\t\t\t\t\t\t\t<Box>
\t\t\t\t\t\t\t\t<Typography variant="body2" color="text.secondary" gutterBottom>
\t\t\t\t\t\t\t\t\tUsing smart address lookup
\t\t\t\t\t\t\t\t</Typography>
\t\t\t\t\t\t\t\t<SmartAddressInput
\t\t\t\t\t\t\t\t\tvalues={form}
\t\t\t\t\t\t\t\t\tonChange={handleChange}
\t\t\t\t\t\t\t\t\terrors={hasUserInteracted ? fieldErrors : {}}
\t\t\t\t\t\t\t\t\tfieldPrefix="work"
\t\t\t\t\t\t\t\t\tshakingFields={shakingFields}
\t\t\t\t\t\t\t\t/>
\t\t\t\t\t\t\t\t<Box sx={{ textAlign: 'center', mt: 2 }}>
\t\t\t\t\t\t\t\t\t<Button
\t\t\t\t\t\t\t\t\t\tvariant="text"
\t\t\t\t\t\t\t\t\t\tonClick={() => setUseSmartInputWork(false)}
\t\t\t\t\t\t\t\t\t\tsize="small"
\t\t\t\t\t\t\t\t\t>
\t\t\t\t\t\t\t\t\t\t← Back to manual entry
\t\t\t\t\t\t\t\t\t</Button>
\t\t\t\t\t\t\t\t</Box>
\t\t\t\t\t\t\t</Box>
\t\t\t\t\t\t)}"""

# Replace
if old_smart in content:
    content = content.replace(old_smart, new_smart)
    print("[OK] Work address SmartAddressInput successfully replaced")
else:
    print("[ERROR] Could not find work SmartAddressInput")
    print("Checking what we have:")
    if 'fieldPrefix="work"' in content:
        idx = content.find('fieldPrefix="work"')
        print(f"Found at position {idx}")
        start = max(0, idx - 200)
        end = min(len(content), idx + 50)
        print(repr(content[start:end]))

# Write the updated content
with open(r'C:\Code\Admin3\frontend\react-Admin3\src\components\User\UserFormWizard.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("\nUpdate attempt complete!")
