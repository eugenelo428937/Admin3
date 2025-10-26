# Phase 0: Research - Display Navbar Filters in FilterPanel and ActiveFilters

**Feature**: Stories 1.7-1.8 - Make navbar filters visible in UI
**Date**: 2025-10-19

## Research Status

✅ **No unknowns requiring research** - All technical decisions already made in Stories 1.7 and 1.8 detailed implementation guides.

## Technology Decisions

### 1. UI Component Framework

**Decision**: Material-UI v5 (MUI)

**Rationale**:
- Already in use throughout the application
- Provides Accordion, Checkbox, Radio, and Chip components needed
- Consistent styling with existing filter sections
- No learning curve for development team

**Alternatives Considered**:
- Ant Design: Would require introducing new dependency
- Custom components: Unnecessary complexity, reinventing the wheel
- Chakra UI: Would create UI inconsistency with rest of app

### 2. State Management Pattern

**Decision**: Redux Toolkit with existing filtersSlice

**Rationale**:
- Navbar filter state already added in Story 1.2 (tutorial_format, distance_learning, tutorial)
- Redux actions already implemented (setTutorialFormat, toggleDistanceLearning, setTutorial)
- URL sync middleware already handles navbar filters (Story 1.1)
- No new state management patterns needed

**Alternatives Considered**:
- Local component state: Would lose URL synchronization and shareability
- Context API: Would require refactoring existing filter state management
- Zustand: Would introduce inconsistency with existing Redux usage

### 3. Component Extension Pattern

**Decision**: Direct extension of existing components (FilterPanel.js, ActiveFilters.js)

**Rationale**:
- Maintains single source of truth for filter UI
- Follows existing accordion pattern in FilterPanel
- Follows existing chip pattern in ActiveFilters
- No architectural changes required

**Alternatives Considered**:
- Separate NavbarFilterPanel component: Adds complexity, duplicate patterns
- Higher-order component wrapper: Over-engineering for simple UI additions
- Render props pattern: Unnecessary indirection

### 4. Filter Rendering Logic

**Decision**: Extend existing FILTER_CONFIG mapping in ActiveFilters.js

**Rationale**:
- FILTER_CONFIG already defines how each filter type renders as chip
- Adding 3 new entries (tutorial_format, distance_learning, tutorial) follows existing pattern
- getDisplayValue() functions handle value-to-label transformation
- Single rendering loop handles all filter types

**Alternatives Considered**:
- Separate rendering function for navbar filters: Code duplication
- Hard-coded chip rendering: Less maintainable than configuration-driven approach
- Component composition: Over-engineering for chip display logic

### 5. URL Parameter Format

**Decision**: Use existing URL sync middleware (Story 1.1) without modifications

**Rationale**:
- Middleware already handles navbar filter URL parameters:
  - `tutorial_format=online` (single value)
  - `distance_learning=1` (boolean as '1' or absent)
  - `tutorial=1` (boolean as '1' or absent)
- Browser history (pushState) already working for back/forward
- No changes needed - just use existing Redux actions

**Alternatives Considered**:
- Custom URL parameter format for navbar filters: Unnecessary inconsistency
- JSON-encoded filters in single param: Less readable, harder to debug
- Base64-encoded state: Obfuscates URL, breaks shareability

## Integration Points

### 1. Redux Store Integration

**Existing State** (from Story 1.2):
```javascript
{
  filters: {
    subjects: [],
    categories: [],
    // ... other filters
    tutorial_format: null,        // ← Already exists
    distance_learning: false,     // ← Already exists
    tutorial: false              // ← Already exists
  }
}
```

**No changes required** - Just read from existing state.

### 2. API Integration

**Existing API Call** (useProductsSearch hook):
```javascript
const searchParams = {
  filters: {
    ...filters,
    tutorial_format,      // ← Already included
    distance_learning,    // ← Already included
    tutorial             // ← Already included
  }
}
```

**No changes required** - Backend already receives navbar filters (Story 1.4).

### 3. URL Synchronization

**Existing Middleware** (urlSyncMiddleware.js):
- Already listens to setTutorialFormat, toggleDistanceLearning, setTutorial actions
- Already updates URL when navbar filters change
- Already restores navbar filters from URL on page load

**No changes required** - Middleware handles everything automatically.

## Best Practices Applied

### 1. Material-UI Accordion Pattern

**Reference**: Existing FilterPanel.js subjects section

**Pattern**:
```javascript
<Accordion>
  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
    <Typography variant="subtitle2">Section Title</Typography>
  </AccordionSummary>
  <AccordionDetails>
    <FormGroup>
      {/* Checkboxes or Radio buttons here */}
    </FormGroup>
  </AccordionDetails>
</Accordion>
```

**Applied to**: Tutorial Format, Distance Learning, Tutorial sections in FilterPanel

### 2. Material-UI Chip Pattern

**Reference**: Existing ActiveFilters.js chip rendering

