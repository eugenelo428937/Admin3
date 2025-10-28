"""
Script to fix the work address section - simpler approach using direct text replacement.
"""

# Read the file
with open(r'C:\Code\Admin3\frontend\react-Admin3\src\components\User\UserFormWizard.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Find and replace the work address SmartAddressInput section
old_work_section = """							</Grid>
						</Grid>

						<SmartAddressInput
							values={form}
							onChange={handleChange}
							errors={hasUserInteracted ? fieldErrors : {}}
							fieldPrefix="work"
							shakingFields={shakingFields}
						/>

						<Grid container spacing={3} sx={{ mt: 2 }}>"""

new_work_section = """							</Grid>
						</Grid>

						{/* Toggle between manual entry and smart address lookup */}
						{!useSmartInputWork ? (
							<Box>
								<DynamicAddressForm
									country={form.work_country}
									values={form}
									onChange={handleChange}
									errors={hasUserInteracted ? fieldErrors : {}}
									fieldPrefix="work"
									showOptionalFields={true}
									shakingFields={shakingFields}
								/>
								<Box sx={{ textAlign: 'center', mt: 3 }}>
									<Button
										variant="outlined"
										startIcon={<EditIcon />}
										onClick={() => setUseSmartInputWork(true)}
									>
										Use address lookup
									</Button>
								</Box>
							</Box>
						) : (
							<Box>
								<Typography variant="body2" color="text.secondary" gutterBottom>
									Using smart address lookup
								</Typography>
								<SmartAddressInput
									values={form}
									onChange={handleChange}
									errors={hasUserInteracted ? fieldErrors : {}}
									fieldPrefix="work"
									shakingFields={shakingFields}
								/>
								<Box sx={{ textAlign: 'center', mt: 2 }}>
									<Button
										variant="text"
										onClick={() => setUseSmartInputWork(false)}
										size="small"
									>
										← Back to manual entry
									</Button>
								</Box>
							</Box>
						)}

						<Grid container spacing={3} sx={{ mt: 2 }}>"""

# Check if the old section exists
if old_work_section in content:
    content = content.replace(old_work_section, new_work_section)
    print("[OK] Work address section found and replaced")
else:
    print("[WARNING] Work address section not found - checking with tabs...")
    # Try with tabs instead of mixed spaces/tabs
    old_work_tabs = old_work_section.replace("							", "\t\t\t\t\t\t").replace("						", "\t\t\t\t\t")
    new_work_tabs = new_work_section.replace("							", "\t\t\t\t\t\t").replace("						", "\t\t\t\t\t")

    if old_work_tabs in content:
        content = content.replace(old_work_tabs, new_work_tabs)
        print("[OK] Work address section found and replaced (with tabs)")
    else:
        print("[ERROR] Could not find work address section to replace")
        print("Looking for this pattern:")
        print(repr(old_work_section[:100]))

# Write the updated content
with open(r'C:\Code\Admin3\frontend\react-Admin3\src\components\User\UserFormWizard.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("\nWork address update complete!")
