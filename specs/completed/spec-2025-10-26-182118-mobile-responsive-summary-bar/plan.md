# Implementation Plan: Mobile Responsive Tutorial Summary Bar

**Branch**: `epic-4-story-3-mobile-responsive-summary-bar` | **Date**: 2025-10-26 | **Spec**: [spec-2025-10-26-182118-mobile-responsive-summary-bar.md](../specs/spec-2025-10-26-182118-mobile-responsive-summary-bar.md)
**Input**: Feature specification from `specs/spec-2025-10-26-182118-mobile-responsive-summary-bar.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → Spec loaded successfully
2. Fill Technical Context
   → Project Type: web (React frontend)
   → Structure Decision: Option 2 (Web application)
   → No NEEDS CLARIFICATION markers found
3. Fill Constitution Check section
   → No constitution.md file found (brownfield project)
   → Applying general best practices
4. Evaluate Constitution Check
   → No violations - frontend-only responsive enhancement
   → Update Progress Tracking: Initial Constitution Check ✓
5. Execute Phase 0 → research.md
   → No research needed - spec complete, tech stack known
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md
   → Contracts: N/A (frontend-only, no API changes)
   → Data model: N/A (no new data structures)
   → Quickstart: Create responsive testing guide
   → CLAUDE.md: Update with mobile responsive patterns
7. Re-evaluate Constitution Check
   → No new violations introduced
   → Update Progress Tracking: Post-Design Constitution Check ✓
8. Plan Phase 2 → Describe task generation approach
   → TDD approach with Jest/React Testing Library
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 9. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary

**Primary Requirement**: Make the TutorialSelectionSummaryBar component mobile-responsive while preserving desktop experience.

**Technical Approach**:
- Use Material-UI responsive `sx` prop patterns with breakpoints
- Implement **Bottom Sheet pattern** (Material-UI Drawer) for expanded mobile view
- Preserve existing desktop layout (≥ 900px) unchanged
- Apply existing touch interaction styles from tutorialStyles.js
- No backend changes, no API modifications, no new data structures

**Key Components Modified**:
1. `TutorialSelectionSummaryBar.js` - Add mobile responsive styling
2. `TutorialSummaryBarContainer.js` - Update positioning for mobile

## Technical Context

**Language/Version**: JavaScript (React 18)
**Primary Dependencies**:
- Material-UI v5 (responsive design system with breakpoints)
- React hooks (useState, useEffect, useMediaQuery)
- Existing TutorialChoiceContext

**Storage**: N/A (frontend-only, uses existing context)
**Testing**: Jest, React Testing Library, @testing-library/user-event
**Target Platform**: Web browsers (desktop ≥ 900px, mobile < 900px)
**Project Type**: web (React frontend + Django backend)
**Performance Goals**:
- 60fps animations (CSS transforms)
- < 5ms responsive breakpoint transitions
- No layout shift during collapse/expand

**Constraints**:
- Desktop experience must remain unchanged (≥ 900px)
- Touch targets minimum 44px × 44px (WCAG 2.1 AA)
- No breaking changes to existing API/props
- Z-index coordination: modals (1300) > summary bar (1200) > SpeedDial (1050)

**Scale/Scope**:
- 2 components to modify
- ~100-150 lines of responsive styling additions
- 26 functional requirements to validate
- 5 cross-device test scenarios

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Simplicity Principles**:
- ✅ Use existing Material-UI patterns (no custom responsive library)
- ✅ Leverage existing touch styles (tutorialStyles.js)
- ✅ No new abstractions (responsive logic in components)
- ✅ Minimal file changes (2 components only)

**Testing Principles**:
- ✅ TDD approach with failing tests first
- ✅ Test responsive behavior with media query mocks
- ✅ Verify touch target sizes programmatically
- ✅ Cross-device manual testing checklist

**Integration Principles**:
- ✅ No breaking changes (backward compatible)
- ✅ Props unchanged (existing API preserved)
- ✅ Desktop behavior regression tested

**GATE STATUS**: ✅ PASS - No constitution violations identified

## Project Structure

### Documentation (this feature)
```
specs/spec-2025-10-26-182118-mobile-responsive-summary-bar/
├── plan.md              # This file (/plan command output)
├── quickstart.md        # Phase 1 output - Responsive testing guide
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
# Option 2: Web application
frontend/react-Admin3/
├── src/
│   ├── components/
│   │   └── Product/ProductCard/Tutorial/
│   │       ├── TutorialSelectionSummaryBar.js          # MODIFY
│   │       ├── TutorialSummaryBarContainer.js          # MODIFY
│   │       └── tutorialStyles.js                       # REFERENCE (existing)
│   └── __tests__/
│       └── components/Product/ProductCard/Tutorial/
│           ├── TutorialSelectionSummaryBar.test.js     # CREATE
│           └── TutorialSummaryBarContainer.test.js     # CREATE

