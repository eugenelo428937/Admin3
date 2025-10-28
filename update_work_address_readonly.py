"""
Script to update work address section with readonly mode support.
"""

# Read the file
with open(r'C:\Code\Admin3\frontend\react-Admin3\src\components\User\UserFormWizard.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Find and replace the work address SmartAddressInput section with readonly support
old_work = """\t\t\t\t\t\t\t\t{/* Toggle between manual entry and smart address lookup */}
\t\t\t\t\t\t\t\t{!useSmartInputWork ? (
\t\t\t\t\t\t\t\t\t<Box>
\t\t\t\t\t\t\t\t\t\t<DynamicAddressForm
\t\t\t\t\t\t\t\t\t\t\tcountry={form.work_country}
\t\t\t\t\t\t\t\t\t\t\tvalues={form}
\t\t\t\t\t\t\t\t\t\t\tonChange={handleChange}
\t\t\t\t\t\t\t\t\t\t\terrors={hasUserInteracted ? fieldErrors : {}}
\t\t\t\t\t\t\t\t\t\t\tfieldPrefix="work"
\t\t\t\t\t\t\t\t\t\t\tshowOptionalFields={true}
\t\t\t\t\t\t\t\t\t\t\tshakingFields={shakingFields}
\t\t\t\t\t\t\t\t\t\t/>
\t\t\t\t\t\t\t\t\t\t<Box sx={{ textAlign: 'center', mt: 3 }}>
\t\t\t\t\t\t\t\t\t\t\t<Button
\t\t\t\t\t\t\t\t\t\t\t\tvariant="outlined"
\t\t\t\t\t\t\t\t\t\t\t\tstartIcon={<EditIcon />}
\t\t\t\t\t\t\t\t\t\t\t\tonClick={() => setUseSmartInputWork(true)}
\t\t\t\t\t\t\t\t\t\t\t>
\t\t\t\t\t\t\t\t\t\t\t\tUse address lookup
\t\t\t\t\t\t\t\t\t\t\t</Button>
\t\t\t\t\t\t\t\t\t\t</Box>
\t\t\t\t\t\t\t\t\t</Box>
\t\t\t\t\t\t\t\t) : (
\t\t\t\t\t\t\t\t\t<Box>
\t\t\t\t\t\t\t\t\t\t<Typography variant="body2" color="text.secondary" gutterBottom>
\t\t\t\t\t\t\t\t\t\t\tUsing smart address lookup
\t\t\t\t\t\t\t\t\t\t</Typography>
\t\t\t\t\t\t\t\t\t\t<SmartAddressInput
\t\t\t\t\t\t\t\t\t\t\tvalues={form}
\t\t\t\t\t\t\t\t\t\t\tonChange={handleChange}
\t\t\t\t\t\t\t\t\t\t\terrors={hasUserInteracted ? fieldErrors : {}}
\t\t\t\t\t\t\t\t\t\t\tfieldPrefix="work"
\t\t\t\t\t\t\t\t\t\t\tshakingFields={shakingFields}
\t\t\t\t\t\t\t\t\t\t/>
\t\t\t\t\t\t\t\t\t\t<Box sx={{ textAlign: 'center', mt: 2 }}>
\t\t\t\t\t\t\t\t\t\t\t<Button
\t\t\t\t\t\t\t\t\t\t\t\tvariant="text"
\t\t\t\t\t\t\t\t\t\t\t\tonClick={() => setUseSmartInputWork(false)}
\t\t\t\t\t\t\t\t\t\t\t\tsize="small"
\t\t\t\t\t\t\t\t\t\t\t>
\t\t\t\t\t\t\t\t\t\t\t\t← Back to manual entry
\t\t\t\t\t\t\t\t\t\t\t</Button>
\t\t\t\t\t\t\t\t\t\t</Box>
\t\t\t\t\t\t\t\t\t</Box>
\t\t\t\t\t\t\t\t)}"""

new_work = """\t\t\t\t\t\t\t\t{/* Readonly mode in profile, editable in registration */}
\t\t\t\t\t\t\t\t{!isEditingWorkAddress ? (
\t\t\t\t\t\t\t\t\t<Box>
\t\t\t\t\t\t\t\t\t\t<DynamicAddressForm
\t\t\t\t\t\t\t\t\t\t\tcountry={form.work_country}
\t\t\t\t\t\t\t\t\t\t\tvalues={form}
\t\t\t\t\t\t\t\t\t\t\tonChange={handleChange}
\t\t\t\t\t\t\t\t\t\t\terrors={hasUserInteracted ? fieldErrors : {}}
\t\t\t\t\t\t\t\t\t\t\tfieldPrefix="work"
\t\t\t\t\t\t\t\t\t\t\tshowOptionalFields={true}
\t\t\t\t\t\t\t\t\t\t\treadonly={true}
\t\t\t\t\t\t\t\t\t\t\tshakingFields={shakingFields}
\t\t\t\t\t\t\t\t\t\t/>
\t\t\t\t\t\t\t\t\t\t<Box sx={{ textAlign: 'center', mt: 3 }}>
\t\t\t\t\t\t\t\t\t\t\t<Button
\t\t\t\t\t\t\t\t\t\t\t\tvariant="contained"
\t\t\t\t\t\t\t\t\t\t\t\tstartIcon={<EditIcon />}
\t\t\t\t\t\t\t\t\t\t\t\tonClick={() => setIsEditingWorkAddress(true)}
\t\t\t\t\t\t\t\t\t\t\t>
\t\t\t\t\t\t\t\t\t\t\t\tEdit Address
\t\t\t\t\t\t\t\t\t\t\t</Button>
\t\t\t\t\t\t\t\t\t\t</Box>
\t\t\t\t\t\t\t\t\t</Box>
\t\t\t\t\t\t\t\t) : (
\t\t\t\t\t\t\t\t\t<Box>
\t\t\t\t\t\t\t\t\t\t{/* Toggle between manual entry and smart address lookup */}
\t\t\t\t\t\t\t\t\t\t{!useSmartInputWork ? (
\t\t\t\t\t\t\t\t\t\t\t<Box>
\t\t\t\t\t\t\t\t\t\t\t\t<DynamicAddressForm
\t\t\t\t\t\t\t\t\t\t\t\t\tcountry={form.work_country}
\t\t\t\t\t\t\t\t\t\t\t\t\tvalues={form}
\t\t\t\t\t\t\t\t\t\t\t\t\tonChange={handleChange}
\t\t\t\t\t\t\t\t\t\t\t\t\terrors={hasUserInteracted ? fieldErrors : {}}
\t\t\t\t\t\t\t\t\t\t\t\t\tfieldPrefix="work"
\t\t\t\t\t\t\t\t\t\t\t\t\tshowOptionalFields={true}
\t\t\t\t\t\t\t\t\t\t\t\t\tshakingFields={shakingFields}
\t\t\t\t\t\t\t\t\t\t\t\t/>
\t\t\t\t\t\t\t\t\t\t\t\t<Box sx={{ textAlign: 'center', mt: 3, display: 'flex', gap: 2, justifyContent: 'center' }}>
\t\t\t\t\t\t\t\t\t\t\t\t\t<Button
\t\t\t\t\t\t\t\t\t\t\t\t\t\tvariant="outlined"
\t\t\t\t\t\t\t\t\t\t\t\t\t\tonClick={() => setUseSmartInputWork(true)}
\t\t\t\t\t\t\t\t\t\t\t\t\t>
\t\t\t\t\t\t\t\t\t\t\t\t\t\tUse address lookup
\t\t\t\t\t\t\t\t\t\t\t\t\t</Button>
\t\t\t\t\t\t\t\t\t\t\t\t\t{isProfileMode && (
\t\t\t\t\t\t\t\t\t\t\t\t\t\t<Button
\t\t\t\t\t\t\t\t\t\t\t\t\t\t\tvariant="text"
\t\t\t\t\t\t\t\t\t\t\t\t\t\t\tonClick={() => setIsEditingWorkAddress(false)}
\t\t\t\t\t\t\t\t\t\t\t\t\t\t>
\t\t\t\t\t\t\t\t\t\t\t\t\t\t\tCancel
\t\t\t\t\t\t\t\t\t\t\t\t\t\t</Button>
\t\t\t\t\t\t\t\t\t\t\t\t\t)}
\t\t\t\t\t\t\t\t\t\t\t\t</Box>
\t\t\t\t\t\t\t\t\t\t\t</Box>
\t\t\t\t\t\t\t\t\t\t) : (
\t\t\t\t\t\t\t\t\t\t\t<Box>
\t\t\t\t\t\t\t\t\t\t\t\t<Typography variant="body2" color="text.secondary" gutterBottom>
\t\t\t\t\t\t\t\t\t\t\t\t\tUsing smart address lookup
\t\t\t\t\t\t\t\t\t\t\t\t</Typography>
\t\t\t\t\t\t\t\t\t\t\t\t<SmartAddressInput
\t\t\t\t\t\t\t\t\t\t\t\t\tvalues={form}
\t\t\t\t\t\t\t\t\t\t\t\t\tonChange={handleChange}
\t\t\t\t\t\t\t\t\t\t\t\t\terrors={hasUserInteracted ? fieldErrors : {}}
\t\t\t\t\t\t\t\t\t\t\t\t\tfieldPrefix="work"
\t\t\t\t\t\t\t\t\t\t\t\t\tshakingFields={shakingFields}
\t\t\t\t\t\t\t\t\t\t\t\t/>
\t\t\t\t\t\t\t\t\t\t\t\t<Box sx={{ textAlign: 'center', mt: 2, display: 'flex', gap: 2, justifyContent: 'center' }}>
\t\t\t\t\t\t\t\t\t\t\t\t\t<Button
\t\t\t\t\t\t\t\t\t\t\t\t\t\tvariant="text"
\t\t\t\t\t\t\t\t\t\t\t\t\t\tonClick={() => setUseSmartInputWork(false)}
\t\t\t\t\t\t\t\t\t\t\t\t\t\tsize="small"
\t\t\t\t\t\t\t\t\t\t\t\t\t>
\t\t\t\t\t\t\t\t\t\t\t\t\t\t← Back to manual entry
\t\t\t\t\t\t\t\t\t\t\t\t\t</Button>
\t\t\t\t\t\t\t\t\t\t\t\t\t{isProfileMode && (
\t\t\t\t\t\t\t\t\t\t\t\t\t\t<Button
\t\t\t\t\t\t\t\t\t\t\t\t\t\t\tvariant="text"
\t\t\t\t\t\t\t\t\t\t\t\t\t\t\tonClick={() => setIsEditingWorkAddress(false)}
\t\t\t\t\t\t\t\t\t\t\t\t\t\t>
\t\t\t\t\t\t\t\t\t\t\t\t\t\t\tCancel
\t\t\t\t\t\t\t\t\t\t\t\t\t\t</Button>
\t\t\t\t\t\t\t\t\t\t\t\t\t)}
\t\t\t\t\t\t\t\t\t\t\t\t</Box>
\t\t\t\t\t\t\t\t\t\t\t</Box>
\t\t\t\t\t\t\t\t\t\t)}
\t\t\t\t\t\t\t\t\t</Box>
\t\t\t\t\t\t\t\t)}"""

if old_work in content:
    content = content.replace(old_work, new_work)
    print("[OK] Work address section updated with readonly mode")
else:
    print("[ERROR] Could not find work address section to update")

# Write the updated content
with open(r'C:\Code\Admin3\frontend\react-Admin3\src\components\User\UserFormWizard.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("\nWork address now supports:")
print("  - Readonly mode by default in profile mode")
print("  - 'Edit Address' button to enable editing")
print("  - Manual entry or smart lookup when editing")
print("  - 'Cancel' button to return to readonly mode in profile mode")
