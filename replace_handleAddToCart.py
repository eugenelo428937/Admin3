import re

file_path = r'C:\Code\Admin3\frontend\react-Admin3\src\components\Product\ProductCard\Tutorial\TutorialProductCard.js'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find and replace the handleAddToCart function
# Pattern: from 'const handleAddToCart = useCallback(' to the matching closing brace and dependency array
pattern = r'const handleAddToCart = useCallback\(\(\) => \{[\s\S]*?\}, \[addToCart, hasChoices, subjectChoices, product, productId, subjectCode, subjectName, location\]\);'

replacement = r'''const handleAddToCart = useCallback(async () => {
		setSpeedDialOpen(false);

		if (!hasChoices) {
			console.warn("Cannot add to cart: no choices selected");
			return;
		}

		// Get all selected tutorial choices ordered by level
		const orderedChoices = ["1st", "2nd", "3rd"]
			.filter(level => subjectChoices[level])
			.map(level => subjectChoices[level]);

		if (orderedChoices.length === 0) return;

		// Use first choice for pricing
		const primaryChoice = orderedChoices[0];
		const actualPrice = primaryChoice.variation?.prices?.find(
			p => p.price_type === "standard"
		)?.amount || product.price;

		// Build location choices metadata
		const locationChoices = orderedChoices.map(choice => ({
			choice: choice.choiceLevel,
			variationId: choice.variationId,
			eventId: choice.eventId,
			variationName: choice.variationName,
			eventTitle: choice.eventTitle,
			eventCode: choice.eventCode,
			venue: choice.venue,
			startDate: choice.startDate,
			endDate: choice.endDate,
			price: `£${actualPrice}`,
		}));

		// Build tutorial metadata
		const tutorialMetadata = {
			type: "tutorial",
			title: `${subjectCode} Tutorial`,
			locations: [
				{
					location: location,
					choices: locationChoices,
					choiceCount: locationChoices.length,
				}
			],
			subjectCode: subjectCode,
			totalChoiceCount: locationChoices.length
		};

		const productData = {
			id: productId,
			essp_id: productId,
			product_id: productId,
			subject_code: subjectCode,
			subject_name: subjectName,
			product_name: `${subjectCode} Tutorial - ${location}`,
			type: "Tutorial",
			quantity: 1
		};

		const priceData = {
			priceType: "standard",
			actualPrice: actualPrice,
			metadata: tutorialMetadata
		};

		try {
			// 🔍 Lookup: Check if cart already has an item for this subject
			const existingCartItem = cartItems.find(item =>
				item.subject_code === subjectCode &&
				item.type === "Tutorial"
			);

			if (existingCartItem) {
				// ⬆️ Merge: Update existing cart item with new choices
				console.log('🛒 [TutorialProductCard] Merging with existing cart item:', existingCartItem.id);
				await updateCartItem(existingCartItem.id, productData, priceData);
			} else {
				// ➕ Create: Add new cart item
				console.log('🛒 [TutorialProductCard] Creating new cart item');
				await addToCart(productData, priceData);
			}

			// ✅ Mark choices as added (state transition: isDraft false)
			markChoicesAsAdded(subjectCode);

			console.log('✅ [TutorialProductCard] Successfully added/updated cart');
		} catch (error) {
			console.error('❌ [TutorialProductCard] Error adding to cart:', error);
			// TODO: Show user error feedback
		}
	}, [addToCart, updateCartItem, cartItems, markChoicesAsAdded, hasChoices, subjectChoices, product, productId, subjectCode, subjectName, location]);'''

new_content = re.sub(pattern, replacement, content, count=1)

if new_content != content:
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print('✅ Successfully replaced handleAddToCart function')
else:
    print('❌ Pattern not found - no replacement made')
    # Debug: Let's see what we're working with
    match = re.search(r'const handleAddToCart = useCallback\(', content)
    if match:
        print(f'Found handleAddToCart at position {match.start()}')
        # Show a snippet
        snippet = content[match.start():match.start()+500]
        print(f'Snippet:\n{snippet}')
    else:
        print('handleAddToCart not found at all')
