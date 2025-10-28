"""
Script to update UserFormWizard address fields to show manual entry by default,
with option to use smart address lookup.
"""

import re

# Read the file
with open(r'C:\Code\Admin3\frontend\react-Admin3\src\components\User\UserFormWizard.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update imports - add EditIcon to Material-UI icons import
old_import = "import { Person, Home, Business, Phone, Lock, MarkEmailRead as MarkEmailReadIcon } from \"@mui/icons-material\";"
new_import = "import { Person, Home, Business, Phone, Lock, MarkEmailRead as MarkEmailReadIcon, Edit as EditIcon } from \"@mui/icons-material\";"
content = content.replace(old_import, new_import)

# 2. Add DynamicAddressForm import after SmartAddressInput
old_smart_import = "import SmartAddressInput from \"../Address/SmartAddressInput\";"
new_imports = """import SmartAddressInput from "../Address/SmartAddressInput";
import DynamicAddressForm from "../Address/DynamicAddressForm";"""
content = content.replace(old_smart_import, new_imports)

# 3. Add state variables for address input mode toggle
# Find the line with emailVerificationSent state and add after it
old_state = "\t// Email verification state (T032)\n\tconst [emailVerificationSent, setEmailVerificationSent] = useState(false);"
new_state = """\t// Email verification state (T032)
\tconst [emailVerificationSent, setEmailVerificationSent] = useState(false);

\t// Address input mode state - false = manual entry, true = smart lookup
\tconst [useSmartInputHome, setUseSmartInputHome] = useState(false);
\tconst [useSmartInputWork, setUseSmartInputWork] = useState(false);"""
content = content.replace(old_state, new_state)

# 4. Replace case 2 (Home Address) section
# Find the home address case and replace the SmartAddressInput with new pattern
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
\t\t\t\t\t\t<SmartAddressInput
\t\t\t\t\t\t\tvalues={form}
\t\t\t\t\t\t\tonChange={handleChange}
\t\t\t\t\t\t\terrors={hasUserInteracted ? fieldErrors : {}}
\t\t\t\t\t\t\tfieldPrefix="home"
\t\t\t\t\t\t\tshakingFields={shakingFields}
\t\t\t\t\t\t/>
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

content = content.replace(old_case2, new_case2)

# 5. Replace work address SmartAddressInput section (inside the showWorkSection conditional)
# This is trickier because it's nested. Let me find and replace just the SmartAddressInput part
old_work_smart = """\t\t\t\t\t\t\t<SmartAddressInput
\t\t\t\t\t\t\t\tvalues={form}
\t\t\t\t\t\t\t\tonChange={handleChange}
\t\t\t\t\t\t\t\terrors={hasUserInteracted ? fieldErrors : {}}
\t\t\t\t\t\t\t\tfieldPrefix="work"
\t\t\t\t\t\t\t\tshakingFields={shakingFields}
\t\t\t\t\t\t\t/>"""

new_work_smart = """\t\t\t\t\t\t\t{/* Toggle between manual entry and smart address lookup */}
\t\t\t\t\t\t\t{!useSmartInputWork ? (
\t\t\t\t\t\t\t\t<Box>
\t\t\t\t\t\t\t\t\t<DynamicAddressForm
\t\t\t\t\t\t\t\t\t\tcountry={form.work_country}
\t\t\t\t\t\t\t\t\t\tvalues={form}
\t\t\t\t\t\t\t\t\t\tonChange={handleChange}
\t\t\t\t\t\t\t\t\t\terrors={hasUserInteracted ? fieldErrors : {}}
\t\t\t\t\t\t\t\t\t\tfieldPrefix="work"
\t\t\t\t\t\t\t\t\t\tshowOptionalFields={true}
\t\t\t\t\t\t\t\t\t\tshakingFields={shakingFields}
\t\t\t\t\t\t\t\t\t/>
\t\t\t\t\t\t\t\t\t<Box sx={{ textAlign: 'center', mt: 3 }}>
\t\t\t\t\t\t\t\t\t\t<Button
\t\t\t\t\t\t\t\t\t\t\tvariant="outlined"
\t\t\t\t\t\t\t\t\t\t\tstartIcon={<EditIcon />}
\t\t\t\t\t\t\t\t\t\t\tonClick={() => setUseSmartInputWork(true)}
\t\t\t\t\t\t\t\t\t\t>
\t\t\t\t\t\t\t\t\t\t\tUse address lookup
\t\t\t\t\t\t\t\t\t\t</Button>
\t\t\t\t\t\t\t\t\t</Box>
\t\t\t\t\t\t\t\t</Box>
\t\t\t\t\t\t\t) : (
\t\t\t\t\t\t\t\t<Box>
\t\t\t\t\t\t\t\t\t<Typography variant="body2" color="text.secondary" gutterBottom>
\t\t\t\t\t\t\t\t\t\tUsing smart address lookup
\t\t\t\t\t\t\t\t\t</Typography>
\t\t\t\t\t\t\t\t\t<SmartAddressInput
\t\t\t\t\t\t\t\t\t\tvalues={form}
\t\t\t\t\t\t\t\t\t\tonChange={handleChange}
\t\t\t\t\t\t\t\t\t\terrors={hasUserInteracted ? fieldErrors : {}}
\t\t\t\t\t\t\t\t\t\tfieldPrefix="work"
\t\t\t\t\t\t\t\t\t\tshakingFields={shakingFields}
\t\t\t\t\t\t\t\t\t/>
\t\t\t\t\t\t\t\t\t<Box sx={{ textAlign: 'center', mt: 2 }}>
\t\t\t\t\t\t\t\t\t\t<Button
\t\t\t\t\t\t\t\t\t\t\tvariant="text"
\t\t\t\t\t\t\t\t\t\t\tonClick={() => setUseSmartInputWork(false)}
\t\t\t\t\t\t\t\t\t\t\tsize="small"
\t\t\t\t\t\t\t\t\t\t>
\t\t\t\t\t\t\t\t\t\t\t← Back to manual entry
\t\t\t\t\t\t\t\t\t\t</Button>
\t\t\t\t\t\t\t\t\t</Box>
\t\t\t\t\t\t\t\t</Box>
\t\t\t\t\t\t\t)}"""

content = content.replace(old_work_smart, new_work_smart)

# Write the updated content
with open(r'C:\Code\Admin3\frontend\react-Admin3\src\components\User\UserFormWizard.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("[OK] Updated imports to include EditIcon and DynamicAddressForm")
print("[OK] Added state variables for address input mode toggle")
print("[OK] Updated Home Address section (case 2) with manual entry default")
print("[OK] Updated Work Address section (case 3) with manual entry default")
print("\nUserFormWizard.js has been updated successfully!")
print("\nAddress fields now:")
print("  - Show all fields manually by default (DynamicAddressForm)")
print("  - Provide 'Use address lookup' button to switch to SmartAddressInput")
print("  - Allow toggling back to manual entry")