**Pattern**:
```javascript
<Chip
  key={filterType}
  label={`${config.label}: ${config.getDisplayValue(value)}`}
  color={config.color}
  onDelete={() => handleDelete(filterType, value)}
  size="small"
  sx={{ m: 0.5 }}
/>
```

**Applied to**: Tutorial Format, Distance Learning, Tutorial chips

### 3. React Testing Library Testing Pattern

**Reference**: Existing FilterPanel.test.js and ActiveFilters.test.js

**Pattern**:
- Render with mock Redux provider
- Use `screen.getByText()` to find elements
- Use `fireEvent.click()` to simulate user interactions
- Use `waitFor()` to assert async state changes
- Verify Redux actions dispatched with `mockDispatch`

**Applied to**: All new test cases for navbar filters

## Performance Considerations

### 1. Render Optimization

**Analysis**: Adding 3 accordion sections to FilterPanel
- Estimated impact: < 2ms additional render time
- Accordions start collapsed (lazy rendering of content)
- No impact when sections closed

**Mitigation**: None needed - within performance budget

### 2. Chip Rendering

**Analysis**: Adding up to 3 chips to ActiveFilters
- Estimated impact: < 1ms additional render time per chip
- Chips only render when filters active (not always present)
- Material-UI Chip component already optimized

**Mitigation**: None needed - trivial performance impact

### 3. Redux Action Dispatches

**Analysis**: Checkbox/radio clicks dispatch Redux actions
- No additional overhead vs existing filters
- Middleware already debounces URL updates
- API calls already debounced (250ms)

**Mitigation**: None needed - existing debounce handles rapid clicks

## Accessibility Considerations

### 1. Keyboard Navigation

**WCAG 2.1 AA Requirements**:
- Tab key moves focus between interactive elements ✅
- Enter/Space toggles checkboxes/radios ✅
- Focus indicators visible ✅

**Implementation**: Material-UI components provide keyboard navigation by default

### 2. Screen Reader Support

**WCAG 2.1 AA Requirements**:
- Form labels associated with inputs ✅
- ARIA labels for chip delete buttons ✅
- Accordion expansion state announced ✅

**Implementation**: Material-UI FormControlLabel and Chip have built-in ARIA support

### 3. Touch Targets

**WCAG 2.1 AA Requirements**:
- Minimum 44×44px touch target size ✅

**Implementation**: Material-UI size="small" still meets 44×44px for clickable areas

## Dependencies Verified

### Story 1.2 Dependencies ✅

**Verified** (from completed Story 1.2):
- `tutorial_format`, `distance_learning`, `tutorial` fields exist in filtersSlice
- `setTutorialFormat()`, `toggleDistanceLearning()`, `setTutorial()` actions implemented
- `clearAllFilters()` action resets navbar filters to defaults
- `selectFilters` selector returns navbar filter fields

### Story 1.1 Dependencies ✅

**Verified** (from completed Story 1.1):
- urlSyncMiddleware listens to navbar filter actions
- URL updates automatically when navbar filters change (pushState)
- Browser back/forward button triggers popstate → Redux update → product list refresh
- parseUrlToFilters() extracts navbar filters from URL query parameters

### Story 1.4 Dependencies ✅

**Verified** (from completed Story 1.4):
- useProductsSearch hook reads navbar filters from Redux
- API payload includes tutorial_format, distance_learning, tutorial
- Backend filters products based on navbar filter criteria

## Risks and Mitigation

### Risk 1: Visual Inconsistency

**Risk**: New filter sections look different from existing sections

**Probability**: Low
**Impact**: Medium (poor UX)

**Mitigation**:
- Copy exact JSX structure from existing filter sections
- Use same Material-UI component props (variant, color, size)
- Visual regression testing with screenshots
- Code review focusing on UI consistency

### Risk 2: Redux Action Wiring Errors

**Risk**: Clicking checkbox doesn't dispatch correct action

**Probability**: Low
**Impact**: High (filters don't work)

**Mitigation**:
- Unit tests verify correct action dispatched for each interaction
- Redux DevTools manual testing to observe actions
- Integration tests verify end-to-end filter flow
- Test with existing filters as reference implementation

### Risk 3: Mobile Responsiveness Issues

**Risk**: Filter sections or chips don't work well on mobile

**Probability**: Low
**Impact**: Medium (poor mobile UX)

**Mitigation**:
- Test on actual mobile devices (iOS, Android)
- Use Chrome DevTools mobile emulation
- Verify touch target sizes meet 44×44px minimum
- Test chip wrapping on narrow screens
- Verify FilterPanel drawer behavior on mobile

## Research Conclusions

**All technical decisions finalized** - No unknowns or open questions remain.

**Key Findings**:
1. No new technologies or patterns needed - 100% reuse of existing code
2. No architectural changes required - simple UI extensions
3. All dependencies satisfied by completed Stories 1.1, 1.2, 1.4
4. Performance impact negligible (< 5ms total)
5. Accessibility supported by Material-UI built-in features
6. Risk profile very low - straightforward implementation

**Ready to proceed to Phase 1: Design & Contracts**
