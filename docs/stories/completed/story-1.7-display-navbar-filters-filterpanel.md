# Story 1.7: Display Navbar Filters in FilterPanel

**Epic**: Product Filtering State Management Refactoring
**Phase**: 2 - Cleanup and Consolidation (Priority 1)
**Story ID**: 1.7
**Estimated Effort**: 1-2 days
**Dependencies**: Story 1.2 (navbar filters must exist in Redux)

---

## User Story

As a **user**,
I want **to see and manage ALL active filters including navbar selections in the FilterPanel**,
So that **I can understand what filters are applied and clear any filter I don't want**.

---

## Story Context

### Problem Being Solved

Currently, navbar filters (`tutorial_format`, `distance_learning`, `tutorial`) are:
1. **Hidden from UI** - Not displayed in FilterPanel or ActiveFilters
2. **Unmanageable** - Users cannot see or clear these filters through the UI
3. **Confusing** - Applied filters affect results but are invisible to users
4. **Inconsistent** - Some filters visible (subjects, categories), others hidden

**User Impact**:
> "There are hidden filters like specific product selected from the nav bar that cannot be cleared." - User Report

After Story 1.2, navbar filters are in Redux state. Now we need to **make them visible** in the FilterPanel UI so users can:
- See what navbar filters are active
- Toggle navbar filters on/off via checkboxes
- Clear navbar filters individually or with "Clear All"

### Existing System Integration

**Integrates with**:
- `FilterPanel.js` - Component to be extended with new filter sections
- Story 1.2 Redux state - Navbar filters added to `filtersSlice`
- Existing FilterPanel patterns - Use same Accordion + Checkbox pattern
- Material-UI components - Maintain consistent styling

**Technology**:
- React 18 (functional components with hooks)
- Material-UI v5 (Accordion, FormControlLabel, Checkbox)
- Redux Toolkit (useSelector, useDispatch)

**Follows Pattern**:
- **Existing**: FilterPanel renders sections for subjects, categories, product_types, products, modes_of_delivery
- **New**: Add sections for tutorial_format, distance_learning, tutorial using identical pattern

**Touch Points**:
- `FilterPanel.js` - Add 3 new filter sections
- `filtersSlice.js` - Actions already exist from Story 1.2
- `FilterPanel.css` / `liftkit.css` - Use existing styles, no new CSS needed

---

## Acceptance Criteria

### Functional Requirements

**AC1**: Add "Tutorial Format" filter section to FilterPanel
- New Accordion section titled "Tutorial Format"
- Displays radio buttons or checkboxes for tutorial format options:
  - "Online" (value: `online`)
  - "In-Person" (value: `in_person`)
  - "Hybrid" (value: `hybrid`)
- Dispatches `setTutorialFormat(value)` Redux action on selection
- Shows selected value with visual feedback (checked state)

**AC2**: Add "Distance Learning" filter section to FilterPanel
- New Accordion section titled "Distance Learning"
- Single checkbox: "Distance Learning Only"
- Dispatches `toggleDistanceLearning()` Redux action on click
- Shows checked state when `filters.distance_learning === true`

**AC3**: Add "Tutorial" filter section to FilterPanel
- New Accordion section titled "Tutorial"
- Single checkbox: "Tutorial Products Only"
- Dispatches `setTutorial(boolean)` Redux action on click
- Shows checked state when `filters.tutorial === true`

**AC4**: Filter sections use existing Material-UI pattern
- Use same Accordion component as existing sections
- Use same FormControlLabel + Checkbox components
- Match existing styling, spacing, typography
- Consistent expand/collapse behavior
- Same hover states and focus indicators

**AC5**: Filter sections positioned logically in FilterPanel
- **Recommended order** (top to bottom):
  1. Search Query (existing)
  2. Subjects (existing)
  3. **Tutorial Format** (NEW)
  4. **Tutorial** (NEW)
  5. **Distance Learning** (NEW)
  6. Categories (existing)
  7. Product Types (existing)
  8. Products (existing)
  9. Modes of Delivery (existing)
- Position navbar filters near top for visibility
- Group related filters together (Tutorial Format + Tutorial + Distance Learning)