backend/django_Admin3/
└── (no changes)
```

**Structure Decision**: Option 2 (Web application) - Frontend-only changes

## Phase 0: Outline & Research

**Research Status**: ✅ COMPLETE - No unknowns remain

### Design Decision: Bottom Sheet Pattern

After analyzing the three design options from the story document:

**Chosen Approach**: **Bottom Sheet (Material-UI Drawer)**

**Rationale**:
- Material-UI Drawer provides built-in backdrop, swipe-to-dismiss, and accessibility
- Familiar mobile pattern (iOS/Android bottom sheets)
- Doesn't obstruct main content when collapsed
- Easy to implement with existing MUI components
- Already has accessibility features (focus trap, keyboard handling, screen reader support)

**Alternatives Considered**:
1. **Slide-Up Panel**: Would require custom CSS animations and state management. Rejected because it always occupies bottom screen space and may conflict with future bottom navigation.

2. **Floating Compact Widget (FAB)**: Would require separate modal/drawer for expanded view. Rejected because it's less discoverable than always-visible bottom sheet and adds complexity.

**Implementation Pattern**:
```javascript
// Mobile: Drawer for expanded state
{isMobile && isExpanded && (
  <Drawer
    anchor="bottom"
    open={isExpanded}
    onClose={handleCollapse}
    sx={{
      '& .MuiDrawer-paper': {
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        maxHeight: '50vh',
      }
    }}
  >
    {/* Full summary bar content */}
  </Drawer>
)}

// Mobile collapsed OR Desktop: Paper component
{(!isMobile || !isExpanded) && (
  <Paper sx={{ /* responsive styles */ }}>
    {/* Collapsed or desktop content */}
  </Paper>
)}
```

**No Additional Research Needed**:
- Material-UI breakpoints pattern is documented and understood
- Touch interaction styles already exist in tutorialStyles.js
- React hooks (useState, useMediaQuery) are standard tools
- Testing patterns with React Testing Library are established

## Phase 1: Design & Contracts

### 1. Data Model

**No new data structures required** - This is a presentation-layer enhancement only.

**Existing Data Structures (Referenced)**:
- `tutorialChoices` - From TutorialChoiceContext (unchanged)
- `subjectChoices` - Derived from tutorialChoices (unchanged)
- `isCollapsed` - Component state (already exists, behavior modified)

**New Component State**:
- `isMobile` - Derived from `useMediaQuery(theme.breakpoints.down('md'))` hook

### 2. API Contracts

**No API changes** - This is a frontend-only enhancement. All data flows through existing:
- TutorialChoiceContext (unchanged)
- CartContext (unchanged)
- Existing component props (unchanged)

### 3. Component Interface Contract

**TutorialSelectionSummaryBar.js**:
```javascript
// EXISTING PROPS (UNCHANGED)
PropTypes: {
  subjectCode: PropTypes.string.isRequired,
  onEdit: PropTypes.func.isRequired,
  onAddToCart: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
}

