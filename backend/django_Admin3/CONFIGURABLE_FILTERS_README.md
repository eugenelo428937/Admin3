# Configurable Product Filter System

This document explains the new configurable filter system that allows staff to manage product filters through the Django admin interface.

## Overview

The new system replaces the hard-coded filter logic with a database-driven configuration system that provides:

- **Dynamic filter configuration** through Django admin
- **Multiple filter types** (subjects, product groups, variations, etc.)
- **Flexible UI components** (multi-select, single select, radio buttons, etc.)
- **Filter dependencies** and validation rules
- **Usage analytics** and performance monitoring
- **Filter presets** for common filter combinations

## Database Schema

### Core Tables

1. **`acted_filter_configuration`** - Master filter definitions
2. **`acted_filter_option_provider`** - Defines where filter options come from
3. **`acted_filter_preset`** - Saved filter combinations
4. **`acted_filter_usage_analytics`** - Usage tracking for optimization

### Table Relationships

```
FilterConfiguration (1) -> (1) FilterOptionProvider
FilterConfiguration (1) -> (∞) FilterUsageAnalytics
FilterConfiguration (1) -> (∞) FilterPreset (through JSON field)
User (1) -> (∞) FilterConfiguration (created_by)
User (1) -> (∞) FilterPreset (created_by)
```

## Setup Instructions

### 1. Run Migrations

```bash
python manage.py migrate
```

### 2. Seed Default Configurations

```bash
python manage.py seed_filter_configurations
```

### 3. Migrate Existing Data (Optional)

```bash
# Check what would be migrated
python manage.py migrate_to_configurable_filters --dry-run

# Perform the migration
python manage.py migrate_to_configurable_filters
```

## Filter Types

### 1. Subject Filter
- **Type**: `subject`
- **Data Source**: `acted_subjects` table
- **Purpose**: Filter products by subject code/name
- **UI**: Multi-select with search

### 2. Product Group Filter  
- **Type**: `product_group`
- **Data Source**: `acted_product_group` table
- **Purpose**: Filter by product categories
- **UI**: Multi-select with hierarchy support

### 3. Product Variation Filter
- **Type**: `product_variation`
- **Data Source**: `acted_product_variations` table
- **Purpose**: Filter by product variations
- **UI**: Multi-select grouped by variation type

### 4. Tutorial Format Filter
- **Type**: `tutorial_format`
- **Data Source**: Static list
- **Purpose**: Filter tutorials by format
- **UI**: Multi-select with format mapping

### 5. Custom Field Filter
- **Type**: `custom_field`
- **Data Source**: Configurable model field
- **Purpose**: Filter by any model field
- **UI**: Configurable

### 6. Computed Filter
- **Type**: `computed`
- **Data Source**: Custom function
- **Purpose**: Complex filtering logic
- **UI**: Configurable

## Configuration Options

### Basic Configuration
- `name`: Internal identifier
- `display_label`: User-facing label
- `description`: Admin description
- `filter_type`: Type of filter (subject, product_group, etc.)
- `filter_key`: API parameter name

### UI Configuration
- `ui_component`: Component type (multi_select, single_select, etc.)
- `display_order`: Sort order in UI
- `is_active`: Enable/disable filter
- `is_collapsible`: Can be collapsed in UI
- `is_expanded_by_default`: Default expanded state
- `allow_multiple`: Allow multiple selections

### Advanced Configuration
- `ui_config`: JSON configuration for UI behavior
- `validation_rules`: JSON validation rules
- `dependency_rules`: JSON dependency definitions

## Admin Interface

### Filter Configuration Admin

Access: **Django Admin > Products > Filter Configurations**

Features:
- List all configured filters
- Edit filter settings
- Test filter functionality
- View usage statistics
- Clear filter cache

### Filter Option Provider Admin

Access: **Django Admin > Products > Filter Option Providers**

Features:
- Configure data sources
- Set caching options
- Test option generation
- Monitor cache performance

### Filter Usage Analytics Admin

Access: **Django Admin > Products > Filter Usage Analytics**

Features:
- View filter usage statistics
- Analyze popular filters
- Monitor performance
- Export usage data

## API Endpoints