**AC6**: Filter changes immediately update Redux state
- Clicking checkbox/radio → Redux action dispatched instantly
- No "Apply" button needed (consistent with existing filters)
- Middleware syncs Redux → URL automatically (Story 1.1)
- useProductsSearch triggers API call after debounce (250ms)

**AC7**: Filter sections show current selected state
- Read state from Redux: `useSelector(state => state.filters.tutorial_format)`
- Checkboxes/radios reflect current Redux state
- Visual feedback matches existing filter sections
- State updates reflected immediately after dispatch

**AC8**: Filter sections are collapsible like existing sections
- Accordion starts collapsed by default (consistent with current behavior)
- Click section header to expand/collapse
- Smooth expand/collapse animation (Material-UI default)
- Remembers expanded state during session (if existing sections do)

### Integration Requirements

**AC9**: New filters integrate with existing Clear All functionality
- "Clear All Filters" button clears navbar filters too
- `clearAllFilters()` action already updated in Story 1.2
- All filter sections (new and old) cleared simultaneously

**AC10**: New filters integrate with useProductsSearch API call
- useProductsSearch reads navbar filters from Redux
- API payload includes `tutorial_format`, `distance_learning`, `tutorial`
- Backend receives filters in expected format
- Products filtered correctly based on navbar filters

**AC11**: New filters integrate with URL synchronization
- Middleware (Story 1.1) syncs navbar filters to URL
- URL parameters updated: `?tutorial_format=online&distance_learning=true&tutorial=true`
- URL remains shareable with navbar filter state
- Bookmark URLs with navbar filters work correctly

**AC12**: New filter sections work on mobile and desktop
- Responsive design matches existing FilterPanel behavior
- Mobile: FilterPanel collapsible, navbar filters visible
- Tablet/Desktop: FilterPanel sidebar, navbar filters always visible
- Touch targets meet accessibility standards (44x44px minimum)

### Quality Requirements

**AC13**: Visual consistency with existing filter sections
- Typography: Same font family, size, weight as existing sections
- Colors: Same color scheme (text, background, borders)
- Spacing: Same padding, margins as existing sections
- Borders: Same border styles for section dividers
- Icons: Use Material-UI icons consistent with existing sections

**AC14**: Accessibility compliance (WCAG 2.1 AA)
- Proper ARIA labels for screen readers
- Keyboard navigation works (Tab, Space, Enter)
- Focus indicators visible and distinct
- Color contrast ratios meet standards (4.5:1 for text)
- Checkbox labels properly associated with inputs

**AC15**: No performance degradation
- Rendering new sections adds < 5ms to FilterPanel render time
- No unnecessary re-renders (use React.memo if needed)
- Checkbox click response time < 50ms (feels instant)
- Accordion expand/collapse animation smooth (60fps)

---

## Technical Implementation Guide

### File Structure

**Modified Files**:
```
frontend/react-Admin3/src/components/Product/
├── FilterPanel.js                          # Add 3 new filter sections (MAIN CHANGE)
└── __tests__/
    └── FilterPanel.test.js                 # Add tests for new sections
```

**No new files required** - Uses existing components and patterns.

### Implementation Steps

#### Step 1: Add Tutorial Format Filter Section

**File**: `frontend/react-Admin3/src/components/Product/FilterPanel.js`

**Identify existing filter section pattern**:

**Existing Pattern** (for reference):
```javascript
// Example: Subjects filter section
<Accordion>
  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
    <Typography variant="subtitle2">Subjects</Typography>
  </AccordionSummary>
  <AccordionDetails>
    <FormGroup>
      {subjectOptions.map(subject => (
        <FormControlLabel
          key={subject.code}
          control={
            <Checkbox
              checked={filters.subjects.includes(subject.code)}
              onChange={() => dispatch(toggleSubject(subject.code))}
              size="small"
            />
          }
          label={`${subject.code} - ${subject.name}`}
        />
      ))}
    </FormGroup>
  </AccordionDetails>
</Accordion>
```

**NEW: Tutorial Format Section** (add after Subjects section):

