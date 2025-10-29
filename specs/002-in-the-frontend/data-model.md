# Data Model: Scrollable Filter Groups

**Feature**: 002-in-the-frontend
**Date**: 2025-10-28
**Status**: N/A - UI-only feature, no data model changes

## Overview
This feature adds scrollable behavior to the FilterPanel component's AccordionDetails sections. No new data entities, state management, or persistence is required.

## Existing Data Structures (Reference Only)

### Redux Filter State (Unchanged)
The FilterPanel component reads from existing Redux state structure (defined in `filtersSlice.js`):

```javascript
{
  // Array filters (unchanged)
  subjects: [],              // e.g., ['CM2', 'SA1']
  categories: [],            // e.g., ['Material', 'Tutorial']
  product_types: [],         // e.g., ['Core Study Material']
  products: [],              // Product IDs
  modes_of_delivery: [],     // e.g., ['PRINTED', 'EBOOK']

  // Filter counts from API (unchanged)
  filterCounts: {
    subjects: {},            // e.g., { 'CM2': 42, 'SA1': 38 }
    categories: {},
    product_types: {},
    products: {},
    modes_of_delivery: {}
  },

  // UI state (unchanged)
  isFilterPanelOpen: false,
  isLoading: false,
  error: null
}
```

**No Changes Required**: Scrollable behavior is purely presentational (CSS styling changes).

## Component Props (New Behavior)

### FilterPanel Component
**Current Props** (no changes required):
- `showMobile?: boolean` - Display as mobile drawer (existing)
- `isSearchMode?: boolean` - Search mode indicator (existing)

**New Internal State** (optional enhancement):
```javascript
// Optional: Track which accordions are expanded for dynamic height calculation
const [expandedPanels, setExpandedPanels] = useState(new Set());
```

**Note**: Initial implementation uses static viewport-relative values (50vh/40vh). Dynamic height calculation deferred to future iteration.

## Component Interface Contract

### AccordionDetails Styling Props (New)
Enhanced `sx` prop on AccordionDetails components:

```typescript
interface ScrollableAccordionDetailsProps extends AccordionDetailsProps {
  sx: {
    maxHeight: { xs: string, md: string },  // Responsive viewport units
    overflowY: 'auto',                       // Native scrolling
    padding: number,                         // Consistent spacing
  },
  role: 'region',                            // ARIA landmark
  'aria-label': string,                      // Descriptive name
}
```

**Example**:
```javascript
<AccordionDetails
  role="region"
  aria-label="Subjects filter options, scrollable"
  sx={{
    maxHeight: { xs: '40vh', md: '50vh' },
    overflowY: 'auto',
    padding: 2
  }}
>
  {/* Checkbox list */}
</AccordionDetails>
```

## Validation Rules (Unchanged)

All existing validation rules remain in effect:
- Filter selections stored in Redux (no changes)
- Filter counts validated against API responses (no changes)
- URL synchronization via middleware (no changes)

## State Transitions (N/A)

No new state transitions introduced. Existing accordion expand/collapse behavior managed by Material-UI Accordion component.

## Performance Considerations

### Memory Impact
- **Negligible**: CSS properties add ~100 bytes per AccordionDetails element (5 filter groups)
- No new event listeners or state management overhead

### Rendering Impact
- **Negligible**: Browser-native overflow scrolling (GPU-accelerated)
- `scrollIntoView()` operations are batched by browser

### Accessibility Impact
- **Positive**: ARIA attributes improve screen reader navigation
- Auto-scroll focus improves keyboard usability

## Migration Strategy

N/A - This is an additive change with no breaking changes to data structures or APIs.

## Conclusion

**No Data Model Changes Required**

This feature is purely presentational:
- Adds CSS styling to existing components (maxHeight, overflow)
- Adds ARIA attributes for accessibility (role, aria-label)
- Adds focus event handlers for keyboard navigation (scrollIntoView)

All existing data flows, Redux state management, and API contracts remain unchanged.
