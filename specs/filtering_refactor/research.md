# Research: Scrollable Filter Groups

**Feature**: 002-in-the-frontend
**Date**: 2025-10-28
**Status**: Complete

## Overview
Research findings for implementing scrollable filter groups with max-height constraints, keyboard accessibility, and ARIA attributes in Material-UI Accordion components.

---

## Research Topics

### 1. Material-UI Scrollable AccordionDetails Pattern

**Decision**: Use `sx` prop with `maxHeight` and `overflow: 'auto'` on AccordionDetails

**Rationale**:
- Material-UI v7 fully supports `sx` prop for inline styling
- `overflow: 'auto'` provides scrollbar only when content exceeds max-height (native browser behavior)
- Viewport units (`vh`) work natively in `sx` prop without additional configuration
- No need for external scroll libraries (keeps dependencies minimal)

**Implementation Pattern**:
```javascript
<AccordionDetails
  sx={{
    maxHeight: { xs: '40vh', md: '50vh' },
    overflowY: 'auto',
    padding: 2
  }}
>
  {/* Filter options */}
</AccordionDetails>
```

**Alternatives Considered**:
- ❌ Custom scroll container div: Adds unnecessary DOM nesting
- ❌ react-virtualized: Overkill for filter lists (typically < 50 items)
- ❌ Custom scrollbar styling: Increases complexity, defer to browser defaults

