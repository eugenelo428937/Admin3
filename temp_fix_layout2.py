import re

# Read the file
with open(r'C:\Code\Admin3\frontend\react-Admin3\src\components\Product\ProductList.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the line with {/* Active Filters */}
start_idx = None
end_idx = None

for i, line in enumerate(lines):
    if '{/* Active Filters */}' in line:
        start_idx = i
    if start_idx and '{/* Debug Information (Development Only) */}' in line:
        end_idx = i
        break

if start_idx and end_idx:
    # Build the new section
    indent = '\t\t\t\t\t\t'
    new_section = [
        f'{indent}{{/* Two-Column Layout: Active Filters (5/12) + Rules Engine Messages (7/12) */}}\n',
        f'{indent}{{(activeFilterCount > 0 || rulesLoading || rulesMessages.length > 0) && (\n',
        f'{indent}\t<Grid container spacing={{2}} sx={{{{ mb: 2 }}}}>\n',
        f'{indent}\t\t{{/* Active Filters Column */}}\n',
        f'{indent}\t\t<Grid size={{{{ xs: 12, md: 5 }}}}>\n',
        f'{indent}\t\t\t<ActiveFilters showCount />\n',
        f'{indent}\t\t</Grid>\n',
        f'{indent}\n',
        f'{indent}\t\t{{/* Rules Engine Messages Column */}}\n',
        f'{indent}\t\t<Grid size={{{{ xs: 12, md: 7 }}}}>\n',
        f'{indent}\t\t\t{{rulesLoading && (\n',
        f'{indent}\t\t\t\t<Alert severity="info">\n',
        f'{indent}\t\t\t\t\t<i className="bi bi-hourglass-split" style={{{{ marginRight: 8 }}}}></i>\n',
        f'{indent}\t\t\t\t\tLoading delivery information...\n',
        f'{indent}\t\t\t\t</Alert>\n',
        f'{indent}\t\t\t)}}\n',
        f'{indent}\n',
        f'{indent}\t\t\t{{!rulesLoading && rulesMessages.map((message, index) => {{\n',
        f'{indent}\t\t\t\tconst variant = message.variant === \'warning\' ? \'warning\' :\n',
        f'{indent}\t\t\t\t\t\t\tmessage.variant === \'error\' ? \'error\' :\n',
        f'{indent}\t\t\t\t\t\t\tmessage.variant === \'info\' ? \'info\' : \'info\';\n',
        f'{indent}\n',
        f'{indent}\t\t\t\treturn (\n',
        f'{indent}\t\t\t\t\t<Alert\n',
        f'{indent}\t\t\t\t\t\tkey={{`rules-message-${{message.template_id || index}}`}}\n',
        f'{indent}\t\t\t\t\t\tseverity={{variant}}\n',
        f'{indent}\t\t\t\t\t\tsx={{{{ mb: index < rulesMessages.length - 1 ? 2 : 0 }}}}\n',
        f'{indent}\t\t\t\t\t\tdata-testid="product-list-delivery-message"\n',
        f'{indent}\t\t\t\t\t>\n',
        f'{indent}\t\t\t\t\t\t<strong>{{message.title}}</strong>\n',
        f'{indent}\t\t\t\t\t\t<div\n',
        f'{indent}\t\t\t\t\t\t\tstyle={{{{ marginTop: 4 }}}}\n',
        f'{indent}\t\t\t\t\t\t\tdangerouslySetInnerHTML={{{{\n',
        f'{indent}\t\t\t\t\t\t\t\t__html: message.message || \'No message content\'\n',
        f'{indent}\t\t\t\t\t\t\t}}}}\n',
        f'{indent}\t\t\t\t\t\t/>\n',
        f'{indent}\t\t\t\t\t</Alert>\n',
        f'{indent}\t\t\t\t);\n',
        f'{indent}\t\t\t})}}\n',
        f'{indent}\t\t</Grid>\n',
        f'{indent}\t</Grid>\n',
        f'{indent})}}\n',
        f'{indent}\n',
    ]

    # Replace the section
    new_lines = lines[:start_idx] + new_section + lines[end_idx:]

    # Write back
    with open(r'C:\Code\Admin3\frontend\react-Admin3\src\components\Product\ProductList.js', 'w', encoding='utf-8') as f:
        f.writelines(new_lines)

    print(f"Replaced lines {start_idx+1} to {end_idx}")
    print("File updated successfully!")
else:
    print("Could not find the section to replace")