```javascript
{/* Tutorial Format Filter Section */}
<Accordion>
  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
    <Typography variant="subtitle2">
      Tutorial Format
      {filters.tutorial_format && (
        <Chip size="small" label="1" color="primary" sx={{ ml: 1 }} />
      )}
    </Typography>
  </AccordionSummary>
  <AccordionDetails>
    <FormGroup>
      <FormControlLabel
        control={
          <Radio
            checked={filters.tutorial_format === 'online'}
            onChange={() => dispatch(setTutorialFormat('online'))}
            size="small"
          />
        }
        label="Online"
      />
      <FormControlLabel
        control={
          <Radio
            checked={filters.tutorial_format === 'in_person'}
            onChange={() => dispatch(setTutorialFormat('in_person'))}
            size="small"
          />
        }
        label="In-Person"
      />
      <FormControlLabel
        control={
          <Radio
            checked={filters.tutorial_format === 'hybrid'}
            onChange={() => dispatch(setTutorialFormat('hybrid'))}
            size="small"
          />
        }
        label="Hybrid"
      />
      {filters.tutorial_format && (
        <Button
          size="small"
          onClick={() => dispatch(setTutorialFormat(null))}
          sx={{ mt: 1, textTransform: 'none' }}
        >
          Clear
        </Button>
      )}
    </FormGroup>
  </AccordionDetails>
</Accordion>
```

**Note**: Using `Radio` instead of `Checkbox` because tutorial format is **single-select** (can only be one format at a time).

**Add imports** (at top of file):
```javascript
import { Radio, RadioGroup } from '@mui/material'; // Add Radio if not already imported
import { setTutorialFormat, toggleDistanceLearning, setTutorial } from '../../store/slices/filtersSlice';
```

#### Step 2: Add Distance Learning Filter Section

**NEW: Distance Learning Section** (add after Tutorial Format):

```javascript
{/* Distance Learning Filter Section */}
<Accordion>
  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
    <Typography variant="subtitle2">
      Distance Learning
      {filters.distance_learning && (
        <Chip size="small" label="✓" color="primary" sx={{ ml: 1 }} />
      )}
    </Typography>
  </AccordionSummary>
  <AccordionDetails>
    <FormGroup>
      <FormControlLabel
        control={
          <Checkbox
            checked={filters.distance_learning === true}
            onChange={() => dispatch(toggleDistanceLearning())}
            size="small"
          />
        }
        label="Distance Learning Only"
      />
    </FormGroup>
    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
      Show only products available through distance learning
    </Typography>
  </AccordionDetails>
</Accordion>
```

**Features**:
- Single checkbox (boolean filter)
- Dispatches `toggleDistanceLearning()` action (toggle between true/false)
- Chip indicator shows "✓" when active
- Helper text explains what the filter does

#### Step 3: Add Tutorial Filter Section

**NEW: Tutorial Section** (add after Distance Learning):

```javascript
{/* Tutorial Filter Section */}
<Accordion>
  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
    <Typography variant="subtitle2">
      Tutorial
      {filters.tutorial && (
        <Chip size="small" label="✓" color="primary" sx={{ ml: 1 }} />
      )}
    </Typography>
  </AccordionSummary>
  <AccordionDetails>
    <FormGroup>
      <FormControlLabel
        control={
          <Checkbox
            checked={filters.tutorial === true}
            onChange={() => dispatch(setTutorial(!filters.tutorial))}
            size="small"
          />
        }
        label="Tutorial Products Only"
      />
    </FormGroup>
    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
      Show only tutorial products
    </Typography>
  </AccordionDetails>
</Accordion>
```

**Features**:
- Single checkbox (boolean filter)
- Dispatches `setTutorial(boolean)` action
- Chip indicator shows "✓" when active
- Helper text explains filter purpose

#### Step 4: Update Redux Selector Usage

**Ensure FilterPanel reads navbar filters from Redux**:

```javascript
// FilterPanel.js - Redux state
const filters = useSelector(selectFilters);

// Verify selectors include new fields
console.log('Navbar filters:', {
  tutorial_format: filters.tutorial_format,
  distance_learning: filters.distance_learning,
  tutorial: filters.tutorial
});
```

