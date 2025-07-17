# Filter System Setup Guide

## Overview

The Admin3 filter system provides a flexible, configurable approach to filtering products based on various criteria. This guide covers how to set up different types of filters from start to finish.

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Core Models](#core-models)
3. [Setting Up Filters](#setting-up-filters)
4. [Example 1: Subject Filter](#example-1-subject-filter)
5. [Example 2: Product Group Filter](#example-2-product-group-filter)
6. [Example 3: Sub-tree Product Group Filter](#example-3-sub-tree-product-group-filter)
7. [Example 4: Custom Filter Types](#example-4-custom-filter-types)
8. [Admin Interface Usage](#admin-interface-usage)
9. [API Integration](#api-integration)
10. [Testing and Troubleshooting](#testing-and-troubleshooting)

---

## System Architecture

The filter system is built on a hierarchical, strategy-based architecture:

```
FilterConfiguration (Main config)
├── FilterGroup (Hierarchical categories)
├── FilterConfigurationGroup (Many-to-many relationship)
├── FilterPreset (Saved filter combinations)
└── FilterUsageAnalytics (Usage tracking)
```

### Key Components

- **FilterConfiguration**: Main configuration defining filter behavior
- **FilterGroup**: Hierarchical categories (replaces old ProductGroup)
- **FilterConfigurationGroup**: Junction table linking configurations to groups
- **FilterStrategy**: Service layer implementing different filter types
- **FilterService**: Main service coordinating all filter operations

---

## Core Models

### FilterConfiguration

The main model defining how a filter behaves:

```python
class FilterConfiguration(models.Model):
    # Basic Configuration
    name = models.CharField(max_length=100, unique=True)
    display_label = models.CharField(max_length=100)
    filter_type = models.CharField(max_length=32, choices=FILTER_TYPE_CHOICES)
    filter_key = models.CharField(max_length=50)
    
    # UI Configuration
    ui_component = models.CharField(max_length=32, choices=UI_COMPONENT_CHOICES)
    display_order = models.IntegerField(default=0)
    
    # Behavior Configuration
    is_active = models.BooleanField(default=True)
    allow_multiple = models.BooleanField(default=True)
    
    # Advanced Configuration
    ui_config = models.JSONField(default=dict, blank=True)
    validation_rules = models.JSONField(default=dict, blank=True)
    dependency_rules = models.JSONField(default=dict, blank=True)
```

### FilterGroup

Hierarchical structure for organizing filter options:

```python
class FilterGroup(models.Model):
    name = models.CharField(max_length=100)
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True)
    code = models.CharField(max_length=100, unique=True, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    display_order = models.IntegerField(default=0)
```

---

## Setting Up Filters

### Prerequisites

1. **Access Django Admin**: `http://127.0.0.1:8888/admin/`
2. **Required Permissions**: Superuser or staff with appropriate permissions
3. **Data Setup**: Ensure relevant data exists (subjects, product groups, etc.)

### Basic Setup Steps

1. **Create FilterConfiguration**
2. **Associate FilterGroups** (if applicable)
3. **Configure UI Options**
4. **Test the Filter**
5. **Deploy to Frontend**

---

## Example 1: Subject Filter

### Scenario
Create a filter that allows users to filter products by academic subjects (e.g., "Paper A", "Paper B", "Paper C").

### Step 1: Create FilterConfiguration

#### Via Django Admin

1. Navigate to **Admin → Filter Configurations → Add**
2. Fill in the form:

```
Name: subject_filter
Display Label: Subject
Description: Filter products by academic subject
Filter Type: subject
Filter Key: subject
UI Component: multi_select
Display Order: 2
Is Active: ✓
Allow Multiple: ✓
```

#### Via Django Shell

```python
from products.models.filter_system import FilterConfiguration

# Create subject filter configuration
subject_filter = FilterConfiguration.objects.create(
    name='subject_filter',
    display_label='Subject',
    description='Filter products by academic subject',
    filter_type='subject',
    filter_key='subject',
    ui_component='multi_select',
    display_order=2,
    is_active=True,
    allow_multiple=True,
    ui_config={
        'show_count': True,
        'show_select_all': True,
        'placeholder': 'Select subjects...',
        'search_placeholder': 'Search subjects...'
    }
)
```

### Step 2: Verify Subject Data

Ensure subjects exist in the system:

```python
from subjects.models import Subject

# Check existing subjects
subjects = Subject.objects.filter(active=True)
print(f"Available subjects: {subjects.count()}")
for subject in subjects:
    print(f"  - {subject.code}: {subject.description}")
```

### Step 3: Test the Filter

```python
from products.services.refactored_filter_service import get_refactored_filter_service

# Get filter service
service = get_refactored_filter_service()

# Test filter options
options = service.get_filter_options(['subject_filter'])
print(f"Subject filter options: {len(options['subject_filter'])}")

# Test filtering
from exam_sessions_subjects_products.models import ExamSessionSubjectProduct

queryset = ExamSessionSubjectProduct.objects.all()
filtered = service.apply_filters(queryset, {
    'subject_filter': ['PAPER_A', 'PAPER_B']
})
print(f"Filtered results: {filtered.count()}")
```

### Step 4: Frontend Integration

The filter will automatically appear in the frontend when the API endpoint is called:

```javascript
// Frontend API call
fetch('/api/products/filter-configuration/')
  .then(response => response.json())
  .then(data => {
    console.log(data.subject_filter);
    // {
    //   "type": "multi_select",
    //   "label": "Subject",
    //   "options": [
    //     {"id": 1, "value": "PAPER_A", "label": "Paper A - Fundamentals"},
    //     {"id": 2, "value": "PAPER_B", "label": "Paper B - Advanced"}
    //   ]
    // }
  });
```

---

## Example 2: Product Group Filter

### Scenario
Create a filter for main product categories (Material, Marking, Tutorial).

### Step 1: Create FilterConfiguration

```python
from products.models.filter_system import FilterConfiguration

# Create product group filter
product_group_filter = FilterConfiguration.objects.create(
    name='product_group_filter',
    display_label='Product Category',
    description='Filter by main product categories',
    filter_type='filter_group',
    filter_key='product_group',
    ui_component='multi_select',
    display_order=1,
    is_active=True,
    allow_multiple=True,
    ui_config={
        'show_count': True,
        'show_select_all': True,
        'include_children': False,  # Only show top-level categories
        'show_hierarchy': False
    }
)
```

### Step 2: Associate FilterGroups

```python
from products.models.filter_system import FilterGroup, FilterConfigurationGroup

# Get main category groups
main_categories = FilterGroup.objects.filter(
    parent__isnull=True,  # Top-level only
    name__in=['Material', 'Marking', 'Tutorial']
)

# Associate with filter configuration
for idx, category in enumerate(main_categories):
    FilterConfigurationGroup.objects.create(
        filter_configuration=product_group_filter,
        filter_group=category,
        is_default=True,
        display_order=idx + 1
    )
    print(f"Added category: {category.name}")
```

### Step 3: Verify Associations

```python
# Check associations
associations = FilterConfigurationGroup.objects.filter(
    filter_configuration=product_group_filter
)
print(f"Product group filter has {associations.count()} categories:")
for assoc in associations:
    print(f"  - {assoc.filter_group.name} (Order: {assoc.display_order})")
```

### Step 4: Test the Filter

```python
# Test filter options
service = get_refactored_filter_service()
options = service.get_filter_options(['product_group_filter'])
print("Product group options:")
for option in options['product_group_filter']:
    print(f"  - {option['label']} (ID: {option['id']})")

# Test filtering
filtered = service.apply_filters(
    ExamSessionSubjectProduct.objects.all(),
    {'product_group_filter': [1, 2]}  # Material and Marking
)
print(f"Filtered results: {filtered.count()}")
```

---

## Example 3: Sub-tree Product Group Filter

### Scenario
Create a filter for tutorial formats (Face-to-face, Live Online, Online Classroom) - a sub-tree within the Tutorial category.

### Step 1: Identify Sub-tree Structure

```python
from products.models.filter_system import FilterGroup

# Find tutorial category and its children
tutorial_category = FilterGroup.objects.get(name='Tutorial', parent__isnull=True)
tutorial_formats = FilterGroup.objects.filter(parent=tutorial_category)

print(f"Tutorial category ID: {tutorial_category.id}")
print("Tutorial formats:")
for format_group in tutorial_formats:
    print(f"  - {format_group.name} (ID: {format_group.id})")
```

### Step 2: Create FilterConfiguration

```python
# Create tutorial format filter
tutorial_format_filter = FilterConfiguration.objects.create(
    name='tutorial_format_filter',
    display_label='Tutorial Format',
    description='Filter by tutorial delivery format',
    filter_type='filter_group',
    filter_key='tutorial_format',
    ui_component='radio_buttons',  # Single selection
    display_order=3,
    is_active=True,
    allow_multiple=False,  # Single selection for format
    ui_config={
        'show_count': True,
        'show_select_all': False,
        'include_children': False,
        'show_hierarchy': False,
        'default_selection': None
    }
)
```

### Step 3: Associate Sub-tree Groups

```python
# Associate only tutorial format sub-groups
tutorial_formats = FilterGroup.objects.filter(
    parent__name='Tutorial',
    name__in=['Face-to-face', 'Live Online', 'Online Classroom']
)

for idx, format_group in enumerate(tutorial_formats):
    FilterConfigurationGroup.objects.create(
        filter_configuration=tutorial_format_filter,
        filter_group=format_group,
        is_default=format_group.name == 'Face-to-face',  # Default selection
        display_order=idx + 1
    )
    print(f"Added format: {format_group.name}")
```

### Step 4: Test Hierarchical Filtering

```python
# Test filtering by tutorial format
service = get_refactored_filter_service()

# Get face-to-face tutorials only
face_to_face_group = FilterGroup.objects.get(name='Face-to-face')
filtered = service.apply_filters(
    ExamSessionSubjectProduct.objects.all(),
    {'tutorial_format_filter': [face_to_face_group.id]}
)
print(f"Face-to-face tutorials: {filtered.count()}")

# Test with hierarchical inclusion
tutorial_format_filter.ui_config['include_children'] = True
tutorial_format_filter.save()

# This would include sub-categories of Face-to-face if they exist
service.reload_configurations()
filtered_with_children = service.apply_filters(
    ExamSessionSubjectProduct.objects.all(),
    {'tutorial_format_filter': [face_to_face_group.id]}
)
print(f"Face-to-face with children: {filtered_with_children.count()}")
```

---

## Example 4: Custom Filter Types

### Scenario
Create a custom filter for product variations (eBook, Printed, etc.).

### Step 1: Create FilterConfiguration

```python
# Create product variation filter
variation_filter = FilterConfiguration.objects.create(
    name='variation_filter',
    display_label='Format',
    description='Filter by product format (eBook, Printed, etc.)',
    filter_type='product_variation',
    filter_key='variation',
    ui_component='toggle_buttons',
    display_order=4,
    is_active=True,
    allow_multiple=True,
    ui_config={
        'show_count': True,
        'show_select_all': True,
        'compact_view': True,
        'icon_mapping': {
            'eBook': 'book',
            'Printed': 'print',
            'Digital': 'computer'
        }
    }
)
```

### Step 2: Test Custom Filter

```python
# Test product variation filter
service = get_refactored_filter_service()
options = service.get_filter_options(['variation_filter'])
print("Product variation options:")
for option in options['variation_filter']:
    print(f"  - {option['label']} ({option['variation_type']})")

# Test filtering by variation
from products.models import ProductVariation
ebook_variations = ProductVariation.objects.filter(
    name__icontains='ebook'
).values_list('id', flat=True)

filtered = service.apply_filters(
    ExamSessionSubjectProduct.objects.all(),
    {'variation_filter': list(ebook_variations)}
)
print(f"eBook products: {filtered.count()}")
```

---

## Admin Interface Usage

### Accessing Filter Configuration

1. **Navigate to Admin**: `http://127.0.0.1:8888/admin/`
2. **Filter Management**:
   - **Filter Configurations**: Main filter setup
   - **Filter Groups**: Hierarchical categories
   - **Filter Configuration Groups**: Associations
   - **Filter Presets**: Saved combinations
   - **Filter Usage Analytics**: Usage statistics

### Filter Configuration Form

#### Basic Configuration
- **Name**: Internal identifier (lowercase, underscores)
- **Display Label**: User-facing label
- **Description**: Admin description
- **Filter Type**: Type of filter (subject, filter_group, etc.)
- **Filter Key**: API key for frontend

#### UI Configuration
- **UI Component**: How filter appears (multi_select, radio_buttons, etc.)
- **Display Order**: Order in filter panel
- **Is Active**: Enable/disable filter

#### Behavior Configuration
- **Is Collapsible**: Can be collapsed in UI
- **Is Expanded by Default**: Default expansion state
- **Is Required**: Must be selected
- **Allow Multiple**: Multiple selections allowed

#### Advanced Configuration (JSON)

```json
{
  "show_count": true,
  "show_select_all": true,
  "include_children": false,
  "show_hierarchy": true,
  "placeholder": "Select options...",
  "search_placeholder": "Search...",
  "compact_view": false,
  "icon_mapping": {
    "option1": "icon-name"
  }
}
```

### Testing Filters in Admin

1. **Test Button**: Each filter has a "Test" button
2. **Test Form**: Select test values
3. **Results**: View filtered results and counts
4. **Performance**: Check query performance

### Bulk Operations

- **Clear Cache**: Clear filter cache for selected filters
- **Export Configuration**: Export filter settings
- **Import Configuration**: Import from another system

---

## API Integration

### Frontend API Endpoints

#### Get Filter Configuration
```javascript
GET /api/products/filter-configuration/
```

Response:
```json
{
  "subject_filter": {
    "type": "multi_select",
    "label": "Subject",
    "display_order": 2,
    "required": false,
    "allow_multiple": true,
    "options": [
      {"id": 1, "value": "PAPER_A", "label": "Paper A - Fundamentals"},
      {"id": 2, "value": "PAPER_B", "label": "Paper B - Advanced"}
    ]
  }
}
```

#### Apply Filters
```javascript
POST /api/products/filter/
Content-Type: application/json

{
  "filters": {
    "subject_filter": ["PAPER_A", "PAPER_B"],
    "product_group_filter": [1, 2]
  }
}
```

### React Integration Example

```jsx
import React, { useState, useEffect } from 'react';

const FilterPanel = () => {
  const [filterConfig, setFilterConfig] = useState({});
  const [selectedFilters, setSelectedFilters] = useState({});
  const [products, setProducts] = useState([]);

  useEffect(() => {
    // Load filter configuration
    fetch('/api/products/filter-configuration/')
      .then(response => response.json())
      .then(setFilterConfig);
  }, []);

  const applyFilters = async () => {
    const response = await fetch('/api/products/filter/', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({filters: selectedFilters})
    });
    const data = await response.json();
    setProducts(data.results);
  };

  return (
    <div className="filter-panel">
      {Object.entries(filterConfig).map(([key, config]) => (
        <FilterComponent
          key={key}
          name={key}
          config={config}
          value={selectedFilters[key] || []}
          onChange={(value) => setSelectedFilters(prev => ({
            ...prev,
            [key]: value
          }))}
        />
      ))}
      <button onClick={applyFilters}>Apply Filters</button>
    </div>
  );
};
```

---

## Critical Database Relationships

### Product-FilterGroup Relationship

**IMPORTANT**: For product filtering to work correctly, the `Product` model must be properly linked to `FilterGroup` (not the old `ProductGroup`).

#### Database Tables
- **`acted_product_productgroup`**: Junction table linking products to filter groups
- **`acted_filter_group`**: The main filter group table (replaces `acted_product_group`)

#### Model Relationships
```python
# In products/models/products.py
class Product(models.Model):
    # This MUST reference FilterGroup, not ProductGroup
    groups = models.ManyToManyField(FilterGroup, related_name='products', through='ProductProductGroup')

class ProductProductGroup(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    # This MUST reference FilterGroup, not ProductGroup
    product_group = models.ForeignKey(FilterGroup, on_delete=models.CASCADE)
```

#### Migration Required
If you're migrating from an old system, you need to update the foreign key constraint:

```sql
-- Update foreign key constraint to point to FilterGroup
ALTER TABLE acted_product_productgroup 
DROP CONSTRAINT acted_product_productgroup_product_group_id_fkey;

ALTER TABLE acted_product_productgroup 
ADD CONSTRAINT acted_product_productgroup_product_group_id_fkey 
FOREIGN KEY (product_group_id) 
REFERENCES acted_filter_group (id);
```

This is handled automatically by the migration `0013_update_product_group_references.py`.

## Testing and Troubleshooting

### Common Issues

#### 1. Filter Not Appearing
```python
# Check if filter is active
filter_config = FilterConfiguration.objects.get(name='your_filter')
print(f"Active: {filter_config.is_active}")

# Check if service loads it
service = get_refactored_filter_service()
print(f"Loaded filters: {list(service.strategies.keys())}")
```

#### 2. No Filter Options
```python
# Check associated groups
associations = FilterConfigurationGroup.objects.filter(
    filter_configuration__name='your_filter'
)
print(f"Associated groups: {associations.count()}")

# Check group data
for assoc in associations:
    print(f"  - {assoc.filter_group.name} (Active: {assoc.filter_group.is_active})")
```

#### 3. Filtering Returns All Products (Most Common Issue)
This happens when products are linked to `ProductGroup` but filters use `FilterGroup`.

**Symptoms:**
- Filter returns all products instead of filtered subset
- No filtering effect despite having filter options

**Solution:**
```python
# Check if products are linked to FilterGroup
from products.models import Product
product = Product.objects.first()
print(f"Product groups type: {type(product.groups.first())}")
# Should show: <class 'products.models.filter_system.FilterGroup'>
# NOT: <class 'products.models.product_group.ProductGroup'>

# Check database constraint
from django.db import connection
cursor = connection.cursor()
cursor.execute("""
    SELECT confrelid::regclass as referenced_table
    FROM pg_constraint 
    WHERE conrelid = 'acted_product_productgroup'::regclass
    AND conname LIKE '%product_group_id%'
""")
result = cursor.fetchone()
print(f"Products reference: {result[0]}")
# Should show: acted_filter_group
# NOT: acted_product_group
```

**Fix:** Run migration `0013_update_product_group_references.py` or manually update the foreign key constraint.

#### 4. Filtering Not Working
```python
# Test filter strategy
service = get_refactored_filter_service()
strategy = service.strategies.get('your_filter')
if strategy:
    print(f"Strategy type: {type(strategy)}")
    # Test options
    options = strategy.get_options()
    print(f"Options: {len(options)}")
else:
    print("Strategy not found")
```

### Performance Optimization

#### 1. Enable Caching
```python
# Check cache configuration
filter_config = FilterConfiguration.objects.get(name='your_filter')
print(f"Cache config: {filter_config.ui_config.get('cache_timeout', 900)}")

# Manual cache clear
from django.core.cache import cache
cache.clear()
```

#### 2. Database Optimization
```python
# Add database indexes
from django.db import connection
cursor = connection.cursor()

# Check existing indexes
cursor.execute("""
    SELECT indexname, tablename FROM pg_indexes 
    WHERE tablename LIKE '%filter%'
""")
indexes = cursor.fetchall()
for index in indexes:
    print(f"Index: {index[0]} on {index[1]}")
```

#### 3. Query Optimization
```python
# Analyze query performance
from django.db import connection

# Reset query log
connection.queries_log.clear()

# Apply filter
service = get_refactored_filter_service()
service.apply_filters(
    ExamSessionSubjectProduct.objects.all(),
    {'your_filter': ['value1', 'value2']}
)

# Check queries
print(f"Queries executed: {len(connection.queries)}")
for query in connection.queries:
    print(f"Time: {query['time']}s - {query['sql'][:100]}...")
```

### Verification Commands

#### Test Filter System After Setup
```bash
# Check loaded filters
python manage.py shell -c "
from products.services.refactored_filter_service import get_refactored_filter_service
service = get_refactored_filter_service()
print('Available filters:', list(service.strategies.keys()))
"

# Test specific filter with actual filtering
python manage.py shell -c "
from products.services.refactored_filter_service import get_refactored_filter_service
from exam_sessions_subjects_products.models import ExamSessionSubjectProduct

service = get_refactored_filter_service()
total = ExamSessionSubjectProduct.objects.count()
print(f'Total products: {total}')

# Test your filter (replace 'your_filter' with actual name)
filtered = service.apply_filters(
    ExamSessionSubjectProduct.objects.all(),
    {'your_filter': [1]}  # Use actual filter value
)
print(f'Filtered products: {filtered.count()}')
print(f'Filtering works: {filtered.count() < total}')
"

# Test all filters at once
python manage.py shell -c "
from products.services.refactored_filter_service import get_refactored_filter_service
from exam_sessions_subjects_products.models import ExamSessionSubjectProduct

service = get_refactored_filter_service()
total = ExamSessionSubjectProduct.objects.count()
print(f'Total products: {total}')

for filter_name in service.strategies.keys():
    options = service.get_filter_options([filter_name])
    if options[filter_name]:
        first_option = options[filter_name][0]
        # Use 'value' for subjects, 'id' for filter groups
        test_value = first_option.get('value', first_option.get('id'))
        filtered = service.apply_filters(
            ExamSessionSubjectProduct.objects.all(),
            {filter_name: [test_value]}
        )
        print(f'{filter_name}: {len(options[filter_name])} options, {filtered.count()} products')
"
```

### Debug Commands

```bash
# Clear filter cache
python manage.py shell -c "
from products.services.refactored_filter_service import get_refactored_filter_service
service = get_refactored_filter_service()
service.invalidate_cache()
print('Cache cleared')
"

# Check database relationships
python manage.py shell -c "
from products.models import Product
from products.models.filter_system import FilterGroup
from products.models.products import ProductProductGroup

print('Product-FilterGroup relationships:')
print(f'Products: {Product.objects.count()}')
print(f'FilterGroups: {FilterGroup.objects.count()}')
print(f'ProductProductGroup associations: {ProductProductGroup.objects.count()}')

# Test first product
product = Product.objects.first()
if product:
    print(f'First product groups: {product.groups.count()}')
    print(f'Group types: {[type(g) for g in product.groups.all()[:3]]}')
"
```

---

## Summary of Key Fix

### The Problem
When setting up filters, products were linked to the old `ProductGroup` table but filters were using the new `FilterGroup` table. This caused filters to return all products instead of filtering them.

### The Solution
1. **Update Product Model**: Changed `Product.groups` to reference `FilterGroup` instead of `ProductGroup`
2. **Update Junction Table**: Changed `ProductProductGroup.product_group` to reference `FilterGroup`
3. **Update Database Constraint**: Migrated foreign key constraint from `acted_product_group` to `acted_filter_group`

### Verification
```bash
# This should return fewer products than the total
python manage.py shell -c "
from products.services.refactored_filter_service import get_refactored_filter_service
from exam_sessions_subjects_products.models import ExamSessionSubjectProduct
service = get_refactored_filter_service()
total = ExamSessionSubjectProduct.objects.count()
filtered = service.apply_filters(ExamSessionSubjectProduct.objects.all(), {'PRODUCT_TYPE': [1]})
print(f'Total: {total}, Filtered: {filtered.count()}, Works: {filtered.count() < total}')
"
```

---

## Best Practices

### 1. Naming Conventions
- **Filter names**: Use lowercase with underscores (e.g., `subject_filter`)
- **Display labels**: Use proper capitalization (e.g., `Subject`)
- **Filter keys**: Use short, descriptive keys (e.g., `subject`)

### 2. Performance Considerations
- **Limit options**: Don't exceed 100 options per filter
- **Use caching**: Enable caching for frequently accessed filters
- **Optimize queries**: Use select_related and prefetch_related

### 3. UI/UX Guidelines
- **Logical ordering**: Order filters by importance/usage
- **Clear labels**: Use descriptive, user-friendly labels
- **Sensible defaults**: Set reasonable default selections
- **Progressive disclosure**: Use collapsible sections for advanced options

### 4. Data Integrity
- **Validate associations**: Ensure FilterGroups exist before associating
- **Check dependencies**: Verify dependent data is available
- **Monitor usage**: Use analytics to optimize filter configurations

---

## Conclusion

The Admin3 filter system provides a powerful, flexible framework for creating sophisticated filtering interfaces. By following this guide, you can create filters ranging from simple subject selections to complex hierarchical product categorizations.

Key takeaways:
1. **Plan your filter structure** before implementation
2. **Use the admin interface** for easy configuration
3. **Test thoroughly** at each step
4. **Monitor performance** and optimize as needed
5. **Follow naming conventions** for consistency

For additional support, refer to the Django admin interface at `http://127.0.0.1:8888/admin/` or consult the system logs for detailed error information.