// NEW INTERNAL STATE
const isMobile = useMediaQuery(theme.breakpoints.down('md'));
const [isCollapsed, setIsCollapsed] = useState(isMobile); // Default: collapsed on mobile

// BEHAVIOR CONTRACT
// Mobile (< 900px):
//   - Collapsed by default (show subject code + expand icon)
//   - Expanded state uses Drawer component
//   - Full viewport width positioning
// Desktop (≥ 900px):
//   - Expanded by default (current behavior)
//   - Positioned bottom-left (current behavior)
//   - Max width 24rem (current behavior)
```

**TutorialSummaryBarContainer.js**:
```javascript
// EXISTING STRUCTURE (UNCHANGED)
// Props: None (uses context)
// Children: TutorialSelectionSummaryBar[] (one per subject)

// MODIFIED LAYOUT (sx prop changes only)
<Box
  sx={{
    position: 'fixed',
    // Mobile: Full width at bottom
    bottom: { xs: 0, md: 16 },
    left: { xs: 0, md: 16 },
    right: { xs: 0, md: 'auto' },
    width: { xs: '100%', md: 'auto' },
    // Desktop: Current positioning preserved
    maxWidth: { md: '24rem' },
    zIndex: 1200,
  }}
>
  {/* Render summary bars */}
</Box>
```

### 4. Testing Contracts

**Test Scenarios** (from spec acceptance criteria):

1. **Mobile Compact View Test**:
   - Given: Screen width < 900px
   - When: Summary bar renders
   - Then: Collapsed by default, subject code visible, expand icon visible

2. **Desktop Full View Test**:
   - Given: Screen width ≥ 900px
   - When: Summary bar renders
   - Then: Expanded by default, all choices visible, bottom-left positioning

3. **Mobile Expand/Collapse Test**:
   - Given: Collapsed summary bar on mobile
   - When: User clicks expand icon
   - Then: Drawer opens, all choices visible, action buttons visible

4. **Touch Target Size Test**:
   - Given: Mobile viewport
   - When: Rendering action buttons
   - Then: All buttons ≥ 44px × 44px

5. **Responsive Transition Test**:
   - Given: Desktop mode
   - When: Viewport resized to mobile
   - Then: Summary bar transitions to collapsed mobile mode

**Test Files to Create**:
- `TutorialSelectionSummaryBar.test.js` - Component behavior tests
- `TutorialSummaryBarContainer.test.js` - Layout and positioning tests

### 5. Quickstart Guide (quickstart.md)

Create responsive testing guide with:
- Chrome DevTools device simulation steps
- Breakpoint testing checklist (899px, 900px, 901px)
- Touch target validation steps
- Animation performance verification
- Accessibility audit steps (keyboard nav, screen reader)

### 6. Update CLAUDE.md

Add section on mobile responsive patterns:
```markdown
## Mobile Responsive Summary Bar Pattern

### Responsive Breakpoint Strategy
- Mobile: < 900px (xs, sm breakpoints)
- Desktop: ≥ 900px (md, lg, xl breakpoints)
- Use Material-UI `theme.breakpoints.down('md')` for mobile detection

### Bottom Sheet Pattern
- Mobile expanded state uses Material-UI Drawer
- Collapsed state shows single-line bar with subject code
- Desktop unchanged (current behavior preserved)

### Touch Accessibility
- Minimum touch target: 44px × 44px (WCAG 2.1 AA)
- Use existing touchIconButtonStyle from tutorialStyles.js
- Minimum button spacing: 8px