**Should already work** if Story 1.2 extended `selectFilters` selector correctly.

#### Step 5: Position New Sections Logically

**Recommended full filter section order**:

```javascript
return (
  <Box>
    {/* Search Query Section (existing) */}

    {/* Subjects Section (existing) */}

    {/* NEW: Tutorial Format */}
    <Accordion>...</Accordion>

    {/* NEW: Tutorial */}
    <Accordion>...</Accordion>

    {/* NEW: Distance Learning */}
    <Accordion>...</Accordion>

    {/* Categories Section (existing) */}

    {/* Product Types Section (existing) */}

    {/* Products Section (existing) */}

    {/* Modes of Delivery Section (existing) */}

    {/* Clear All Button (existing) */}
    <Button onClick={() => dispatch(clearAllFilters())}>
      Clear All Filters
    </Button>
  </Box>
);
```

**Rationale for positioning**:
- Navbar filters positioned after Subjects (most common filter)
- Grouped together (Tutorial Format + Tutorial + Distance Learning are related)
- Before Categories/Products (less common filters)
- Follows principle: Most frequently used filters at top

#### Step 6: Add Filter Count Indicators

**Optional Enhancement** (if filter counts available):

If backend provides counts for navbar filters:

```javascript
<AccordionSummary expandIcon={<ExpandMoreIcon />}>
  <Typography variant="subtitle2">
    Tutorial Format
    {filterCounts.tutorial_format > 0 && (
      <Chip
        size="small"
        label={filterCounts.tutorial_format}
        color="info"
        sx={{ ml: 1 }}
      />
    )}
  </Typography>
</AccordionSummary>
```

**If filter counts NOT available** (common for boolean filters):
- Skip count chips for `distance_learning` and `tutorial`
- Only show "✓" indicator when active
- Acceptable for boolean filters

#### Step 7: Update Tests

**File**: `frontend/react-Admin3/src/components/Product/__tests__/FilterPanel.test.js`

**Add tests for new filter sections**:

```javascript
describe('Navbar Filter Sections', () => {
  test('renders Tutorial Format section', () => {
    renderWithProviders(<FilterPanel />);
    expect(screen.getByText('Tutorial Format')).toBeInTheDocument();
  });

  test('Tutorial Format dispatches action on selection', async () => {
    renderWithProviders(<FilterPanel />);

    // Expand Tutorial Format section
    fireEvent.click(screen.getByText('Tutorial Format'));

    // Click "Online" radio button
    const onlineRadio = screen.getByLabelText('Online');
    fireEvent.click(onlineRadio);

    // Verify Redux action dispatched
    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith(setTutorialFormat('online'));
    });
  });

  test('renders Distance Learning section', () => {
    renderWithProviders(<FilterPanel />);
    expect(screen.getByText('Distance Learning')).toBeInTheDocument();
  });

  test('Distance Learning checkbox toggles state', async () => {
    renderWithProviders(<FilterPanel />);

    // Expand section
    fireEvent.click(screen.getByText('Distance Learning'));

    // Click checkbox
    const checkbox = screen.getByLabelText('Distance Learning Only');
    fireEvent.click(checkbox);

    // Verify action dispatched
    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith(toggleDistanceLearning());
    });
  });

  test('renders Tutorial section', () => {
    renderWithProviders(<FilterPanel />);
    expect(screen.getByText(/^Tutorial$/)).toBeInTheDocument(); // Exact match to avoid "Tutorial Format"
  });

  test('Tutorial checkbox toggles state', async () => {
    renderWithProviders(<FilterPanel />);

    // Expand section
    fireEvent.click(screen.getByText(/^Tutorial$/));

    // Click checkbox
    const checkbox = screen.getByLabelText('Tutorial Products Only');
    fireEvent.click(checkbox);

    // Verify action dispatched
    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith(setTutorial(true));
    });
  });

  test('navbar filter sections show active state', () => {
    const initialState = {
      filters: {
        ...defaultFilters,
        tutorial_format: 'online',
        distance_learning: true,
        tutorial: true
      }
    };

    renderWithProviders(<FilterPanel />, { initialState });

    // Expand sections
    fireEvent.click(screen.getByText('Tutorial Format'));
    fireEvent.click(screen.getByText('Distance Learning'));
    fireEvent.click(screen.getByText(/^Tutorial$/));

    // Verify checked states
    expect(screen.getByLabelText('Online')).toBeChecked();
    expect(screen.getByLabelText('Distance Learning Only')).toBeChecked();
    expect(screen.getByLabelText('Tutorial Products Only')).toBeChecked();
  });

  test('Clear All button clears navbar filters', async () => {
    const initialState = {
      filters: {
        ...defaultFilters,
        tutorial_format: 'online',
        distance_learning: true,
        tutorial: true
      }
    };

    renderWithProviders(<FilterPanel />, { initialState });

    // Click Clear All
    fireEvent.click(screen.getByText('Clear All Filters'));

    // Verify clearAllFilters dispatched
    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith(clearAllFilters());
    });
  });
});
```

