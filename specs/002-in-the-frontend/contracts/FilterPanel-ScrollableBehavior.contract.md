# Component Contract: FilterPanel Scrollable Behavior

**Component**: FilterPanel
**Feature**: 002-in-the-frontend
**Date**: 2025-10-28
**Type**: UI Component Enhancement

## Contract Overview

This contract defines the expected behavior for scrollable filter groups within the FilterPanel component. It specifies styling requirements, accessibility attributes, and keyboard interaction patterns.

---

## Visual Behavior Contract

### Requirement VB-001: Max-Height Constraint
**Given** a FilterPanel is rendered with filter groups
**When** a filter group (AccordionDetails) is expanded
**Then** the option list MUST have a maximum height applied:
- Desktop (≥900px): `maxHeight: '50vh'`
- Mobile (<900px): `maxHeight: '40vh'`

**Validation**:
```javascript
const accordionDetails = screen.getByRole('region', { name: /subjects filter options/i });
expect(accordionDetails).toHaveStyle('max-height: 50vh'); // Desktop
```

---

### Requirement VB-002: Overflow Scrolling
**Given** a filter group with max-height applied
**When** the content exceeds the max-height
**Then** a vertical scrollbar MUST appear
**And** content MUST be scrollable

**Validation**:
```javascript
const accordionDetails = screen.getByRole('region', { name: /subjects filter options/i });
expect(accordionDetails).toHaveStyle('overflow-y: auto');
```

---

### Requirement VB-003: Short List Behavior
**Given** a filter group with few options
**When** the total content height is less than the max-height
**Then** no scrollbar MUST appear (native browser behavior)
**And** the content MUST display at its natural height

**Validation**:
```javascript
// Render filter panel with only 2 subjects
render(<FilterPanel />);
const accordionDetails = screen.getByRole('region', { name: /subjects filter options/i });
const scrollHeight = accordionDetails.scrollHeight;
const clientHeight = accordionDetails.clientHeight;
expect(scrollHeight).toBeLessThanOrEqual(clientHeight); // No overflow
```

---

## Accessibility Contract

### Requirement A11Y-001: ARIA Region Role
**Given** a scrollable filter group
**When** the AccordionDetails is rendered
**Then** it MUST have `role="region"`
**And** it MUST have a descriptive `aria-label`

**Validation**:
```javascript
const region = screen.getByRole('region', { name: /subjects filter options, scrollable/i });
expect(region).toBeInTheDocument();
expect(region).toHaveAttribute('role', 'region');
expect(region).toHaveAttribute('aria-label', expect.stringContaining('scrollable'));
```

---

### Requirement A11Y-002: Keyboard Focus Auto-Scroll
**Given** a scrollable filter group with focused checkbox
**When** the user navigates with Tab or Arrow keys
**And** the focused checkbox is outside the visible area
**Then** the scrollable region MUST automatically scroll the checkbox into view

**Validation**:
```javascript
beforeEach(() => {
  Element.prototype.scrollIntoView = jest.fn();
});

test('auto-scrolls focused checkbox', () => {
  render(<FilterPanel />);
  const checkboxes = screen.getAllByRole('checkbox');
  const bottomCheckbox = checkboxes[checkboxes.length - 1];

  // Simulate keyboard focus
  bottomCheckbox.focus();

  expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
    behavior: 'smooth',
    block: 'nearest',
    inline: 'nearest'
  });
});
```

---

### Requirement A11Y-003: Screen Reader Announcement
**Given** a screen reader user
**When** navigating to a scrollable filter group
**Then** the screen reader MUST announce:
- The region role
- The descriptive label (e.g., "Subjects filter options, scrollable")
- The number of checkboxes within

**Manual Validation**:
- Test with NVDA (Windows), JAWS (Windows), VoiceOver (macOS/iOS)
- Navigate to FilterPanel with keyboard
- Verify region landmark announced with descriptive label

---

## Responsive Behavior Contract

### Requirement RB-001: Desktop Max-Height
**Given** a viewport width ≥900px (desktop)
**When** a filter group is expanded
**Then** the max-height MUST be `50vh`

