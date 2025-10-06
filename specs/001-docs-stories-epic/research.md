# Research: Tutorial Selection UX Refactoring

**Feature**: Epic 2 - Tutorial Selection UX Refactoring
**Date**: 2025-10-05
**Status**: Complete

## Overview

This document consolidates research findings for Epic 2, focusing on component refactoring, responsive design, and Material-UI best practices for tutorial selection UX improvements.

---

## 1. Material-UI Component APIs

### Decision
Use Material-UI v5 components: Dialog, Snackbar, Grid, SpeedDial, Button

### Rationale
- **Existing dependency**: Project already uses MUI v5, no new dependencies
- **Consistency**: Matches existing MaterialProductCard patterns
- **Accessibility**: MUI components include ARIA labels and keyboard navigation out of the box
- **Theme integration**: Seamless integration with existing theme configuration
- **Mobile-optimized**: Components designed for touch and responsive layouts

### Alternatives Considered
1. **Custom components from scratch**
   - Rejected: Reinventing wheel, inconsistent styling with rest of app
   - Would require significant effort for responsive behavior and accessibility

2. **Third-party component libraries** (e.g., Ant Design, Chakra UI)
   - Rejected: Adds new dependency, inconsistent look with existing MUI components
   - Migration effort not justified for UX refactoring

### Implementation Notes
- Dialog: Use `fullWidth` and `maxWidth="lg"` for responsive sizing
- Snackbar: Use `anchorOrigin={{vertical: 'bottom', horizontal: 'center'}}` for summary bar positioning
- Grid: Use `container` with `spacing={2}` and breakpoint columns: `xs={12} sm={12} md={6} lg={4}`
- SpeedDial: Use `onOpen` and `onClose` handlers with `open` prop for controlled behavior
- Button: Use `variant="outlined"` for unselected, `variant="contained"` for selected

---

## 2. Responsive Grid Layout Strategy

### Decision
Material-UI Grid system with breakpoint-specific column counts

### Rationale
- **Built-in responsiveness**: MUI Grid handles breakpoint transitions automatically
- **Theme integration**: Uses theme breakpoints (lg: 1280px, md: 960px, sm: 600px)
- **Browser tested**: MUI Grid tested across all major browsers
- **Flexbox-based**: Predictable layout behavior, easy to debug
- **Simple API**: Grid `item` + `xs/sm/md/lg` props make intent clear

### Alternatives Considered
1. **CSS Grid**
   - Rejected: Less integration with MUI theme system
   - Would need custom breakpoint media queries
   - Grid gap handling less intuitive than MUI spacing

2. **Flexbox directly**
   - Rejected: More verbose code for multi-column layouts
   - Manual breakpoint management required
   - Less consistent with existing codebase

### Implementation Notes
```jsx
<Grid container spacing={2}>
  {events.map(event => (
    <Grid item xs={12} sm={12} md={6} lg={4} key={event.eventId}>
      <TutorialDetailCard {...event} />
    </Grid>
  ))}
</Grid>
```

**Breakpoint Configuration**:
- **lg (≥1280px)**: 3 columns (lg={4} → 12/3 = 4)
- **md (960-1280px)**: 2 columns (md={6} → 12/6 = 2)
- **sm (<960px)**: 1 column (xs={12} → 12/12 = 1)

---

## 3. Visual Feedback Patterns

### Decision
Button variant switching: `outlined` → `contained` for selection state

### Rationale
- **Material Design standard**: Matches Google's design system conventions
- **Clear visual distinction**: Filled vs outlined is immediately recognizable
- **Accessible**: High contrast between selected/unselected states
- **Consistent with MUI**: Aligns with existing button usage patterns in app
- **Touch-friendly**: Large clickable areas maintained in both states

### Alternatives Considered
1. **Color changes only** (e.g., blue border → green border)
   - Rejected: Insufficient contrast for accessibility
   - Color-blind users may struggle to distinguish states