### Testing Responsive Components
- Mock useMediaQuery hook for viewport testing
- Test both mobile and desktop rendering paths
- Verify touch target sizes programmatically
```

**Output**: quickstart.md created, CLAUDE.md updated

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:

1. **Test Setup Tasks**:
   - Create test file structure
   - Configure media query mocks for responsive testing
   - Set up accessibility testing utilities

2. **Component Modification Tasks** (TDD order):
   - Write failing test: Mobile collapsed view default
   - Implement: Add useMediaQuery hook, conditional isCollapsed default
   - Write failing test: Desktop expanded view default
   - Verify: Desktop behavior unchanged
   - Write failing test: Mobile Drawer for expanded state
   - Implement: Add Drawer component for mobile expanded view
   - Write failing test: Touch target sizes ≥ 44px
   - Verify: Existing touchIconButtonStyle applied
   - Write failing test: Responsive transitions (900px boundary)
   - Implement: Responsive sx prop styling

3. **Container Modification Tasks** (TDD order):
   - Write failing test: Mobile full-width positioning
   - Implement: Update sx prop with responsive values
   - Write failing test: Desktop bottom-left positioning preserved
   - Verify: Regression test passes

4. **Integration Tasks**:
   - Manual testing: Cross-device checklist (iPhone, Android, iPad, Desktop)
   - Accessibility audit: Keyboard nav, screen reader, reduced motion
   - Performance validation: 60fps animation, no layout shift

**Ordering Strategy**:
- Tests before implementation (RED → GREEN → REFACTOR)
- Mobile tests first (new behavior)
- Desktop tests second (regression prevention)
- Integration tests last (cross-device validation)

**Parallelization**:
- TutorialSelectionSummaryBar.test.js [P] - Independent file
- TutorialSummaryBarContainer.test.js [P] - Independent file
- quickstart.md creation [P] - Independent documentation

**Estimated Output**:
- 15-20 implementation tasks (TDD cycles)
- 5 cross-device manual testing tasks
- 3 accessibility audit tasks
- Total: ~25-30 tasks

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation following TDD workflow
- RED: Write failing test
- GREEN: Minimal implementation to pass test
- REFACTOR: Clean up while keeping tests green

**Phase 5**: Validation
- Run full test suite (Jest)
- Execute quickstart.md cross-device testing
- Performance validation (Chrome DevTools)
- Accessibility audit (axe DevTools, keyboard testing)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

**No violations** - No complexity deviations to document.

This is a straightforward responsive enhancement:
- Uses existing Material-UI patterns
- Leverages existing touch styles
- No new abstractions or libraries
- Minimal file changes (2 components)

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning approach described (/plan command)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (none)

---

## Implementation Notes

### Design Pattern: Responsive Component Branching

**Chosen Pattern**: Conditional rendering based on `isMobile` state

```javascript
const isMobile = useMediaQuery(theme.breakpoints.down('md'));

// Mobile expanded: Drawer component
if (isMobile && !isCollapsed) {
  return <Drawer>...</Drawer>;
}

