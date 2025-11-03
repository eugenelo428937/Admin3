"""
Script to update home address section with readonly mode support.
"""

# Read the file
with open(r'C:\Code\Admin3\frontend\react-Admin3\src\components\User\UserFormWizard.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Find and replace the home address case 2 section with readonly support
old_case2 = """\t\t\tcase 2:
\t\t\t\treturn (
\t\t\t\t\t<Box>
\t\t\t\t\t\t<Box
\t\t\t\t\t\t\tsx={{
\t\t\t\t\t\t\t\ttextAlign: "center",
\t\t\t\t\t\t\t\tmb: theme.liftkit.spacing.sm,
\t\t\t\t\t\t\t\tdisplay: "flex",
\t\t\t\t\t\t\t\tflexDirection: "row",
\t\t\t\t\t\t\t\talignItems: "center",
\t\t\t\t\t\t\t\tjustifyContent: "center",
\t\t\t\t\t\t\t}}>
\t\t\t\t\t\t\t<Home
\t\t\t\t\t\t\t\tsx={{
\t\t\t\t\t\t\t\t\tfontSize: "3rem",
\t\t\t\t\t\t\t\t\tcolor: theme.palette.bpp.granite["030"],
\t\t\t\t\t\t\t\t}}
\t\t\t\t\t\t\t/>
\t\t\t\t\t\t\t<Typography variant="h5">
\t\t\t\t\t\t\t\tHome Address
\t\t\t\t\t\t\t</Typography>
\t\t\t\t\t\t</Box>
\t\t\t\t\t\t<Divider sx={{ mb: theme.liftkit.spacing.lg }}></Divider>
\t\t\t\t\t\t
\t\t\t\t\t\t{/* Toggle between manual entry and smart address lookup */}
\t\t\t\t\t\t{!useSmartInputHome ? (
\t\t\t\t\t\t\t<Box>
\t\t\t\t\t\t\t\t<DynamicAddressForm
\t\t\t\t\t\t\t\t\tcountry={form.home_country}
\t\t\t\t\t\t\t\t\tvalues={form}
\t\t\t\t\t\t\t\t\tonChange={handleChange}
\t\t\t\t\t\t\t\t\terrors={hasUserInteracted ? fieldErrors : {}}
\t\t\t\t\t\t\t\t\tfieldPrefix="home"
\t\t\t\t\t\t\t\t\tshowOptionalFields={true}
\t\t\t\t\t\t\t\t\tshakingFields={shakingFields}
\t\t\t\t\t\t\t\t/>
\t\t\t\t\t\t\t\t<Box sx={{ textAlign: 'center', mt: 3 }}>
\t\t\t\t\t\t\t\t\t<Button
\t\t\t\t\t\t\t\t\t\tvariant="outlined"
\t\t\t\t\t\t\t\t\t\tstartIcon={<EditIcon />}
\t\t\t\t\t\t\t\t\t\tonClick={() => setUseSmartInputHome(true)}
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
\t\t\t\t\t\t\t\t\tfieldPrefix="home"
\t\t\t\t\t\t\t\t\tshakingFields={shakingFields}
\t\t\t\t\t\t\t\t/>
\t\t\t\t\t\t\t\t<Box sx={{ textAlign: 'center', mt: 2 }}>
\t\t\t\t\t\t\t\t\t<Button
\t\t\t\t\t\t\t\t\t\tvariant="text"
\t\t\t\t\t\t\t\t\t\tonClick={() => setUseSmartInputHome(false)}
\t\t\t\t\t\t\t\t\t\tsize="small"
\t\t\t\t\t\t\t\t\t>
\t\t\t\t\t\t\t\t\t\t← Back to manual entry
\t\t\t\t\t\t\t\t\t</Button>
\t\t\t\t\t\t\t\t</Box>
\t\t\t\t\t\t\t</Box>
\t\t\t\t\t\t)}
\t\t\t\t\t</Box>
\t\t\t\t);"""

new_case2 = """\t\t\tcase 2:
\t\t\t\treturn (
\t\t\t\t\t<Box>
\t\t\t\t\t\t<Box
\t\t\t\t\t\t\tsx={{
\t\t\t\t\t\t\t\ttextAlign: "center",
\t\t\t\t\t\t\t\tmb: theme.liftkit.spacing.sm,
\t\t\t\t\t\t\t\tdisplay: "flex",
\t\t\t\t\t\t\t\tflexDirection: "row",
\t\t\t\t\t\t\t\talignItems: "center",
\t\t\t\t\t\t\t\tjustifyContent: "center",
\t\t\t\t\t\t\t}}>
\t\t\t\t\t\t\t<Home
\t\t\t\t\t\t\t\tsx={{
\t\t\t\t\t\t\t\t\tfontSize: "3rem",
\t\t\t\t\t\t\t\t\tcolor: theme.palette.bpp.granite["030"],
\t\t\t\t\t\t\t\t}}
\t\t\t\t\t\t\t/>
\t\t\t\t\t\t\t<Typography variant="h5">
\t\t\t\t\t\t\t\tHome Address
\t\t\t\t\t\t\t</Typography>
\t\t\t\t\t\t</Box>
\t\t\t\t\t\t<Divider sx={{ mb: theme.liftkit.spacing.lg }}></Divider>
\t\t\t\t\t\t
\t\t\t\t\t\t{/* Readonly mode in profile, editable in registration */}
\t\t\t\t\t\t{!isEditingHomeAddress ? (
\t\t\t\t\t\t\t<Box>
\t\t\t\t\t\t\t\t<DynamicAddressForm
\t\t\t\t\t\t\t\t\tcountry={form.home_country}
\t\t\t\t\t\t\t\t\tvalues={form}
\t\t\t\t\t\t\t\t\tonChange={handleChange}
\t\t\t\t\t\t\t\t\terrors={hasUserInteracted ? fieldErrors : {}}
\t\t\t\t\t\t\t\t\tfieldPrefix="home"
\t\t\t\t\t\t\t\t\tshowOptionalFields={true}
\t\t\t\t\t\t\t\t\treadonly={true}
\t\t\t\t\t\t\t\t\tshakingFields={shakingFields}
\t\t\t\t\t\t\t\t/>
\t\t\t\t\t\t\t\t<Box sx={{ textAlign: 'center', mt: 3 }}>
\t\t\t\t\t\t\t\t\t<Button
\t\t\t\t\t\t\t\t\t\tvariant="contained"
\t\t\t\t\t\t\t\t\t\tstartIcon={<EditIcon />}
\t\t\t\t\t\t\t\t\t\tonClick={() => setIsEditingHomeAddress(true)}
\t\t\t\t\t\t\t\t\t>
\t\t\t\t\t\t\t\t\t\tEdit Address
\t\t\t\t\t\t\t\t\t</Button>
\t\t\t\t\t\t\t\t</Box>
\t\t\t\t\t\t\t</Box>
\t\t\t\t\t\t) : (
\t\t\t\t\t\t\t<Box>
\t\t\t\t\t\t\t\t{/* Toggle between manual entry and smart address lookup */}
\t\t\t\t\t\t\t\t{!useSmartInputHome ? (
\t\t\t\t\t\t\t\t\t<Box>
\t\t\t\t\t\t\t\t\t\t<DynamicAddressForm
\t\t\t\t\t\t\t\t\t\t\tcountry={form.home_country}
\t\t\t\t\t\t\t\t\t\t\tvalues={form}
\t\t\t\t\t\t\t\t\t\t\tonChange={handleChange}
\t\t\t\t\t\t\t\t\t\t\terrors={hasUserInteracted ? fieldErrors : {}}
\t\t\t\t\t\t\t\t\t\t\tfieldPrefix="home"
\t\t\t\t\t\t\t\t\t\t\tshowOptionalFields={true}
\t\t\t\t\t\t\t\t\t\t\tshakingFields={shakingFields}
\t\t\t\t\t\t\t\t\t\t/>
\t\t\t\t\t\t\t\t\t\t<Box sx={{ textAlign: 'center', mt: 3, display: 'flex', gap: 2, justifyContent: 'center' }}>
\t\t\t\t\t\t\t\t\t\t\t<Button
\t\t\t\t\t\t\t\t\t\t\t\tvariant="outlined"
\t\t\t\t\t\t\t\t\t\t\t\tonClick={() => setUseSmartInputHome(true)}
\t\t\t\t\t\t\t\t\t\t\t>
\t\t\t\t\t\t\t\t\t\t\t\tUse address lookup
\t\t\t\t\t\t\t\t\t\t\t</Button>
\t\t\t\t\t\t\t\t\t\t\t{isProfileMode && (
\t\t\t\t\t\t\t\t\t\t\t\t<Button
\t\t\t\t\t\t\t\t\t\t\t\t\tvariant="text"
\t\t\t\t\t\t\t\t\t\t\t\t\tonClick={() => setIsEditingHomeAddress(false)}
\t\t\t\t\t\t\t\t\t\t\t\t>
\t\t\t\t\t\t\t\t\t\t\t\t\tCancel
\t\t\t\t\t\t\t\t\t\t\t\t</Button>
\t\t\t\t\t\t\t\t\t\t\t)}
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
\t\t\t\t\t\t\t\t\t\t\tfieldPrefix="home"
\t\t\t\t\t\t\t\t\t\t\tshakingFields={shakingFields}
\t\t\t\t\t\t\t\t\t\t/>
\t\t\t\t\t\t\t\t\t\t<Box sx={{ textAlign: 'center', mt: 2, display: 'flex', gap: 2, justifyContent: 'center' }}>
\t\t\t\t\t\t\t\t\t\t\t<Button
\t\t\t\t\t\t\t\t\t\t\t\tvariant="text"
\t\t\t\t\t\t\t\t\t\t\t\tonClick={() => setUseSmartInputHome(false)}
\t\t\t\t\t\t\t\t\t\t\t\tsize="small"
\t\t\t\t\t\t\t\t\t\t\t>
\t\t\t\t\t\t\t\t\t\t\t\t← Back to manual entry
\t\t\t\t\t\t\t\t\t\t\t</Button>
\t\t\t\t\t\t\t\t\t\t\t{isProfileMode && (
\t\t\t\t\t\t\t\t\t\t\t\t<Button
\t\t\t\t\t\t\t\t\t\t\t\t\tvariant="text"
\t\t\t\t\t\t\t\t\t\t\t\t\tonClick={() => setIsEditingHomeAddress(false)}
\t\t\t\t\t\t\t\t\t\t\t\t>
\t\t\t\t\t\t\t\t\t\t\t\t\tCancel
\t\t\t\t\t\t\t\t\t\t\t\t</Button>
\t\t\t\t\t\t\t\t\t\t\t)}
\t\t\t\t\t\t\t\t\t\t</Box>
\t\t\t\t\t\t\t\t\t</Box>
\t\t\t\t\t\t\t\t)}
\t\t\t\t\t\t\t</Box>
\t\t\t\t\t\t)}
\t\t\t\t\t</Box>
\t\t\t\t);"""

if old_case2 in content:
    content = content.replace(old_case2, new_case2)
    print("[OK] Home address section updated with readonly mode")
else:
    print("[ERROR] Could not find home address section to update")

# Write the updated content
with open(r'C:\Code\Admin3\frontend\react-Admin3\src\components\User\UserFormWizard.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("\nHome address now supports:")
print("  - Readonly mode by default in profile mode")
print("  - 'Edit Address' button to enable editing")
print("  - Manual entry or smart lookup when editing")
print("  - 'Cancel' button to return to readonly mode in profile mode")
