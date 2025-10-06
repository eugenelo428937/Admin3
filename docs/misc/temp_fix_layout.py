import re

# Read the file
with open(r'C:\Code\Admin3\frontend\react-Admin3\src\components\Product\ProductList.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Step 1: Add import for selectActiveFilterCount
import_section = content.find('import {', content.find('// Redux imports'))
import_end = content.find('} from', import_section)
imports_text = content[import_section:import_end]

if 'selectActiveFilterCount' not in imports_text:
    # Find the position after selectError
    new_imports = imports_text.replace(
        '    selectError,',
        '    selectError,\n    selectActiveFilterCount,'
    )
    content = content[:import_section] + new_imports + content[import_end:]

# Step 2: Add activeFilterCount to Redux state
redux_state_pattern = r'(const filters = useSelector\(selectFilters\);[\s\S]*?const error = useSelector\(selectError\);)'
match = re.search(redux_state_pattern, content)
if match:
    old_state = match.group(0)
    if 'activeFilterCount' not in old_state:
        new_state = old_state + '\n    const activeFilterCount = useSelector(selectActiveFilterCount);'
        content = content.replace(old_state, new_state)

# Step 3: Replace the Active Filters and Rules Engine Messages section
old_section = '''						{/* Active Filters */}
						<ActiveFilters showCount />

						{/* Rules Engine Messages (Delivery Information, etc.) */}
						{rulesLoading && (
							<Alert severity="info" sx={{ mt: 2, mb: 2 }}>
								<i className="bi bi-hourglass-split" style={{ marginRight: 8 }}></i>
								Loading delivery information...
							</Alert>
						)}

						{!rulesLoading && rulesMessages.map((message, index) => {
							const variant = message.variant === 'warning' ? 'warning' :
										message.variant === 'error' ? 'error' :
										message.variant === 'info' ? 'info' : 'info';

							return (
								<Alert
									key={`rules-message-${message.template_id || index}`}
									severity={variant}
									sx={{ mt: 2, mb: 2 }}
									data-testid="product-list-delivery-message"
								>
									<strong>{message.title}</strong>
									<div
										style={{ marginTop: 4 }}
										dangerouslySetInnerHTML={{
											__html: message.message || 'No message content'
										}}
									/>
								</Alert>
							);
						})}'''

new_section = '''						{/* Two-Column Layout: Active Filters (5/12) + Rules Engine Messages (7/12) */}
						{(activeFilterCount > 0 || rulesLoading || rulesMessages.length > 0) && (
							<Grid container spacing={2} sx={{ mb: 2 }}>
								{/* Active Filters Column */}
								<Grid size={{ xs: 12, md: 5 }}>
									<ActiveFilters showCount />
								</Grid>

								{/* Rules Engine Messages Column */}
								<Grid size={{ xs: 12, md: 7 }}>
									{rulesLoading && (
										<Alert severity="info">
											<i className="bi bi-hourglass-split" style={{ marginRight: 8 }}></i>
											Loading delivery information...
										</Alert>
									)}

									{!rulesLoading && rulesMessages.map((message, index) => {
										const variant = message.variant === 'warning' ? 'warning' :
													message.variant === 'error' ? 'error' :
													message.variant === 'info' ? 'info' : 'info';

										return (
											<Alert
												key={`rules-message-${message.template_id || index}`}
												severity={variant}
												sx={{ mb: index < rulesMessages.length - 1 ? 2 : 0 }}
												data-testid="product-list-delivery-message"
											>
												<strong>{message.title}</strong>
												<div
													style={{ marginTop: 4 }}
													dangerouslySetInnerHTML={{
														__html: message.message || 'No message content'
													}}
												/>
											</Alert>
										);
									})}
								</Grid>
							</Grid>
						)}'''

content = content.replace(old_section, new_section)

# Write the modified content
with open(r'C:\Code\Admin3\frontend\react-Admin3\src\components\Product\ProductList.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("File updated successfully!")