// Mobile collapsed OR Desktop: Paper component
return <Paper sx={{ /* responsive styles */ }}>...</Paper>;
```

**Why this pattern**:
- Clear separation of mobile vs desktop rendering
- Drawer component provides mobile-optimized UX (backdrop, swipe-to-dismiss)
- Desktop rendering unchanged (no risk of regression)
- Easy to test (mock useMediaQuery hook)

### Responsive Styling Strategy

**Material-UI sx prop with breakpoint objects**:
```javascript
sx={{
  // Mobile values (default)
  bottom: 0,
  left: 0,
  right: 0,
  width: '100%',

  // Desktop values (md breakpoint and up)
  [theme.breakpoints.up('md')]: {
    bottom: 16,
    left: 16,
    right: 'auto',
    width: 'auto',
    maxWidth: '24rem',
  }
}}
```

**Why this approach**:
- Mobile-first responsive design (default styles for mobile)
- Progressive enhancement for desktop
- Follows Material-UI best practices
- Single source of truth for responsive values

### Animation Performance

**Use CSS transforms instead of height animations**:
```javascript
// Material-UI Drawer uses transforms internally (no custom code needed)
// For manual animations (if needed):
sx={{
  transform: isCollapsed ? 'translateY(100%)' : 'translateY(0)',
  transition: 'transform 0.3s ease-in-out',
}}
```

**Why transforms**:
- GPU-accelerated (60fps performance)
- No layout reflow (prevents layout shift)
- Respects prefers-reduced-motion via Material-UI

### Touch Target Validation

**Programmatic verification in tests**:
```javascript
// Test example (Phase 2 tasks will create)
test('all action buttons meet 44px touch target minimum', () => {
  render(<TutorialSelectionSummaryBar {...props} />);

  const buttons = screen.getAllByRole('button');
  buttons.forEach(button => {
    const { width, height } = button.getBoundingClientRect();
    expect(width).toBeGreaterThanOrEqual(44);
    expect(height).toBeGreaterThanOrEqual(44);
  });
});
```

### Z-index Coordination

**Verify hierarchy**:
- Material-UI Modal: 1300 (default)
- TutorialSummaryBarContainer: 1200 (current, unchanged)
- SpeedDial: 1050 (verify no conflicts)

**No changes needed** - Current z-index values are correct.

### Accessibility Considerations

**Screen Reader Announcements**:
```javascript
// Drawer provides built-in ARIA labels
<Drawer
  aria-label="Tutorial selection summary"
  role="dialog"
  aria-modal="true"
>
```

**Keyboard Navigation**:
- Material-UI Drawer handles focus trap automatically
- Escape key to close (built-in)
- Tab navigation through action buttons (existing)

**Reduced Motion Support**:
```javascript
// Material-UI Drawer respects prefers-reduced-motion automatically
// No custom code needed
```

---

## Risk Mitigation

### Risk 1: Desktop Regression
**Mitigation**:
- Comprehensive regression tests for desktop (≥ 900px)
- Visual regression testing at 900px, 1200px, 1920px
- Manual testing on desktop browsers (Chrome, Firefox, Safari)

### Risk 2: Touch Interaction Conflicts
**Mitigation**:
- Use Material-UI Drawer's built-in swipe detection
- Test on real devices (not just browser DevTools)
- Verify touch-action CSS property prevents unintended gestures

### Risk 3: Animation Performance
**Mitigation**:
- Use CSS transforms (GPU-accelerated)
- Test on lower-end mobile devices
- Performance profiling in Chrome DevTools

### Rollback Plan
- Feature can be disabled by removing responsive styles (revert to desktop-only)
- No data migrations or API changes to revert
- Low risk: Frontend-only, no breaking changes

---

## Cross-Device Testing Checklist (from quickstart.md)

**Mobile Devices**:
- [ ] iPhone 12/13/14 (375px × 812px) - Safari mobile
- [ ] iPhone SE (375px × 667px) - Safari mobile
- [ ] Samsung Galaxy S21 (360px × 800px) - Chrome mobile
- [ ] iPad (768px × 1024px) - Safari tablet (md breakpoint edge case)
- [ ] Tablet landscape mode (1024px × 768px)

**Desktop Browsers**:
- [ ] Chrome (1920px × 1080px) - 100% zoom
- [ ] Firefox (1920px × 1080px) - 100% zoom
- [ ] Safari (1920px × 1080px) - 100% zoom
- [ ] Edge (1920px × 1080px) - 100% zoom

**Breakpoint Edge Cases**:
- [ ] 899px width (just below md breakpoint)
- [ ] 900px width (exactly at md breakpoint)
- [ ] 901px width (just above md breakpoint)

**Zoom Levels** (Desktop):
- [ ] 80% zoom
- [ ] 100% zoom (standard)
- [ ] 125% zoom
- [ ] 150% zoom

---

*Based on spec-2025-10-26-182118-mobile-responsive-summary-bar.md*
*Ready for `/tasks` command to generate tasks.md*
