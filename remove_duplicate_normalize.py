"""
Script to remove duplicate normalizeAddress function from inside useEffect.
"""

# Read the file
with open(r'C:\Code\Admin3\frontend\react-Admin3\src\components\User\UserFormWizard.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find and remove the duplicate normalizeAddress function (lines 220-234)
output_lines = []
i = 0
skip_until = -1

while i < len(lines):
    # Check if this is the duplicate normalizeAddress comment line inside useEffect
    if i < len(lines) and '// Helper to normalize address field names (handles both JSON and legacy formats)' in lines[i]:
        # Check if the next line starts with "const normalizeAddress"
        if i + 1 < len(lines) and 'const normalizeAddress = (addr)' in lines[i + 1]:
            # This is inside the useEffect (indented with tabs), skip it
            # Skip from comment line through the closing brace and blank line
            skip_count = 0
            j = i
            while j < len(lines):
                if 'const homeAddr = normalizeAddress' in lines[j]:
                    # Found the usage line, stop skipping before this line
                    i = j
                    break
                j += 1
            continue

    output_lines.append(lines[i])
    i += 1

# Write the updated content
with open(r'C:\Code\Admin3\frontend\react-Admin3\src\components\User\UserFormWizard.js', 'w', encoding='utf-8') as f:
    f.writelines(output_lines)

print("[OK] Removed duplicate normalizeAddress function from useEffect")
