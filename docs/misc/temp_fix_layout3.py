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
    # Build the new section with proper indentation (tabs)
    t = '\t'  # Tab character
    new_section = [
        f'{t*6}{{/* Two-Column Layout: Active Filters (5/12) + Rules Engine Messages (7/12) */}}\n',
        f'{t*6}{{(activeFilterCount > 0 || rulesLoading || rulesMessages.length > 0) && (\n',
        f'{t*7}<Grid container spacing={{{{2}}}} sx={{{{{{ mb: 2 }}}}}}>\n',
        f'{t*8}{{/* Active Filters Column */}}\n',
        f'{t*8}<Grid size={{{{{{ xs: 12, md: 5 }}}}}}>\n',
        f'{t*9}<ActiveFilters showCount />\n',
        f'{t*8}</Grid>\n',
        f'{t*0}\n',
        f'{t*8}{{/* Rules Engine Messages Column */}}\n',
        f'{t*8}<Grid size={{{{{{ xs: 12, md: 7 }}}}}}>\n',
        f'{t*9}{{rulesLoading && (\n',
        f'{t*10}<Alert severity="info">\n',
        f'{t*11}<i className="bi bi-hourglass-split" style={{{{{{ marginRight: 8 }}}}}}></i>\n',
        f'{t*11}Loading delivery information...\n',
        f'{t*10}</Alert>\n',
        f'{t*9})}}\n',
        f'{t*0}\n',
        f'{t*9}{{!rulesLoading && rulesMessages.map((message, index) => {{\n',
        f'{t*10}const variant = message.variant === \'warning\' ? \'warning\' :\n',
        f'{t*13}message.variant === \'error\' ? \'error\' :\n',
        f'{t*13}message.variant === \'info\' ? \'info\' : \'info\';\n',
        f'{t*0}\n',
        f'{t*10}return (\n',
        f'{t*11}<Alert\n',
        f'{t*12}key={{`rules-message-${{message.template_id || index}}`}}\n',
        f'{t*12}severity={{{{variant}}}}\n',
        f'{t*12}sx={{{{{{ mb: index < rulesMessages.length - 1 ? 2 : 0 }}}}}}\n',
        f'{t*12}data-testid="product-list-delivery-message"\n',
        f'{t*11}>\n',
        f'{t*12}<strong>{{message.title}}</strong>\n',
        f'{t*12}<div\n',
        f'{t*13}style={{{{{{ marginTop: 4 }}}}}}\n',
        f'{t*13}dangerouslySetInnerHTML={{{{{{\n',
        f'{t*14}__html: message.message || \'No message content\'\n',
        f'{t*13}}}' + '}}}}\n',
        f'{t*12}/>\n',
        f'{t*11}</Alert>\n',
        f'{t*10});\n',
        f'{t*9}}})}}\n',
        f'{t*8}</Grid>\n',
        f'{t*7}</Grid>\n',
        f'{t*6})}}\n',
        f'{t*0}\n',
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