### Get Filter Configuration
```
GET /api/products/filter-configuration/
```

Response:
```json
{
  "subject": {
    "type": "multi_select",
    "label": "Subject",
    "display_order": 1,
    "options": [
      {"id": 1, "label": "ACCA - Financial Accounting", "code": "ACCA"}
    ],
    "ui_config": {
      "placeholder": "Select subjects...",
      "show_count": true
    }
  }
}
```

### Apply Filters
```
GET /api/products/current/list/?subject=1&main_category=2
```

## Usage Examples

### 1. Creating a New Filter

```python
from products.models.filter_configuration import FilterConfiguration, FilterOptionProvider

# Create filter configuration
config = FilterConfiguration.objects.create(
    name='exam_level',
    display_label='Exam Level',
    filter_type='custom_field',
    filter_key='exam_level',
    ui_component='single_select',
    display_order=6,
    ui_config={
        'placeholder': 'Select exam level...',
        'options': [
            {'id': 'foundation', 'label': 'Foundation'},
            {'id': 'intermediate', 'label': 'Intermediate'},
            {'id': 'advanced', 'label': 'Advanced'}
        ]
    }
)

# Create option provider
provider = FilterOptionProvider.objects.create(
    filter_configuration=config,
    source_type='static_list',
    source_config={
        'options': [
            {'id': 'foundation', 'label': 'Foundation'},
            {'id': 'intermediate', 'label': 'Intermediate'},
            {'id': 'advanced', 'label': 'Advanced'}
        ]
    }
)
```

### 2. Using Filter Service

```python
from products.services.configurable_filter_service import get_configurable_filter_service

service = get_configurable_filter_service()

# Get filter configuration
config = service.get_filter_configuration()

# Apply filters
queryset = ExamSessionSubjectProduct.objects.all()
filtered = service.apply_filters(queryset, {
    'subject': ['ACCA', 'CIMA'],
    'main_category': [1, 2]
})
```

### 3. Frontend Integration

```javascript
// Get filter configuration
const config = await productService.getFilterConfiguration();

// Render dynamic filters
Object.entries(config).forEach(([key, filterConfig]) => {
    renderFilter(key, filterConfig);
});

// Apply filters
const products = await productService.getProductsAndBundles({
    subject: [1, 2],
    main_category: [3]
});
```

## Performance Considerations

### Caching
- Filter options are cached for 15 minutes by default
- Cache keys are generated per filter type
- Cache can be cleared through admin interface

### Database Optimization
- Indexes on filter fields
- Efficient query strategies
- Proper use of select_related/prefetch_related

### Usage Analytics
- Track filter usage for optimization
- Monitor popular filter combinations
- Identify unused filters

## Testing

### Admin Testing
1. Go to Django Admin > Products > Filter Configurations
2. Click "Test" button next to any filter
3. Select test values and run test
4. Review results and performance

### API Testing
```bash
# Test filter configuration endpoint
curl "http://localhost:8000/api/products/filter-configuration/"

# Test filtered products
curl "http://localhost:8000/api/products/current/list/?subject=1&main_category=2"
```

## Troubleshooting

### Common Issues

1. **Filter not appearing**: Check `is_active` flag in configuration
2. **No options showing**: Verify FilterOptionProvider configuration
3. **Filter not applying**: Check filter strategy implementation
4. **Performance issues**: Review caching and query optimization

### Debug Commands

```bash
# Test filter configurations
python manage.py test_filter_configurations

# Clear all filter cache
python manage.py clear_filter_cache

# Reload configurations
python manage.py reload_filter_configurations
```

## Migration from Old System

The old `ProductGroupFilter` system is still supported but deprecated. To migrate:

1. Run migration command: `python manage.py migrate_to_configurable_filters`
2. Test new filters in admin interface
3. Update frontend to use new API endpoints
4. Remove old filter code when ready

## Future Enhancements

- Filter templates for quick setup
- Advanced dependency rules
- Real-time filter updates
- Filter A/B testing
- Machine learning filter suggestions
- Multi-language filter labels

## Support

For issues or questions about the configurable filter system:
1. Check Django admin for configuration errors
2. Review logs for error messages
3. Use admin test functionality
4. Check database for data consistency