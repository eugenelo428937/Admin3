import re

# Read the file
with open(r'C:\Code\Admin3\frontend\react-Admin3\src\components\Product\ProductList.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the JSX syntax issues
# Replace {{2}} with {2}
content = content.replace('spacing={{2}}', 'spacing={2}')

# Replace {{{ with {{
content = content.replace('{{{', '{{')

# Replace }}} with }}
content = content.replace('}}}', '}}')

# Fix severity={{variant}} to severity={variant}
content = content.replace('severity={{variant}}', 'severity={variant}')

# Write back
with open(r'C:\Code\Admin3\frontend\react-Admin3\src\components\Product\ProductList.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("JSX syntax fixed!")