### Testing Strategy

**Unit Tests**:
- Test each new filter section renders correctly
- Test Redux actions dispatched on filter interactions
- Test visual feedback for selected/active states
- Test filter sections are collapsible
- Test Clear All clears navbar filters

**Integration Tests**:
- Test complete flow: FilterPanel change → Redux update → URL update → API call
- Test navbar filters combine with existing filters in API payload
- Test filter combinations produce expected results

**Manual Testing Checklist**:
1. Open `/products` page
2. Open FilterPanel sidebar
3. Verify "Tutorial Format", "Distance Learning", "Tutorial" sections visible
4. Click "Tutorial Format" → "Online"
   - ✅ Radio button checked
   - ✅ URL updates to `/products?tutorial_format=online`
   - ✅ Product list updates with online tutorials
5. Click "Distance Learning Only" checkbox
   - ✅ Checkbox checked
   - ✅ URL adds `&distance_learning=true`
   - ✅ Product list filtered to distance learning products
6. Click "Tutorial Products Only" checkbox
   - ✅ Checkbox checked
   - ✅ URL adds `&tutorial=true`
   - ✅ Product list shows tutorial products
7. Click "Clear All Filters"
   - ✅ All navbar filters cleared
   - ✅ All checkboxes/radios unchecked
   - ✅ URL reverts to `/products`
8. Test on mobile device
   - ✅ FilterPanel opens/closes correctly
   - ✅ Navbar filters visible and functional
   - ✅ Touch targets adequate size

---

## Integration Verification

### IV1: Navbar Filters Display in FilterPanel

**Verification Steps**:
1. Navigate to `/products` page
2. Open FilterPanel (sidebar or drawer)
3. Look for "Tutorial Format", "Distance Learning", "Tutorial" sections

**Success Criteria**:
- All 3 new filter sections visible
- Sections collapsible/expandable like existing sections
- Styling matches existing filter sections
- Positioned logically in filter list

### IV2: Navbar Filter Changes Trigger API Calls

**Verification Steps**:
1. Open Network tab in browser dev tools
2. Clear network log
3. Click "Tutorial Format" → "Online"
4. Observe network requests

**Expected Behavior**:
1. Redux action dispatched: `setTutorialFormat('online')`
2. Middleware updates URL to `/products?tutorial_format=online`
3. useProductsSearch detects Redux change
4. After 250ms debounce, API call to `/api/products/search`
5. API payload includes `filters: { ..., tutorial_format: 'online' }`
6. Products filtered correctly

**Success Criteria**:
- Single API call (no duplicates)
- API payload includes navbar filter
- Product list updates with correct products
- URL reflects filter state

### IV3: Navbar Filters Combine with Existing Filters

**Verification Steps**:
1. Apply existing filter: Check "CB1" subject
2. Apply navbar filter: Select "Online" tutorial format
3. Check URL parameters
4. Check API call payload

**Expected Behavior**:
- URL: `/products?subject_code=CB1&tutorial_format=online`
- API payload:
  ```json
  {
    "filters": {
      "subjects": ["CB1"],
      "tutorial_format": "online"
    }
  }
  ```
- Product list shows: CB1 subject AND online tutorial format products

