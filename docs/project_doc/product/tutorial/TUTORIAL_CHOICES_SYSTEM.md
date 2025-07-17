# Tutorial Choices System

## Overview

The tutorial choices system allows users to select their preference (1st, 2nd, 3rd choice) for different tutorial variations and events. **Tutorial choices are preferences, not separate products.** All tutorial selections for the same subject are grouped into a single cart item, regardless of location.

## Key Behaviors

### Tutorial vs Material Products
- **Material Products**: Different variations = separate cart items (e.g., "Printed Materials" + "Vitalsource eBook" = 2 cart items)
- **Tutorial Products**: Different locations/events for same subject = ONE cart item (choices are preferences)

### Choice Grouping
- All tutorial choices for the same subject code are grouped into one cart item
- Users can select tutorials from London, Manchester, and York for the same subject → 1 cart item
- Users can add choices incrementally (e.g., add 1st choice, then later add 2nd choice)
- Choices within the same location are merged intelligently to avoid duplicates

### Database Constraints
- **Removed unique constraint** from CartItem to allow multiple variations of the same product
- Uniqueness is now handled in application logic based on product type and variation

## Database Structure

### Metadata Field
Both `CartItem` and `ActedOrderItem` models have a `metadata` JSON field that stores additional product-specific data:

```python
metadata = models.JSONField(default=dict, blank=True, help_text="Additional product-specific data")
```

### Tutorial Metadata Structure
For tutorial products, the metadata contains a locations array:

```json
{
  "type": "tutorial",
  "subjectCode": "MATH101",
  "title": "MATH101 Tutorial",
  "locations": [
    {
      "location": "London",
      "choices": [
        {
          "choice": "1st",
          "variationId": 1,
          "eventId": 10,
          "variationName": "Advanced Tutorial",
          "eventTitle": "Evening Session A",
          "eventCode": "MATH101-A",
          "venue": "London Campus",
          "startDate": "2024-01-15",
          "endDate": "2024-01-19",
          "price": "£25.00"
        }
      ],
      "choiceCount": 1
    },
    {
      "location": "Manchester", 
      "choices": [
        {
          "choice": "1st",
          "variationId": 2,
          "eventId": 20,
          "variationName": "Intensive Tutorial",
          "eventTitle": "Weekend Session",
          "eventCode": "MATH101-B",
          "venue": "Manchester Campus",
          "startDate": "2024-02-01",
          "endDate": "2024-02-03",
          "price": "£22.00"
        }
      ],
      "choiceCount": 1
    }
  ],
  "totalChoiceCount": 2
}
```

## Frontend Implementation

### TutorialProductCard Component
- Users can select 1st, 2nd, or 3rd choice for each tutorial event
- Selections are stored in `selectedChoices` state
- Users can add choices incrementally - selections are preserved after adding to cart
- "Clear" button allows users to reset their selections manually
- All choices for the same subject are grouped into one cart item

### Cart Service
The `cartService.addToCart` function sends metadata with `newLocation` for merging:

```javascript
addToCart(product, {
  priceType: 'standard',
  actualPrice: actualPrice,
  title: `${subjectCode} Tutorial`,
  type: 'tutorial',
  subjectCode: subjectCode,
  newLocation: locationData, // Location with choices to be merged
  // Legacy fields for backward compatibility
  choices: locationChoices,
  choiceCount: selectedItems.length,
  location: location
});
```

## Backend Implementation

### Cart Views - Smart Merging Logic
- Tutorial items are grouped by `subjectCode` across all locations
- When adding a new location:
  - If location already exists: merge choices within that location
  - If location is new: add as separate location
- Duplicate choices (same variationId + eventId) are overwritten with latest selection
- Regular products still use variation-based logic (same product + variationId = separate items)

### Merging Algorithm
```python
# 1. Find existing cart item with same subject code
existing_item = CartItem.objects.filter(
    cart=cart,
    metadata__type='tutorial',
    metadata__subjectCode=subject_code
).first()

# 2. If found, merge the new location intelligently
if existing_item:
    # Check if location already exists
    if location_exists:
        # Merge choices within existing location (avoid duplicates)
        merge_choices_in_location()
    else:
        # Add as new location
        add_new_location()
    
    # Update total choice count across all locations
    update_total_choice_count()
```

### Checkout Process
- When creating orders, metadata is copied from cart items to order items
- This preserves tutorial choices and location information in the order history

### API Response
Cart and order APIs include the full metadata structure:

```json
{
  "id": 1,
  "product": 123,
  "quantity": 1,
  "price_type": "standard",
  "actual_price": "22.00",
  "metadata": {
    "type": "tutorial",
    "subjectCode": "MATH101",
    "title": "MATH101 Tutorial",
    "locations": [...],
    "totalChoiceCount": 3
  }
}
```

## Migration

Run the migration to add metadata fields:

```bash
python manage.py migrate cart
```

## Benefits of This Approach

1. **Intuitive**: Tutorial choices behave as preferences, not separate products
2. **Flexible**: Can store any additional product-specific data
3. **Extensible**: Easy to add new fields for other product types
4. **Performant**: No additional tables or joins required
5. **User-Friendly**: Supports incremental choice addition
6. **Smart Merging**: Automatically handles duplicate locations and choices
7. **Backward Compatible**: Existing cart items continue to work
8. **Future-Proof**: Can be extended for other complex product types

## Usage Examples

### Displaying Tutorial Choices in Cart
```javascript
// In cart display component
if (item.metadata?.type === 'tutorial') {
  return (
    <div>
      <span>{item.metadata.title}</span>
      <span>Total Choices: {item.metadata.totalChoiceCount}</span>
      {item.metadata.locations.map(location => (
        <div key={location.location}>
          <h6>{location.location}</h6>
          {location.choices.map(choice => (
            <span className={`badge ${getChoiceColor(choice.choice)}`}>
              {choice.choice} Choice: {choice.eventTitle}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
```

### Filtering Orders by Tutorial Choices
```python
# In Django admin or views
first_choice_tutorials = ActedOrderItem.objects.filter(
    metadata__locations__contains=[{'choices': [{'choice': '1st'}]}],
    metadata__type='tutorial'
)
``` 