**Validation**:
```javascript
// Mock desktop viewport
global.innerWidth = 1200;
global.dispatchEvent(new Event('resize'));

render(<FilterPanel />);
const accordionDetails = screen.getByRole('region', { name: /subjects filter options/i });
expect(accordionDetails).toHaveStyle('max-height: 50vh');
```

---

### Requirement RB-002: Mobile Max-Height
**Given** a viewport width <900px (mobile)
**When** a filter group is expanded
**Then** the max-height MUST be `40vh`

**Validation**:
```javascript
// Mock mobile viewport
global.innerWidth = 375;
global.dispatchEvent(new Event('resize'));

render(<FilterPanel />);
const accordionDetails = screen.getByRole('region', { name: /subjects filter options/i });
expect(accordionDetails).toHaveStyle('max-height: 40vh');
```

---

### Requirement RB-003: Viewport Resize Handling
**Given** a filter group with scrollable content
**When** the user resizes their browser window
**Then** the max-height MUST dynamically adjust based on the new viewport size
**And** scrollbar appearance MUST update accordingly

**Validation**:
```javascript
render(<FilterPanel />);
const accordionDetails = screen.getByRole('region', { name: /subjects filter options/i });

// Initial desktop size
global.innerWidth = 1200;
global.dispatchEvent(new Event('resize'));
expect(accordionDetails).toHaveStyle('max-height: 50vh');

// Resize to mobile
global.innerWidth = 375;
global.dispatchEvent(new Event('resize'));
expect(accordionDetails).toHaveStyle('max-height: 40vh');
```

---

## Performance Contract

### Requirement P-001: Smooth Scrolling
**Given** a scrollable filter group
**When** the user scrolls with mouse wheel, trackpad, or touch
**Then** scrolling MUST maintain 60fps (16ms frame time)
**And** no janky or stuttered motion

**Validation**:
- Manual testing: Scroll through long filter lists
- Performance profiling: Verify no layout thrashing or excessive repaints
- Chrome DevTools Performance tab: Ensure frames stay under 16ms

---

### Requirement P-002: Auto-Scroll Performance
**Given** keyboard navigation triggering auto-scroll
**When** `scrollIntoView({ behavior: 'smooth' })` is called
**Then** animation MUST complete within 300ms
**And** no frame drops during scroll animation

**Validation**:
- Performance testing: Measure scrollIntoView animation duration
- Verify smooth transition without visual stutter

---

## Integration Points

### FilterPanel Props (Unchanged)
```typescript
interface FilterPanelProps {
  showMobile?: boolean;     // Display as mobile drawer
  isSearchMode?: boolean;   // Search mode indicator
}
```

**No Breaking Changes**: Scrollable behavior is transparent to parent components.

---

## Test Coverage Requirements

### Unit Tests (React Testing Library)
- [x] VB-001: Max-height applied (desktop & mobile)
- [x] VB-002: Overflow: auto styling present
- [x] VB-003: Short lists display naturally (no forced scrollbar)
- [x] A11Y-001: ARIA region role and aria-label
- [x] A11Y-002: scrollIntoView called on checkbox focus
- [x] RB-001: Desktop viewport uses 50vh
- [x] RB-002: Mobile viewport uses 40vh
- [x] RB-003: Viewport resize triggers recalculation

### Integration Tests
- [x] Keyboard navigation through scrollable list
- [x] Focus visible indicators remain during scroll
- [x] Multiple expanded accordions don't exceed viewport

### Manual Accessibility Tests
- [ ] Screen reader announces scrollable regions
- [ ] Keyboard-only navigation functional
- [ ] Touch scrolling smooth on mobile devices

---

## Acceptance Criteria

This contract is considered fulfilled when:

1. ✅ All unit tests pass (8 automated tests)
2. ✅ All integration tests pass (3 automated tests)
3. ✅ Manual accessibility validation complete (3 scenarios)
4. ✅ Performance profiling shows 60fps scrolling
5. ✅ No visual regressions in existing FilterPanel functionality

---

## Contract Version
**Version**: 1.0.0
**Last Updated**: 2025-10-28
**Approved By**: [To be filled during review]