**Success Criteria**:
- Both filters active simultaneously
- Filters combined with AND logic
- Results show only products matching both filters
- URL shows all active filters

---

## Technical Notes

### Integration Approach

**How New Filter Sections Work**:

```
User clicks navbar filter in FilterPanel
         │
         ▼
┌────────────────────────┐
│ Redux Action Dispatched│
│ setTutorialFormat(...)│
└────────────────────────┘
         │
         ▼
┌────────────────────────┐
│ Redux Store Updated    │
│ filters.tutorial_format│
│ = 'online'             │
└────────────────────────┘
         │
         ├───────────────────────┐
         │                       │
         ▼                       ▼
┌────────────────┐    ┌──────────────────┐
│ FilterPanel    │    │ Middleware       │
│ Re-renders     │    │ Detects Change   │
│ (shows checked)│    └──────────────────┘
└────────────────┘              │
                                ▼
                     ┌──────────────────┐
                     │ URL Updated      │
                     │ ?tutorial_format=│
                     │ online           │
                     └──────────────────┘
                                │
                                ▼
                     ┌──────────────────┐
                     │ useProductsSearch│
                     │ Triggers API     │
                     └──────────────────┘
                                │
                                ▼
                     ┌──────────────────┐
                     │ Products Update  │
                     └──────────────────┘
```

### Existing Pattern Reference

**Material-UI Accordion Pattern**:
- Consistent with existing FilterPanel sections
- Uses `Accordion`, `AccordionSummary`, `AccordionDetails` components
- `FormControlLabel` + `Checkbox` / `Radio` for input controls
- Optional `Chip` components for active filter indicators

**Similar Components**:
- Subjects section (multi-select checkboxes)
- Categories section (multi-select checkboxes)
- NEW navbar filters follow same pattern

### Key Constraints

1. **Must use existing components** - No custom checkbox/radio components
2. **Must match styling** - Use same colors, spacing, typography
3. **Must maintain performance** - No additional API calls
4. **Must be accessible** - Keyboard navigation, screen reader support

### Alternative Approaches Considered

**Alternative 1: Separate "Navbar Filters" section**
- Group all navbar filters under one expandable section
- Pro: Clear separation, easier to find
- Con: Adds extra nesting, harder to use

**Alternative 2: Badge indicators instead of chips**
- Use Material-UI Badge on section headers
- Pro: More subtle visual feedback
- Con: Less clear than chip indicators

**Chosen Approach**: Individual sections with chip indicators
- Rationale: Consistent with existing filter sections
- Best for discoverability and usability

---

## Definition of Done

- [x] "Tutorial Format" section added to FilterPanel with radio buttons
- [x] "Distance Learning" section added with single checkbox
- [x] "Tutorial" section added with single checkbox
- [x] Sections use existing Material-UI Accordion + Checkbox/Radio pattern
- [x] Sections positioned logically in FilterPanel order
- [x] Redux actions imported and dispatched correctly
- [x] Sections show current selected state from Redux
- [x] Sections are collapsible/expandable like existing sections
- [x] Visual styling matches existing filter sections exactly
- [x] Chip indicators show active filter count or checkmark
- [x] Clear All button clears navbar filters (already works from Story 1.2)
- [x] Unit tests added for all new filter sections
- [x] Integration tests verify API calls include navbar filters
- [x] Manual testing confirms filters work on desktop and mobile
- [x] Accessibility compliance verified (keyboard nav, screen readers)
- [x] No console errors or warnings
- [x] Code reviewed by another developer

---

## Risk Assessment and Mitigation

### Primary Risk: Visual Inconsistency with Existing Filters

**Risk**: New filter sections look different from existing sections, breaking UI consistency

**Mitigation**:
1. Copy exact JSX structure from existing filter sections
2. Reuse same Material-UI components (Accordion, FormControlLabel, Checkbox)
3. Use existing color theme variables (no hardcoded colors)
4. Test side-by-side with existing sections for visual consistency
5. Get UX review before marking complete

**Probability**: Low (copying existing pattern)
**Impact**: Medium (poor user experience)

### Secondary Risk: Redux Actions Not Wired Correctly