**References**:
- [Material-UI sx prop documentation](https://mui.com/system/getting-started/the-sx-prop/)
- [MDN overflow property](https://developer.mozilla.org/en-US/docs/Web/CSS/overflow)

---

### 2. Dynamic Viewport Adaptation Strategy

**Decision**: Use responsive breakpoint objects in `sx` prop for mobile vs desktop max-heights

**Rationale**:
- Material-UI theme breakpoints (`xs`, `md`) align with existing responsive patterns in codebase
- `useMediaQuery(theme.breakpoints.down('md'))` already used in FilterPanel for mobile detection
- Responsive `sx` objects apply correct max-height automatically based on viewport
- Browser handles viewport resize events natively (no JS listeners needed)

**Implementation Pattern**:
```javascript
const theme = useTheme();
const isMobile = useMediaQuery(theme.breakpoints.down('md'));

<AccordionDetails
  sx={{
    maxHeight: { xs: '40vh', md: '50vh' }, // Mobile: 40vh, Desktop: 50vh
    overflowY: 'auto'
  }}
>
```

**Dynamic Adjustment for Multiple Expanded Panels**:
- **Deferred to implementation**: Initial implementation uses static viewport-relative values
- **Future enhancement**: Calculate available height and distribute among expanded accordions
- **Rationale**: Viewport-relative constraints (50vh/40vh) provide sufficient adaptability for MVP

**Alternatives Considered**:
- ❌ Fixed pixel values (e.g., 400px): Don't adapt to different screen sizes
- ❌ JavaScript resize listeners: Adds complexity, browser CSS handles viewport changes
- ❌ CSS calc() with JavaScript variables: Overengineering for initial implementation

**References**:
- [Material-UI responsive breakpoints](https://mui.com/material-ui/customization/breakpoints/)
- [MDN vh viewport units](https://developer.mozilla.org/en-US/docs/Web/CSS/length#vh)

---

### 3. Keyboard Focus Auto-Scroll Pattern

**Decision**: Use native `scrollIntoView()` on checkbox focus events

**Rationale**:
- Standard DOM API with excellent browser support
- Automatically handles scroll positioning (no manual calculations)
- Smooth scrolling option available via `behavior: 'smooth'`
- Works across all browsers (Chrome, Firefox, Safari)

**Implementation Pattern**:
```javascript
const handleCheckboxFocus = (event) => {
  event.target.scrollIntoView({
    behavior: 'smooth',
    block: 'nearest',  // Only scroll if not already visible
    inline: 'nearest'
  });
};

<Checkbox
  onFocus={handleCheckboxFocus}
  inputProps={{ 'aria-label': `Filter by ${label}` }}
/>
```

**Alternatives Considered**:
- ❌ Manual scroll calculation: Complex, error-prone, reinvents browser behavior
- ❌ react-scroll-into-view library: Unnecessary dependency for standard DOM feature
- ❌ useEffect with ref tracking: Overcomplicates simple focus event handling

**References**:
- [MDN scrollIntoView()](https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollIntoView)
- [WCAG 2.4.7 Focus Visible](https://www.w3.org/WAI/WCAG21/Understanding/focus-visible.html)

---

### 4. ARIA Attributes for Scrollable Regions

**Decision**: Add `role="region"` and `aria-label` to scrollable AccordionDetails

**Rationale**:
- `role="region"` identifies scrollable area as a landmark for screen readers
- `aria-label` provides descriptive name (e.g., "Subjects filter options, scrollable")
- Meets WCAG 2.1 Level AA requirements for accessible names
- Material-UI Accordion already has proper ARIA for expand/collapse

**Implementation Pattern**:
```javascript
<AccordionDetails
  role="region"
  aria-label={`${groupName} filter options${isScrollable ? ', scrollable' : ''}`}
  sx={{ maxHeight: { xs: '40vh', md: '50vh' }, overflowY: 'auto' }}
>
  {/* Filter checkboxes */}
</AccordionDetails>
```

**Accessibility Considerations**:
- ✅ Screen readers announce scrollable region
- ✅ Keyboard users can navigate within region
- ✅ Focus indicators remain visible during scroll
- ✅ No aria-live needed (static content, not dynamic announcements)

**Alternatives Considered**:
- ❌ `aria-live="polite"` for scroll position: Creates announcement noise, not recommended by ARIA APG
- ❌ Custom scrollbar role: Native scrollbars already accessible
- ❌ tabindex on container: Not needed, checkboxes already keyboard-accessible

**References**:
- [ARIA Authoring Practices Guide - Disclosure (Accordion)](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/)
- [MDN ARIA role="region"](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/region_role)
- [WCAG 2.1 Understanding SC 1.3.1: Info and Relationships](https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html)

---

### 5. Testing Strategy for Scrollable Components

**Decision**: Use React Testing Library with scrollIntoView mock + snapshot tests

**Rationale**:
- React Testing Library provides `@testing-library/jest-dom` matchers for overflow checks
- Mock `scrollIntoView` to test focus behavior without actual DOM scrolling
- Snapshot tests validate rendered structure (ARIA attributes, styling)
- Integration tests verify user interactions (keyboard navigation, scrolling)

**Test Structure**:
```javascript
// Unit tests
describe('FilterPanel - Scrollable Behavior', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = jest.fn();
  });

  test('applies max-height to AccordionDetails when rendered', () => {
    render(<FilterPanel />);
    const accordionDetails = screen.getByRole('region', { name: /subjects filter options/i });
    expect(accordionDetails).toHaveStyle({ maxHeight: '50vh', overflowY: 'auto' });
  });

  test('scrolls focused checkbox into view on keyboard navigation', () => {
    render(<FilterPanel />);
    const checkbox = screen.getAllByRole('checkbox')[5];
    checkbox.focus();
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'nearest'
    });
  });

  test('includes ARIA region role with descriptive label', () => {
    render(<FilterPanel />);
    expect(screen.getByRole('region', { name: /subjects filter options, scrollable/i })).toBeInTheDocument();
  });
});
```

**Test Coverage Requirements**:
- [x] Max-height applied correctly (desktop & mobile breakpoints)
- [x] Overflow: auto styling present
- [x] ARIA role="region" and aria-label attributes
- [x] scrollIntoView called on checkbox focus
- [x] Responsive breakpoint behavior (xs: 40vh, md: 50vh)

**Alternatives Considered**:
- ❌ Puppeteer/Playwright E2E tests: Too heavyweight for component testing
- ❌ Visual regression tests only: Don't verify accessibility or interactions
- ❌ Manual testing only: Not repeatable, doesn't enforce coverage

**References**:
- [React Testing Library - Accessibility](https://testing-library.com/docs/queries/byrole/)
- [Jest DOM matchers](https://github.com/testing-library/jest-dom)

---

## Summary of Decisions

| Topic | Decision | Complexity |
|-------|----------|-----------|
| Scrolling mechanism | Native CSS `overflow: auto` + `maxHeight` in sx prop | Low |
| Viewport adaptation | Material-UI responsive breakpoints (xs: 40vh, md: 50vh) | Low |
| Keyboard focus | Native `scrollIntoView()` on focus events | Low |
| ARIA attributes | `role="region"` + `aria-label` on AccordionDetails | Low |
| Testing approach | React Testing Library + scrollIntoView mock | Low |

**Overall Complexity**: Low - Uses native browser features and existing Material-UI patterns

**No External Dependencies Required**: All solutions use existing dependencies (Material-UI, React Testing Library)

---

## Next Steps (Phase 1)

1. **Data Model**: N/A (no data changes, UI-only feature)
2. **Contracts**: Define component prop interface for scrollable behavior
3. **Quickstart**: User acceptance test scenario (verify scrollbar appears, keyboard navigation works)
4. **Tests**: Write failing tests for max-height, overflow, ARIA, focus behavior (RED phase)
5. **Implementation**: Add sx prop styling to AccordionDetails, onFocus handlers (GREEN phase)