2. **Icon indicators** (e.g., checkmark icon appears)
   - Rejected: Not immediate enough, requires scanning for icon
   - Icons add visual clutter to cards

3. **Background color changes**
   - Rejected: Less standard than variant switching
   - Can conflict with theme colors

### Implementation Notes
```jsx
<Button
  variant={selectedChoiceLevel === "1st" ? "contained" : "outlined"}
  color="primary"
  onClick={() => onSelectChoice("1st", eventData)}
>
  1st Choice
</Button>
```

**Accessibility Considerations**:
- Use `aria-pressed` attribute to indicate selection state for screen readers
- Maintain minimum 3:1 contrast ratio (MUI default themes comply)
- Ensure focus indicators are visible for keyboard navigation

---

## 4. Epic 1 Integration Points

### Decision
Use existing TutorialChoiceContext methods without modification

### Rationale
- **Epic 1 complete**: All isDraft state management tested and working (48 tests passing)
- **Well-defined API**: Context provides all needed methods:
  - `markChoicesAsAdded(subjectCode)` - Transition draft → cart
  - `restoreChoicesToDraft(subjectCode)` - Transition cart → draft
  - `getDraftChoices(subjectCode)` - Filter draft choices
  - `getCartedChoices(subjectCode)` - Filter carted choices
  - `hasCartedChoices(subjectCode)` - Check cart state
- **No gaps identified**: All Epic 2 requirements satisfied by existing API
- **Stability**: Modifying Epic 1 would require regression testing

### Alternatives Considered
1. **Extend TutorialChoiceContext** with new methods
   - Rejected: Unnecessary complexity, violates Epic 1 completion
   - All needed functionality already exists

2. **Create parallel state management** for UI-only concerns
   - Rejected: Duplicates state, creates sync issues
   - Goes against single source of truth principle

### Integration Points Identified
1. **TutorialDetailCard**: Reads selectedChoiceLevel from context
2. **TutorialSelectionDialog**: Calls `addTutorialChoice()` on selection changes
3. **TutorialSelectionSummaryBar**:
   - Reads `getDraftChoices()` for expanded state
   - Reads `getCartedChoices()` for collapsed state
   - Calls `markChoicesAsAdded()` on "Add to Cart"
   - Calls `removeSubjectChoices()` on "Remove"

### Data Flow
```
User clicks choice button
→ TutorialDetailCard.onSelectChoice()
→ TutorialSelectionDialog handler
→ TutorialChoiceContext.addTutorialChoice()
→ localStorage updated (isDraft: true)
→ TutorialSelectionSummaryBar detects draft choices
→ Summary bar expands
```

---

## 5. Testing Strategy

### Decision
React Testing Library for component tests, Jest for assertions

### Rationale
- **Project standard**: Already used throughout frontend codebase
- **User-centric**: Tests focus on user interactions, not implementation details
- **Excellent async support**: `waitFor`, `findBy*` queries handle React state updates
- **Active community**: Well-maintained, extensive documentation
- **TDD-friendly**: Easy to write failing tests first (RED phase)

### Alternatives Considered
1. **Enzyme**
   - Rejected: Deprecated, no React 18 support
   - Shallow rendering encourages testing implementation details

2. **Cypress Component Testing**
   - Rejected: Overkill for unit tests
   - Slower test execution for component-level tests
   - Better suited for E2E testing

### Testing Layers

**Unit Tests** (per component):
- Render with various prop combinations
- User interaction simulation (clicks, hovers, keyboard)
- Prop callback verification
- Accessibility checks (ARIA labels, roles)

**Integration Tests** (cross-component):
- Dialog → Context → Summary Bar workflow
- Responsive layout behavior across breakpoints
- Cart integration (add/remove/edit flows)

**Visual Regression** (manual or automated):
- Screenshot comparison across device sizes
- SpeedDial state transitions
- Summary bar expand/collapse animations