**Risk**: Clicking checkbox/radio doesn't dispatch action, filters don't work

**Mitigation**:
1. Import actions from filtersSlice: `import { setTutorialFormat, ... } from '...'`
2. Verify actions exist in Story 1.2 implementation
3. Test Redux DevTools show action dispatched on click
4. Unit tests verify correct action dispatched
5. Integration tests verify Redux state updated

**Probability**: Low (straightforward implementation)
**Impact**: High (filters don't work at all)

**Verification**:
```javascript
// Redux DevTools should show:
// filters/setTutorialFormat { payload: 'online' }
// filters/toggleDistanceLearning
// filters/setTutorial { payload: true }
```

### Rollback Plan

If new filter sections break FilterPanel:

1. **Quick Rollback** (5 minutes):
   - Git revert Story 1.7 commits
   - FilterPanel goes back to existing sections only
   - Navbar filters hidden again but functional

2. **Investigate** (10 minutes):
   - Check Redux DevTools for action dispatches
   - Check console for React errors
   - Verify imports are correct
   - Check Redux state includes navbar filter fields

3. **Fix Forward** (30 minutes):
   - Fix action imports if incorrect
   - Fix Redux selector if missing navbar fields
   - Fix styling if visual inconsistency
   - Test each section individually

---

## Dependencies and Blockers

**Dependencies**:
- ✅ **Story 1.2**: Navbar filters must exist in Redux state (blocks this story)
- ✅ **Story 1.2**: Redux actions `setTutorialFormat`, `toggleDistanceLearning`, `setTutorial` must exist

**Blockers**:
- If Story 1.2 actions not implemented → cannot dispatch actions
- If Story 1.2 state fields missing → cannot read checkbox states

**Enables**:
- Story 1.8 (Display Navbar Filters in ActiveFilters) - similar pattern
- User ability to see and manage all filters - critical UX improvement

---

## Related PRD Sections

- **FR6**: FilterPanel displays ALL active filters including navbar filters
- **UC1-UC9**: UI Consistency Requirements (visual, interaction, responsive, accessibility)
- **Section 3.2**: Modified Screens - FilterPanel changes described
- **Code Review Section**: Issue #3 - Hidden filters cannot be cleared (this story fixes it)

---

## Next Steps After Completion

1. **Code Review**: Get peer review of new filter sections
2. **Story 1.8**: Display Navbar Filters in ActiveFilters component (similar implementation)
3. **Story 1.9**: Migrate SearchBox to Redux (consolidates all filter state)
4. **UX Testing**: Get user feedback on navbar filter visibility

---

## Verification Script

```bash
# After implementation, verify new sections added
grep -n "Tutorial Format" frontend/react-Admin3/src/components/Product/FilterPanel.js
grep -n "Distance Learning" frontend/react-Admin3/src/components/Product/FilterPanel.js
grep -n "tutorial_format" frontend/react-Admin3/src/components/Product/FilterPanel.js

# Should find multiple occurrences (section headers, state access)

# Verify Redux actions imported
grep -n "setTutorialFormat\|toggleDistanceLearning\|setTutorial" frontend/react-Admin3/src/components/Product/FilterPanel.js

# Should find imports and dispatches

# Count Accordion components (should increase by 3)
grep -c "<Accordion" frontend/react-Admin3/src/components/Product/FilterPanel.js

# Before: ~5-7 Accordion sections
# After: ~8-10 Accordion sections (+3)
```

---

**Story Status**: ❌ **CANCELLED/REMOVED**
**Reason**: Feature implemented but subsequently removed (not needed)
**Removal Date**: 2025-10-20
**Removal Commit**: 026f2f23 - `refactor(filters): Remove navbar filters from FilterPanel, ActiveFilters, and Redux store`

**Original Status**: Ready for Development (after Story 1.2 complete)
**Assigned To**: [N/A]
**Started**: [N/A]
**Completed**: Implemented then removed

**Note**: The navbar filters (tutorial_format, distance_learning, tutorial) were initially implemented in FilterPanel and ActiveFilters components, but were later determined to be unnecessary and removed from the codebase. All related code, tests, and documentation have been removed.
