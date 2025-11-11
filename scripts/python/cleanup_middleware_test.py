#!/usr/bin/env python3
"""Remove tutorial_format, distance_learning, and tutorial fields from middleware test file."""

import re

# Read the file
with open('src/store/middleware/__tests__/urlSyncMiddleware.test.js', 'r') as f:
    content = f.read()

# Remove lines with these field definitions and assertions
lines = content.split('\n')
filtered_lines = []

for line in lines:
    # Skip lines that contain these field definitions
    if re.search(r'tutorial_format:\s*(null|"[^"]*"|\'[^\']*\')', line):
        continue
    if re.search(r'distance_learning:\s*(true|false)', line):
        continue
    if re.search(r'tutorial:\s*(true|false),?\s*$', line):
        continue
    # Skip lines with toHaveProperty assertions for these fields
    if re.search(r"toHaveProperty\('(tutorial_format|distance_learning|tutorial)'\)", line):
        continue
    # Skip lines with typeof checks for these fields
    if re.search(r"filters\.(tutorial_format|distance_learning|tutorial)", line):
        continue
    filtered_lines.append(line)

# Write back
with open('src/store/middleware/__tests__/urlSyncMiddleware.test.js', 'w') as f:
    f.write('\n'.join(filtered_lines))

print("Removed unused filter fields from middleware test file")