### Test Structure Example
```javascript
// RED phase: Write failing test first
describe('TutorialDetailCard', () => {
  it('should display event information correctly', () => {
    const mockEvent = {
      eventTitle: 'CS2 Tutorial',
      eventCode: 'TUT-CS2-001',
      location: 'Bristol',
      venue: 'Room 101',
      startDate: '2025-06-01',
      endDate: '2025-06-30'
    };

    render(<TutorialDetailCard event={mockEvent} />);

    expect(screen.getByText('CS2 Tutorial')).toBeInTheDocument();
    expect(screen.getByText('TUT-CS2-001')).toBeInTheDocument();
    expect(screen.getByText('Bristol')).toBeInTheDocument();
  });
});

// GREEN phase: Implement minimal code to pass
// REFACTOR phase: Optimize and clean up while keeping tests green
```

### Coverage Requirements
- **Minimum**: 80% statement coverage (enforced by CLAUDE.md TDD rules)
- **Target**: 90%+ for new components
- **Critical paths**: 100% coverage for choice selection logic, cart integration

---

## 6. Performance Considerations

### Responsive Performance Targets
- **Component render**: <16ms (60fps target)
- **Layout shift (CLS)**: <0.1 (Good rating)
- **SpeedDial response**: <100ms (perceived as instant)
- **Dialog open**: <200ms (acceptable delay)

### Optimization Strategies

**1. Memoization**
- Use `React.memo()` for TutorialDetailCard (pure component, re-renders often in grid)
- Use `useMemo()` for expensive calculations (e.g., filtering choices)
- Use `useCallback()` for event handlers passed to child components

**2. Virtualization** (if needed)
- Consider `react-window` if event list exceeds 50+ items
- Lazy render cards outside viewport
- Not implemented initially (YAGNI), monitor performance

**3. Code Splitting**
- Dialog components lazy-loaded only when opened
- Reduces initial bundle size
- Use `React.lazy()` and `Suspense`

**4. Avoid Layout Thrashing**
- Use CSS transforms for animations (GPU accelerated)
- Batch DOM reads/writes
- Test with Chrome DevTools Performance panel

---

## 7. Accessibility (a11y) Requirements

### WCAG 2.1 Level AA Compliance

**Keyboard Navigation**:
- Tab order: SpeedDial → Dialog → Choice buttons → Summary bar buttons
- Enter/Space: Activate buttons
- Escape: Close dialogs and expanded SpeedDial
- Arrow keys: Navigate SpeedDial actions

**Screen Reader Support**:
- `aria-label` for all icon buttons
- `aria-pressed` for choice buttons (selected state)
- `aria-expanded` for expandable sections (summary bar)
- `role="dialog"` for TutorialSelectionDialog
- Live regions for dynamic updates (cart additions)

**Visual Accessibility**:
- Minimum 3:1 contrast for all text (MUI default themes comply)
- Focus indicators visible and distinct
- No color-only indicators (button variant changes provide shape difference)

---

## 8. Browser Compatibility

### Target Browsers
- **Desktop**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Mobile**: iOS Safari 14+, Chrome Android 90+

### Known Issues
- **Safari**: SpeedDial backdrop may have slight delay on hover (acceptable)
- **IE11**: Not supported (project requirement)

### Testing Strategy
- Primary development: Chrome
- Pre-release testing: Safari, Firefox
- Mobile testing: iOS Safari (physical device), Chrome Android (emulator)

---

## Summary of Decisions

| Area | Decision | Confidence |
|------|----------|------------|
| UI Components | Material-UI v5 | ✅ High |
| Responsive Layout | MUI Grid with breakpoints | ✅ High |
| Visual Feedback | Button variant switching | ✅ High |
| State Integration | Use Epic 1 context as-is | ✅ High |
| Testing Framework | React Testing Library + Jest | ✅ High |
| Performance | React.memo + useMemo | ✅ Medium |
| Accessibility | WCAG 2.1 AA | ✅ High |

**All NEEDS CLARIFICATION items resolved**. Ready for Phase 1 (Design & Contracts).

---

**Research completed**: 2025-10-05
**Next phase**: Phase 1 - Design & Contracts
