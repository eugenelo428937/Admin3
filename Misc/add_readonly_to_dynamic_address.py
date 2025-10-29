"""
Script to add readonly prop support to DynamicAddressForm component.
"""

# Read the file
with open(r'C:\Code\Admin3\frontend\react-Admin3\src\components\Address\DynamicAddressForm.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add readonly prop to function parameters
old_params = """const DynamicAddressForm = ({
\tcountry,
\tvalues = {},
\tonChange,
\terrors = {},
\tfieldPrefix = "",
\tshowOptionalFields = true,
\tclassName = "",
\tmetadata = null, // Allow passing pre-filtered metadata
}) => {"""

new_params = """const DynamicAddressForm = ({
\tcountry,
\tvalues = {},
\tonChange,
\terrors = {},
\tfieldPrefix = "",
\tshowOptionalFields = true,
\tclassName = "",
\tmetadata = null, // Allow passing pre-filtered metadata
\treadonly = false, // New: Make fields readonly
}) => {"""

content = content.replace(old_params, new_params)

# 2. Add readonly to PropTypes
old_proptypes = """DynamicAddressForm.propTypes = {
\tcountry: PropTypes.string.isRequired,
\tvalues: PropTypes.object,
\tonChange: PropTypes.func.isRequired,
\terrors: PropTypes.object,
\tfieldPrefix: PropTypes.string,
\tshowOptionalFields: PropTypes.bool,
\tclassName: PropTypes.string,
\tmetadata: PropTypes.object,
};"""

new_proptypes = """DynamicAddressForm.propTypes = {
\tcountry: PropTypes.string.isRequired,
\tvalues: PropTypes.object,
\tonChange: PropTypes.func.isRequired,
\terrors: PropTypes.object,
\tfieldPrefix: PropTypes.string,
\tshowOptionalFields: PropTypes.bool,
\tclassName: PropTypes.string,
\tmetadata: PropTypes.object,
\treadonly: PropTypes.bool,
};"""

content = content.replace(old_proptypes, new_proptypes)

# 3. Add InputProps to country Select (find the country Select and add disabled)
# This is trickier - need to find Select component for country field
# Look for the pattern with "Country" label
old_country_select = """\t\t\t\t\t<Select
\t\t\t\t\t\tlabelId={`${getFieldName("country")}-label`}
\t\t\t\t\t\tid={getFieldName("country")}
\t\t\t\t\t\tvalue={values[getFieldName("country")] || ""}
\t\t\t\t\t\tname={getFieldName("country")}
\t\t\t\t\t\tonChange={handleCountryChange}
\t\t\t\t\t\terror={!!displayError}"""

new_country_select = """\t\t\t\t\t<Select
\t\t\t\t\t\tlabelId={`${getFieldName("country")}-label`}
\t\t\t\t\t\tid={getFieldName("country")}
\t\t\t\t\t\tvalue={values[getFieldName("country")] || ""}
\t\t\t\t\t\tname={getFieldName("country")}
\t\t\t\t\t\tonChange={handleCountryChange}
\t\t\t\t\t\terror={!!displayError}
\t\t\t\t\t\tdisabled={readonly}"""

content = content.replace(old_country_select, new_country_select)

# 4. Add disabled prop to TextField rendering for address fields
# Find TextField rendering - search for variant="standard"
old_textfield_1 = """\t\t\t\t\t\t\t<TextField
\t\t\t\t\t\t\t\tfullWidth
\t\t\t\t\t\t\t\tlabel={field.label}
\t\t\t\t\t\t\t\tname={fullFieldName}
\t\t\t\t\t\t\t\tvalue={fieldValue}
\t\t\t\t\t\t\t\tonChange={handleFieldChange}
\t\t\t\t\t\t\t\trequired={isRequired}
\t\t\t\t\t\t\t\terror={!!displayError}
\t\t\t\t\t\t\t\thelperText={displayError || field.helpText}
\t\t\t\t\t\t\t\tplaceholder={field.placeholder}
\t\t\t\t\t\t\t\tvariant="standard\""""

new_textfield_1 = """\t\t\t\t\t\t\t<TextField
\t\t\t\t\t\t\t\tfullWidth
\t\t\t\t\t\t\t\tlabel={field.label}
\t\t\t\t\t\t\t\tname={fullFieldName}
\t\t\t\t\t\t\t\tvalue={fieldValue}
\t\t\t\t\t\t\t\tonChange={handleFieldChange}
\t\t\t\t\t\t\t\trequired={isRequired}
\t\t\t\t\t\t\t\terror={!!displayError}
\t\t\t\t\t\t\t\thelperText={displayError || field.helpText}
\t\t\t\t\t\t\t\tplaceholder={field.placeholder}
\t\t\t\t\t\t\t\tvariant="standard"
\t\t\t\t\t\t\t\tInputProps={{ readOnly: readonly }}"""

content = content.replace(old_textfield_1, new_textfield_1)

# Write the updated content
with open(r'C:\Code\Admin3\frontend\react-Admin3\src\components\Address\DynamicAddressForm.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("[OK] Added readonly prop to DynamicAddressForm")
print("\nUpdated:")
print("  - Added readonly parameter (default: false)")
print("  - Added readonly to PropTypes")
print("  - Added disabled prop to country Select")
print("  - Added InputProps readOnly to TextField components")
print("\nDynamicAddressForm now supports readonly mode!")
