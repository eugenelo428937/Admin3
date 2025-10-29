# Complete Filter System Documentation
## Admin3 Product Filtering Architecture Guide

**Version**: 1.0  
**Last Updated**: August 2025  
**Audience**: Junior Developers, New Team Members  

---

## Table of Contents
1. [System Overview](#system-overview)
2. [Database Structure](#database-structure)
3. [Backend Architecture](#backend-architecture)
4. [Frontend Architecture](#frontend-architecture)
5. [Complete Flow Examples](#complete-flow-examples)
6. [Troubleshooting Guide](#troubleshooting-guide)

---

## System Overview

The Admin3 filter system allows users to filter products through multiple entry points:
- **Navigation Bar Dropdowns** (Subjects, Tutorial Locations, Tutorial Formats, etc.)
- **Filter Panel Checkboxes** (Left sidebar on products page)
- **URL Parameters** (Direct linking support)

### Key Concepts
- **Product**: A course offering at a specific location (e.g., "CS1 Birmingham Tutorial")
- **Filter Group**: Hierarchical categorization system (e.g., Tutorial > Face-to-face Tutorial)
- **Filter Configuration**: Defines how filters are displayed and behave in the UI

---

## Database Structure

### Core Tables

#### 1. `acted_filter_group` (FilterGroup Model)
```sql
CREATE TABLE acted_filter_group (
    id INTEGER PRIMARY KEY,
    name VARCHAR(100),           -- e.g., "Tutorial", "Face-to-face Tutorial"
    parent_id INTEGER NULL,       -- References parent group (hierarchical)
    code VARCHAR(100) UNIQUE,     -- Unique identifier code
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0
);
```

**Key Records:**
```sql
-- Root level groups (parent_id = NULL)
id=1, name="Material", parent_id=NULL
id=2, name="Marking", parent_id=NULL  
id=3, name="Tutorial", parent_id=NULL

-- Child groups (tutorial formats under Tutorial)
id=10, name="Face-to-face Tutorial", parent_id=3
id=11, name="Live Online Tutorial", parent_id=3

-- Tutorial location products (in Tutorial group)
id=125, name="Birmingham", parent_id=3
id=126, name="Bristol", parent_id=3
```

#### 2. `acted_filter_configuration` (FilterConfiguration Model)
```sql
CREATE TABLE acted_filter_configuration (
    id INTEGER PRIMARY KEY,
    name VARCHAR(100) UNIQUE,        -- Internal name: "PRODUCT_TYPE"
    display_label VARCHAR(100),      -- UI label: "Product Types"
    filter_type VARCHAR(32),         -- Type: 'filter_group', 'subject', etc.
    filter_key VARCHAR(50),          -- API parameter key
    ui_component VARCHAR(32),        -- UI type: 'multi_select', 'checkbox'
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE
);
```

**Key Configuration:**
```sql
id=6, name="PRODUCT_TYPE", display_label="Product Types", 
      filter_type="filter_group", ui_component="multi_select"
```

#### 3. `acted_filter_configuration_group` (Junction Table)
```sql
CREATE TABLE acted_filter_configuration_group (
    id INTEGER PRIMARY KEY,
    filter_configuration_id INTEGER,  -- References acted_filter_configuration
    filter_group_id INTEGER,          -- References acted_filter_group
    is_default BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0
);
```

Links filter configurations to filter groups:
```sql
-- Links PRODUCT_TYPE config to Face-to-face Tutorial group
filter_configuration_id=6, filter_group_id=10
```

#### 4. `acted_products` (Product Model)
```sql
CREATE TABLE acted_products (
    id INTEGER PRIMARY KEY,
    code VARCHAR(50) UNIQUE,
    shortname VARCHAR(100),      -- "CS1 Birmingham"
    fullname VARCHAR(200),
    is_active BOOLEAN DEFAULT TRUE
);
```

#### 5. `acted_product_product_group` (Product-Group Relationship)
```sql
CREATE TABLE acted_product_product_group (
    id INTEGER PRIMARY KEY,
    product_id INTEGER,           -- References acted_products
    filtergroup_id INTEGER        -- References acted_filter_group
);
```

Links products to their filter groups:
```sql
-- CS1 Birmingham Tutorial linked to Birmingham group and Face-to-face group
product_id=1001, filtergroup_id=125  -- Birmingham location
product_id=1001, filtergroup_id=10   -- Face-to-face Tutorial format
```

---

## Backend Architecture

### API Endpoints

#### 1. Main Search Endpoint
**URL**: `/api/exam-sessions-subjects-products/unified-search/`  
**Method**: GET

```python
# views.py - ExamSessionSubjectsProductsViewSet
@action(detail=False, methods=['get'])
def unified_search(self, request):
    # Extract filter parameters
    filters = {
        'subjects': request.query_params.getlist('subjects[]'),
        'categories': request.query_params.getlist('categories[]'),
        'product_types': request.query_params.getlist('product_types[]'),
        'products': request.query_params.getlist('products[]'),
        'modes_of_delivery': request.query_params.getlist('modes_of_delivery[]')
    }
    
    # Extract navbar filters
    navbar_filters = {
        'group': request.query_params.get('group'),
        'product': request.query_params.get('product'),
        'tutorial_format': request.query_params.get('tutorial_format')
    }
    
    # Apply filters using OptimizedSearchService
    service = OptimizedSearchService()
    results = service.unified_search(filters, navbar_filters)
    
    return Response(results)
```

#### 2. Tutorial Dropdown Endpoint
**URL**: `/api/products/tutorial-dropdown/`  
**Method**: GET

```python
# products/views.py
def tutorial_dropdown(request):
    # Get Tutorial group products for locations
    tutorial_group = FilterGroup.objects.get(name='Tutorial')
    location_products = Product.objects.filter(
        is_active=True,
        groups=tutorial_group
    )
    
    # Get tutorial format groups (children of Tutorial)
    format_groups = FilterGroup.objects.filter(
        parent__name='Tutorial'
    )
    
    return Response({
        'results': {
            'Location': {
                'left': [...],   # First half of locations
                'right': [...]   # Second half of locations
            },
            'Format': [...],     # Tutorial format groups
            'Online Classroom': [...]
        }
    })
```

### Service Layer

#### OptimizedSearchService
```python
# exam_sessions_subjects_products/services/optimized_search_service.py
class OptimizedSearchService:
    def unified_search(self, filters, navbar_filters):
        # 1. Start with base queryset
        products_qs = ExamSessionSubjectsProducts.objects.all()
        
        # 2. Apply checkbox filters
        if filters.get('product_types'):
            # Filter by product type groups
            group_ids = FilterGroup.objects.filter(
                name__in=filters['product_types']
            ).values_list('id', flat=True)
            products_qs = products_qs.filter(
                product__groups__id__in=group_ids
            )
        
        # 3. Apply navbar filters
        if navbar_filters.get('product'):
            # Filter by specific product ID (tutorial location)
            products_qs = products_qs.filter(
                product__id=navbar_filters['product']
            )
        
        if navbar_filters.get('group'):
            # Filter by group name (tutorial format)
            group = FilterGroup.objects.get(name=navbar_filters['group'])
            products_qs = products_qs.filter(
                product__groups=group
            )
        
        # 4. Generate facet counts with metadata
        filter_counts = self._generate_filter_counts(products_qs)
        
        return {
            'products': products_qs,
            'filter_counts': filter_counts,  # Now includes metadata
            'total': products_qs.count()
        }
    
    def _generate_filter_counts(self, base_queryset):
        """
        Generate filter counts with metadata for display names.
        Returns counts as objects: {count: number, name: string}
        """
        filter_counts = {
            'subjects': {},
            'categories': {},
            'product_types': {},
            'products': {},
            'modes_of_delivery': {}
        }
        
        # Example for product types
        for group in FilterGroup.objects.filter(is_active=True):
            count = base_queryset.filter(
                product__groups=group
            ).distinct().count()
            
            if count > 0:
                filter_counts['product_types'][group.name] = {
                    'count': count,
                    'name': group.name,  # Just the child name
                    'display_name': group.name  # No parent prefix
                }
        
        # Handle filtered products (e.g., tutorial locations)
        if filters.get('products'):
            for product_id in filters['products']:
                product = Product.objects.get(id=product_id)
                count = base_queryset.filter(product_id=product_id).count()
                filter_counts['products'][str(product_id)] = {
                    'count': count,
                    'name': product.shortname or product.name,
                    'id': product_id
                }
        
        return filter_counts
```

---

## Frontend Architecture

### Redux Store Structure

#### Store Schema
```javascript
// store/slices/filtersSlice.js
const initialState = {
    // Checkbox filter arrays
    subjects: [],           // ['CS1', 'CS2']
    categories: [],         // ['Material', 'Tutorial']
    product_types: [],      // ['Face-to-face Tutorial']
    products: [],           // [125] - Product IDs for locations
    modes_of_delivery: [],  // ['Digital', 'Physical']
    
    // Filter panel state with metadata
    filterCounts: {
        product_types: {
            'Face-to-face Tutorial': {
                count: 45,
                name: 'Face-to-face Tutorial',
                display_name: 'Face-to-face Tutorial'  // No parent prefix
            },
            'Online Classroom Recording': {
                count: 23,
                name: 'Online Classroom Recording',
                display_name: 'Online Classroom Recording'  // Just child name
            }
        },
        products: {
            '125': {
                count: 12,
                name: 'Birmingham',
                id: 125
            }
        }
    },
    isLoading: false,
    error: null,
    
    // Pagination
    currentPage: 1,
    pageSize: 20
};
```

#### Key Redux Actions
```javascript
// Checkbox toggle actions
toggleProductTypeFilter: (state, action) => {
    const value = action.payload;
    const index = state.product_types.indexOf(value);
    if (index > -1) {
        state.product_types.splice(index, 1);
    } else {
        state.product_types.push(value);
    }
},

// Navigation actions (clear others, set specific)
navSelectProduct: (state, action) => {
    state.categories = [];
    state.product_types = [];
    state.products = [action.payload];  // Set specific product
    state.modes_of_delivery = [];
},

navSelectProductGroup: (state, action) => {
    state.categories = [action.payload];  // Set specific group
    state.product_types = [];
    state.products = [];
    state.modes_of_delivery = [];
}
```

### Component Structure

#### 1. MainNavBar Component
```javascript
// components/Navigation/MainNavBar.js
const MainNavBar = () => {
    const [tutorialData, setTutorialData] = useState(null);
    const dispatch = useDispatch();
    const navigate = useNavigate();
    
    // Fetch tutorial dropdown data
    useEffect(() => {
        const fetchTutorialData = async () => {
            const data = await productService.getTutorialDropdown();
            setTutorialData(data);
        };
        fetchTutorialData();
    }, []);
    
    // Handle tutorial location click
    const handleSpecificProductClick = (productId) => {
        dispatch(navSelectProduct(productId));
        navigate(`/products?product=${productId}`);
    };
    
    // Handle tutorial format click
    const handleProductGroupClick = (groupName) => {
        dispatch(navSelectProductGroup(groupName));
        navigate(`/products?group=${encodeURIComponent(groupName)}`);
    };
    
    return (
        <NavigationMenu
            tutorialData={tutorialData}
            handleSpecificProductClick={handleSpecificProductClick}
            handleProductGroupClick={handleProductGroupClick}
        />
    );
};
```

#### 2. NavigationMenu Component
```javascript
// components/Navigation/NavigationMenu.js
const NavigationMenu = ({ 
    tutorialData, 
    handleSpecificProductClick,
    handleProductGroupClick 
}) => {
    return (
        <NavDropdown title="Tutorial">
            {/* Tutorial Locations */}
            <div>Location</div>
            {tutorialData?.Location?.left?.map(product => (
                <NavDropdown.Item
                    key={product.id}
                    onClick={() => handleSpecificProductClick(product.id)}
                >
                    {product.shortname}
                </NavDropdown.Item>
            ))}
            
            {/* Tutorial Formats */}
            <div>Format</div>
            {tutorialData?.Format?.map(format => (
                <NavDropdown.Item
                    key={format.filter_type}
                    onClick={() => handleProductGroupClick(format.group_name)}
                >
                    {format.name}
                </NavDropdown.Item>
            ))}
        </NavDropdown>
    );
};
```

#### 3. FilterPanel Component
```javascript
// components/Product/FilterPanel.js
const FilterPanel = () => {
    const dispatch = useDispatch();
    const filters = useSelector(selectFilters);
    const filterCounts = useSelector(selectFilterCounts);
    
    const handleFilterChange = (filterType, value) => {
        switch (filterType) {
            case 'product_types':
                dispatch(toggleProductTypeFilter(value));
                break;
            // ... other filter types
        }
    };
    
    return (
        <Paper>
            {/* Product Types Section */}
            <Accordion>
                <AccordionSummary>Product Types</AccordionSummary>
                <AccordionDetails>
                    {Object.entries(filterCounts.product_types || {}).map(([value, filterData]) => {
                        // Handle new metadata structure
                        const count = typeof filterData === 'object' 
                            ? filterData.count 
                            : filterData || 0;
                        const displayLabel = typeof filterData === 'object'
                            ? (filterData.display_name || filterData.name || value)
                            : value;
                        
                        return (
                            <FormControlLabel
                                key={value}
                                control={
                                    <Checkbox
                                        checked={filters.product_types.includes(value)}
                                        onChange={() => handleFilterChange('product_types', value)}
                                    />
                                }
                                label={`${displayLabel} (${count})`}
                            />
                        );
                    })}
                </AccordionDetails>
            </Accordion>
        </Paper>
    );
};
```

#### 4. ActiveFilters Component
```javascript
// components/Product/ActiveFilters.js
const ActiveFilters = () => {
    const filters = useSelector(selectFilters);
    const filterCounts = useSelector(selectFilterCounts);
    const dispatch = useDispatch();
    
    const getDisplayLabel = (filterType, value) => {
        // Get human-readable label from filter counts metadata
        if (filterCounts[filterType]?.[value]) {
            const filterData = filterCounts[filterType][value];
            // Use display_name or name from metadata
            return filterData.display_name || filterData.name || value;
        }
        // Fallback to raw value if metadata not loaded yet
        return value;
    };
    
    return (
        <Stack direction="row" spacing={1}>
            {/* Product Type Filters */}
            {filters.product_types.map(value => (
                <Chip
                    key={value}
                    label={getDisplayLabel('product_types', value)}
                    onDelete={() => dispatch(removeProductTypeFilter(value))}
                />
            ))}
            
            {/* Product Filters (Tutorial Locations) */}
            {filters.products.map(productId => (
                <Chip
                    key={productId}
                    label={getDisplayLabel('products', productId)}
                    onDelete={() => dispatch(removeProductFilter(productId))}
                />
            ))}
        </Stack>
    );
};
```

#### 5. ProductList Component
```javascript
// components/Product/ProductList.js
const ProductList = () => {
    const filters = useSelector(selectFilters);
    const { products, loading, error } = useProductsSearch();
    
    // Hook automatically syncs Redux filters with API calls
    // See useProductsSearch hook below
    
    return (
        <Grid container>
            <Grid item xs={12}>
                <ActiveFilters />  {/* Display active filter pills */}
            </Grid>
            <Grid item xs={3}>
                <FilterPanel />
            </Grid>
            <Grid item xs={9}>
                <ProductGrid products={products} loading={loading} />
            </Grid>
        </Grid>
    );
};
```

### Custom Hooks

#### useProductsSearch Hook
```javascript
// hooks/useProductsSearch.js
const useProductsSearch = () => {
    const location = useLocation();
    const filters = useSelector(selectFilters);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    
    useEffect(() => {
        const fetchProducts = async () => {
            setLoading(true);
            
            // Build query params from Redux filters
            const params = new URLSearchParams();
            
            // Add checkbox filters
            filters.subjects.forEach(s => params.append('subjects[]', s));
            filters.product_types.forEach(pt => params.append('product_types[]', pt));
            
            // Add navbar filters from URL
            const urlParams = new URLSearchParams(location.search);
            const product = urlParams.get('product');
            const group = urlParams.get('group');
            
            if (product) params.set('product', product);
            if (group) params.set('group', group);
            
            // Make API call
            const response = await fetch(
                `/api/exam-sessions-subjects-products/unified-search/?${params}`
            );
            const data = await response.json();
            
            setProducts(data.products);
            setLoading(false);
        };
        
        fetchProducts();
    }, [filters, location.search]);
    
    return { products, loading };
};
```

---

## Complete Flow Examples

### Example 1: User Clicks "Birmingham" Tutorial Location

#### Step-by-Step Flow:

1. **User Action**: Clicks "Birmingham" in Tutorial > Location dropdown

2. **Frontend Navigation Component**:
```javascript
// NavigationMenu.js
<NavDropdown.Item onClick={() => handleSpecificProductClick(125)}>
    Birmingham
</NavDropdown.Item>
```

3. **MainNavBar Handler**:
```javascript
const handleSpecificProductClick = (productId) => {
    // Dispatch Redux action
    dispatch(navSelectProduct(125));
    // Navigate with URL parameter
    navigate('/products?product=125');
};
```

4. **Redux State Update**:
```javascript
// filtersSlice.js - navSelectProduct action
state.categories = [];
state.product_types = [];
state.products = [125];  // Set Birmingham product ID
state.modes_of_delivery = [];
```

5. **useProductsSearch Hook**:
```javascript
// Detects URL change and Redux state change
// Builds API request
const params = new URLSearchParams();
params.set('product', '125');
fetch('/api/exam-sessions-subjects-products/unified-search/?product=125');
```

6. **Backend API Endpoint**:
```python
# views.py - unified_search
navbar_filters = {
    'product': request.query_params.get('product')  # Gets '125'
}
```

7. **Backend Service**:
```python
# OptimizedSearchService
if navbar_filters.get('product'):
    product_id = int(navbar_filters['product'])  # 125
    products_qs = products_qs.filter(product__id=125)
```

8. **Database Query**:
```sql
SELECT * FROM acted_exam_sessions_subjects_products
WHERE product_id = 125;
```

9. **Response & Display**:
- API returns only Birmingham tutorial products
- Frontend displays filtered results

### Example 2: User Selects "Face-to-face Tutorial" Checkbox

#### Step-by-Step Flow:

1. **User Action**: Checks "Face-to-face Tutorial" in filter panel

2. **FilterPanel Component**:
```javascript
<Checkbox
    checked={filters.product_types.includes('Face-to-face Tutorial')}
    onChange={() => handleFilterChange('product_types', 'Face-to-face Tutorial')}
/>
```

3. **Redux Update**:
```javascript
// toggleProductTypeFilter action
state.product_types.push('Face-to-face Tutorial');
```

4. **API Request**:
```javascript
// useProductsSearch builds params
params.append('product_types[]', 'Face-to-face Tutorial');
fetch('/api/exam-sessions-subjects-products/unified-search/?product_types[]=Face-to-face%20Tutorial');
```

5. **Backend Processing**:
```python
filters = {
    'product_types': ['Face-to-face Tutorial']
}

# Get group ID for Face-to-face Tutorial
group = FilterGroup.objects.get(name='Face-to-face Tutorial')  # id=10

# Filter products
products_qs = products_qs.filter(product__groups__id=10)
```

6. **Database Query**:
```sql
SELECT DISTINCT p.* 
FROM acted_exam_sessions_subjects_products essp
JOIN acted_products p ON essp.product_id = p.id
JOIN acted_product_product_group ppg ON p.id = ppg.product_id
WHERE ppg.filtergroup_id = 10;
```

---

## Troubleshooting Guide

### Common Issues and Solutions

#### 1. Filter Not Working
**Symptom**: Clicking filter doesn't change products displayed

**Check**:
- Browser DevTools Network tab - Is API call being made?
- Check URL parameters - Are they correct?
- Redux DevTools - Is state updating?
- Backend logs - Is filter being applied?

**Common Fixes**:
```javascript
// Ensure Redux action is dispatched
dispatch(toggleProductTypeFilter(value));

// Ensure useProductsSearch dependencies are correct
useEffect(() => {
    fetchProducts();
}, [filters, location.search]);  // Must include both
```

#### 2. Filter Counts Incorrect
**Symptom**: Numbers next to filters don't match actual products

**Check**:
- Verify disjunctive faceting logic in backend
- Check if counts are being cached incorrectly

**Solution**:
```python
# Ensure counts are generated after filters applied
def _generate_filter_counts(self, base_queryset):
    # Generate counts with current filters removed
    # This gives "what would happen if you click this"
```

#### 3. Navigation Filter Not Persisting
**Symptom**: Navbar filter clears when using filter panel

**Check**:
- URL parameters should persist
- Redux actions shouldn't clear navbar filters

**Solution**:
```javascript
// Preserve URL params when toggling filters
const currentParams = new URLSearchParams(location.search);
// Add new filter while keeping existing
currentParams.append('product_types[]', value);
```

#### 4. Active Filter Pills Show Numbers Instead of Names
**Symptom**: Filter pills display counts or IDs instead of human-readable names

**Cause**: Filter counts returning old format (numbers) instead of metadata objects

**Check**:
- Backend `filter_counts` structure in API response
- Frontend `getDisplayLabel` function in ActiveFilters component
- Redux `filterCounts` state structure

**Solution**:
```python
# Backend - Ensure filter_counts returns metadata
filter_counts['product_types'][group.name] = {
    'count': count,
    'name': group.name,
    'display_name': group.name  # No parent prefix for Product Types
}

# For products (tutorial locations)
filter_counts['products'][str(product_id)] = {
    'count': count,
    'name': product.shortname or product.name,
    'id': product_id
}
```

```javascript
// Frontend - ActiveFilters component
const getDisplayLabel = (filterType, value) => {
    if (filterCounts[filterType]?.[value]) {
        const filterData = filterCounts[filterType][value];
        return filterData.display_name || filterData.name || value;
    }
    return value;  // Fallback to raw value
};
```

### Debugging Commands

#### Backend Django Shell
```python
# Check filter group structure
from products.models import FilterGroup
FilterGroup.objects.filter(name='Tutorial').first()

# Check product relationships
from products.models import Product
p = Product.objects.get(id=125)
p.groups.all()  # See what groups Birmingham belongs to

# Test filter query
from exam_sessions_subjects_products.models import ExamSessionSubjectsProducts
ExamSessionSubjectsProducts.objects.filter(
    product__groups__name='Face-to-face Tutorial'
).count()
```

#### Frontend Console
```javascript
// Check Redux state
store.getState().filters

// Check filter counts
store.getState().filters.filterCounts

// Manually dispatch action
store.dispatch({ 
    type: 'filters/toggleProductTypeFilter', 
    payload: 'Face-to-face Tutorial' 
})
```

### Performance Optimization

#### Database Indexes
```sql
-- Key indexes for filter performance
CREATE INDEX idx_product_group ON acted_product_product_group(product_id, filtergroup_id);
CREATE INDEX idx_filter_group_parent ON acted_filter_group(parent_id);
CREATE INDEX idx_filter_config_active ON acted_filter_configuration(is_active, display_order);
```

#### Frontend Optimization
```javascript
// Use React.memo for filter components
const FilterSection = React.memo(({ filters, counts, onChange }) => {
    // Component only re-renders if props change
});

// Debounce API calls
const debouncedFetch = useMemo(
    () => debounce(fetchProducts, 300),
    []
);
```

---

## Summary

The Admin3 filter system is a multi-layered architecture with recent improvements for better UX:

1. **Database**: Hierarchical filter groups with many-to-many product relationships
2. **Backend**: Django REST API with service layer returning metadata-rich filter counts
3. **Frontend**: React + Redux with intelligent display name resolution
4. **Flow**: User action → Redux state → API call → Database query → Display results

### Recent Improvements (2025)

#### Filter Display Enhancement
- **Active Filter Pills**: Now display human-readable names instead of counts or IDs
- **Product Types**: Show only child names (e.g., "Online Classroom Recording" not "Tutorial > Online Classroom Recording") 
- **Tutorial Locations**: Product names fetched dynamically and displayed correctly
- **Backward Compatibility**: System handles both old (number) and new (metadata object) filter count formats

#### Technical Changes
- Backend `filter_counts` now returns objects: `{count: number, name: string, display_name: string}`
- Frontend `ActiveFilters` component uses metadata for display names with fallbacks
- `OptimizedSearchService` includes product metadata when products are filtered

Key principles:
- **Separation of Concerns**: UI, state, API, and database layers are independent
- **URL-driven**: Filters are reflected in URL for sharing and bookmarking
- **Performance**: Indexed database queries and optimized React rendering
- **Flexibility**: Multiple entry points (navbar, filter panel, URL) all work together
- **User Experience**: Consistent display names whether filtering via navbar or checkboxes

For junior developers:
- Start by tracing a single user action through all layers
- Use browser DevTools and Django Debug Toolbar to see the flow
- Test changes at each layer independently
- Always consider both checkbox filters and navbar filters
- Understand the metadata structure for filter counts and display names