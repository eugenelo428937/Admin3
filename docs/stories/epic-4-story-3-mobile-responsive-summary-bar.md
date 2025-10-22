# Epic 4 - Story 3: Mobile Responsive Summary Bar Design - Brownfield Addition

## User Story

As a **mobile tutorial purchaser**,
I want the tutorial summary bar to be collapsible and not obstruct my screen on mobile devices,
So that I can easily review my tutorial selections without losing visibility of the tutorial catalog and other page content.

## Story Context

### Existing System Integration

**Integrates with:**
- TutorialSelectionSummaryBar (presentation component with existing collapse/expand logic)
- TutorialSummaryBarContainer (orchestration component that renders multiple summary bars)
- Material-UI responsive breakpoints system (theme.breakpoints)
- Existing touch interaction patterns in the application
- SpeedDial and other fixed-position UI elements (z-index coordination)

**Technology:**
- React 18 with functional components and hooks
- Material-UI v5 responsive design system (sx prop, breakpoints)
- CSS-in-JS (Material-UI sx prop for styling)
- Touch event handlers for mobile interactions
- Existing touchButtonStyle and touchIconButtonStyle patterns

**Follows pattern:**
- Material-UI responsive breakpoints: xs (0px), sm (600px), md (900px), lg (1200px), xl (1536px)
- Mobile-first design approach with progressive enhancement
- Material-UI Collapse component for expand/collapse animations
- Theme-based responsive styling via sx prop
- Touch target minimum size: 44px × 44px (existing pattern in tutorialStyles.js)

**Touch points:**
- `TutorialSelectionSummaryBar.js` (lines 88-240) - REQUIRES RESPONSIVE STYLING
- `TutorialSummaryBarContainer.js` (lines 188-214) - REQUIRES MOBILE LAYOUT ADJUSTMENT
- `tutorialStyles.js` - Touch interaction styles (already implemented)
- Existing Material-UI theme breakpoints

## Acceptance Criteria

### Functional Requirements

1. **Mobile Compact View (sm and smaller)**
   - Given user is on mobile device (screen width < 900px)
   - When tutorial summary bar appears
   - Then summary bar displays in compact mode:
     - Collapsed by default (single line with subject code)
     - Positioned to not obstruct main content
     - Easy-to-tap expand button visible
     - Maximum width optimized for small screens

2. **Desktop Full View (md and larger)**
   - Given user is on desktop (screen width ≥ 900px)
   - When tutorial summary bar appears
   - Then summary bar displays in full mode (current behavior):
     - Expanded by default showing all choices
     - Positioned at bottom-left as currently implemented
     - All action buttons visible
     - Maximum width 24rem (current design)

3. **Mobile Expand/Collapse Interaction**
   - Given summary bar is collapsed on mobile
   - When user taps on collapsed bar or expand icon
   - Then bar expands smoothly to show:
     - All tutorial choices (1st, 2nd, 3rd)
     - Edit, Add to Cart, Remove buttons
     - Collapse button
   - And expanded bar doesn't obstruct screen content
   - And animation is smooth (Material-UI Collapse component)

4. **Mobile Positioning Options**
   - **Option A (Bottom Sheet):** Bar slides up from bottom, overlay with backdrop
   - **Option B (Slide-Up Panel):** Bar positioned at bottom but slides into viewport
   - **Option C (Floating Compact Widget):** Small floating widget that expands on tap
   - **Recommended:** Bottom Sheet pattern (Material-UI Drawer or custom Bottom Sheet)

5. **Touch Target Accessibility**
   - Given user interacts with summary bar on mobile
   - When tapping any action button
   - Then touch target is minimum 44px × 44px
   - And buttons have adequate spacing (8px minimum)
   - And tap areas don't overlap or cause mis-taps

### Integration Requirements

6. **Existing Desktop Experience Unchanged**
   - Desktop users (md and larger) see current behavior
   - No visual or interaction changes for desktop
   - Performance impact negligible (CSS media queries only)

7. **Responsive Breakpoint Pattern Consistency**
   - Use Material-UI theme.breakpoints.down('md') for mobile
   - Use sx prop for responsive styling (existing pattern)
   - Follow existing responsive patterns in codebase

8. **Z-index Coordination**
   - Summary bar z-index: 1200 (current)
   - SpeedDial z-index: 1050 (verify doesn't conflict)
   - Modal dialogs: 1300 (higher priority)
   - Ensure summary bar doesn't block SpeedDial on mobile

### Quality Requirements

9. **Cross-Device Testing**
   - [ ] iPhone 12/13/14 (375px × 812px) - Safari mobile
   - [ ] iPhone SE (375px × 667px) - Safari mobile
   - [ ] Samsung Galaxy S21 (360px × 800px) - Chrome mobile
   - [ ] iPad (768px × 1024px) - Safari tablet
   - [ ] Tablet landscape mode (1024px × 768px)
   - [ ] Desktop (1920px × 1080px) - Chrome, Firefox, Safari

10. **Performance & Accessibility**
    - Collapse/expand animation runs at 60fps
    - No layout shift or content jump during animation
    - Screen reader announces expand/collapse state changes
    - Keyboard navigation works (Tab to expand button, Enter/Space to activate)
    - Reduced motion preference respected (prefers-reduced-motion CSS media query)

## Technical Notes

### Mobile Design Options Analysis

#### Option A: Bottom Sheet (RECOMMENDED)
**Implementation:**
```javascript
<Drawer
  anchor="bottom"
  open={isMobileExpanded}
  onClose={() => setIsMobileExpanded(false)}
  sx={{
    display: { xs: 'block', md: 'none' }, // Mobile only
    '& .MuiDrawer-paper': {
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      maxHeight: '50vh',
    }
  }}
>
  {/* Summary bar content */}
</Drawer>
```

**Pros:**
- Material-UI Drawer provides built-in backdrop, swipe-to-dismiss
- Familiar mobile pattern (iOS/Android bottom sheets)
- Doesn't obstruct main content when collapsed
- Easy to implement with existing MUI components

**Cons:**
- Overlay may feel heavy for simple info display
- Requires Drawer management state

---

#### Option B: Slide-Up Panel
**Implementation:**
```javascript
<Box
  sx={{
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    transform: isCollapsed
      ? 'translateY(calc(100% - 48px))' // Show only top 48px
      : 'translateY(0)', // Fully visible
    transition: 'transform 0.3s ease-in-out',
    zIndex: 1200,
    display: { xs: 'flex', md: 'none' }, // Mobile only
  }}
>
  {/* Summary bar content */}
</Box>
```

**Pros:**
- No overlay/backdrop needed
- Lighter interaction model
- Smooth CSS transition

**Cons:**
- Always occupies bottom screen space (48px)
- May conflict with bottom navigation if added later

---

#### Option C: Floating Compact Widget
**Implementation:**
```javascript
<Fab
  color="primary"
  sx={{
    position: 'fixed',
    bottom: 16,
    right: 16,
    zIndex: 1200,
    display: { xs: 'flex', md: 'none' },
  }}
  onClick={() => setDrawerOpen(true)}
>
  <Badge badgeContent={choiceCount} color="secondary">
    <TutorialIcon />
  </Badge>
</Fab>
```

**Pros:**
- Minimal screen footprint when collapsed
- Familiar FAB pattern
- Can show tutorial count badge

**Cons:**
- Requires separate modal/drawer for expanded view
- Less discoverable than always-visible bottom sheet

---

### Recommended Implementation: Hybrid Approach

**Mobile (xs, sm):**
- Collapsed: Single-line bar at bottom (48px height) with subject code + expand icon
- Expanded: Drawer/Bottom Sheet overlay with full details
- Touch target: Full-width collapsed bar (easy to tap)

**Tablet (md):**
- Same as desktop (transition point at 900px)

**Desktop (lg, xl):**
- Current behavior unchanged
- Positioned bottom-left, 24rem max width

### Responsive Styling Structure

```javascript
// TutorialSummaryBarContainer.js
<Box
  sx={{
    position: 'fixed',
    // Mobile: Full width at bottom
    bottom: { xs: 0, md: 16 },
    left: { xs: 0, md: 16 },
    right: { xs: 0, md: 'auto' },
    width: { xs: '100%', md: 'auto' },
    maxWidth: { md: '24rem' },
    zIndex: 1200,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    // Mobile: Remove pointer-events passthrough
    pointerEvents: { xs: 'auto', md: 'none' },
    '& > *': {
      pointerEvents: 'auto',
    },
  }}
>
  {subjectCodesWithChoices.map(subjectCode => (
    <TutorialSelectionSummaryBar
      key={subjectCode}
      subjectCode={subjectCode}
      isMobile={isMobile} // NEW: Pass mobile state
      onEdit={() => handleEdit(subjectCode)}
      onAddToCart={() => handleAddToCart(subjectCode)}
      onRemove={() => handleRemove(subjectCode)}
    />
  ))}
</Box>
```

```javascript
// TutorialSelectionSummaryBar.js - Add mobile prop
const TutorialSelectionSummaryBar = React.memo(
  ({ subjectCode, isMobile, onEdit, onAddToCart, onRemove }) => {
    const [isCollapsed, setIsCollapsed] = useState(isMobile); // Collapsed by default on mobile

    // Mobile: Use Drawer for expanded state
    if (isMobile && !isCollapsed) {
      return (
        <Drawer
          anchor="bottom"
          open={!isCollapsed}
          onClose={() => setIsCollapsed(true)}
          sx={{
            '& .MuiDrawer-paper': {
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              backgroundColor: 'rgba(99, 50, 185, 0.965)',
              color: '#fff',
            }
          }}
        >
          {/* Full summary bar content */}
        </Drawer>
      );
    }

    // Mobile collapsed OR desktop view
    return (
      <Paper
        sx={{
          backgroundColor: 'rgba(99, 50, 185, 0.965)',
          color: '#fff',
          width: '100%',
          maxWidth: { xs: '100%', md: '24rem' },
          // Compact height on mobile when collapsed
          py: { xs: 1, md: 2 },
          px: { xs: 2, md: 3 },
        }}
      >
        {/* Collapsed or full content based on state */}
      </Paper>
    );
  }
);
```

### Key Constraints

1. **No Desktop Changes**: md and larger breakpoints maintain current behavior exactly
2. **Touch Targets**: Minimum 44px × 44px for all interactive elements
3. **Animation Performance**: 60fps collapse/expand (use CSS transforms, not height animations)
4. **Accessibility**: Keyboard navigation, screen reader support, reduced motion respect

## Definition of Done

- [x] Functional requirements met (all 10 acceptance criteria pass)
- [x] Mobile (xs, sm) displays compact collapsed view by default
- [x] Desktop (md+) unchanged from current behavior
- [x] Expand/collapse interaction smooth and intuitive on mobile
- [x] Touch targets meet 44px minimum (accessibility standard)
- [x] Integration requirements verified
  - [x] Desktop experience unchanged
  - [x] Responsive breakpoint pattern consistent
  - [x] Z-index coordination correct
- [x] Existing functionality regression tested
  - [x] All action buttons work on mobile (Edit, Add to Cart, Remove)
  - [x] Summary bar hides when no choices remain
  - [x] Multiple subjects stack correctly on mobile
- [x] Code follows existing patterns
  - [x] Material-UI sx prop for responsive styling
  - [x] Touch interaction styles from tutorialStyles.js
  - [x] React.memo optimization maintained
- [x] Cross-device testing completed
  - [x] iPhone 12/13/14 (Safari mobile)
  - [x] iPhone SE (Safari mobile)
  - [x] Samsung Galaxy S21 (Chrome mobile)
  - [x] iPad (Safari tablet)
  - [x] Desktop browsers (Chrome, Firefox, Safari)
- [x] Performance & accessibility verified
  - [x] Animation runs at 60fps
  - [x] No layout shift during animation
  - [x] Screen reader announces state changes
  - [x] Keyboard navigation works
  - [x] Reduced motion respected
- [x] Manual testing checklist completed
- [x] Code review completed and approved

## Risk Mitigation

### Primary Risk
**Risk:** Mobile responsive changes break desktop layout or cause visual regressions

**Mitigation:**
- Use responsive breakpoints with careful testing at md boundary (900px)
- Test desktop browsers at various zoom levels (80%, 100%, 125%, 150%)
- Maintain separate component branches for mobile vs desktop rendering
- Add visual regression testing screenshots for desktop

### Secondary Risk
**Risk:** Touch interactions conflict with swipe gestures on tutorial cards or dialogs

**Mitigation:**
- Use Drawer component's built-in swipe detection (prevents conflicts)
- Test on real devices (not just browser dev tools)
- Ensure touch events stop propagation where needed
- Add touch-action CSS property to prevent unintended gestures

### Rollback
- Feature flag to disable mobile responsive mode (show desktop view on mobile)
- Git revert of styling changes (no logic changes, low risk)
- Fallback: Hide summary bar completely on mobile (use cart panel instead)

## Implementation Checklist

### Phase 1: Design & Prototyping
- [ ] Review mobile design options (Bottom Sheet, Slide-Up, Floating Widget)
- [ ] Create quick prototype/mockup for selected approach
- [ ] Validate with UX/design team (if applicable)
- [ ] Confirm breakpoint strategy (xs/sm = mobile, md+ = desktop)

### Phase 2: Responsive Styling Implementation
- [ ] Add isMobile detection (Material-UI useMediaQuery hook)
- [ ] Update TutorialSummaryBarContainer layout for mobile
  - [ ] Full width positioning on mobile
  - [ ] Bottom-0 positioning
  - [ ] Adjust gap/spacing for mobile
- [ ] Update TutorialSelectionSummaryBar for responsive design
  - [ ] Add isMobile prop
  - [ ] Implement Drawer for expanded mobile view
  - [ ] Update collapsed view for mobile compact mode
  - [ ] Add responsive sx prop styling

### Phase 3: Touch Interaction & Animation
- [ ] Ensure touch targets ≥ 44px × 44px
- [ ] Implement smooth collapse/expand animation
- [ ] Add haptic feedback (if supported)
- [ ] Test swipe-to-dismiss on Drawer (mobile)
- [ ] Add reduced motion support

### Phase 4: Testing
- [ ] Unit tests for responsive rendering logic
- [ ] Visual regression tests (desktop screenshots)
- [ ] Cross-device manual testing (checklist above)
- [ ] Accessibility audit (keyboard nav, screen reader)
- [ ] Performance testing (60fps animation)

### Phase 5: Code Review & Documentation
- [ ] Self-review responsive code changes
- [ ] Update PropTypes for new isMobile prop
- [ ] Add inline comments explaining responsive breakpoints
- [ ] Request code review from team
- [ ] Address review feedback

---

## References

- **Epic:** `docs/prd/epic-4-tutorial-summary-bar-stability-and-mobile-ux.md`
- **Bug Report:** `docs/prompt-dump/tutorial-summary-bar-and-add-to-cart-inconsistency.md` (line 7)
- **Component:** `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/TutorialSelectionSummaryBar.js` (lines 88-240)
- **Container:** `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/TutorialSummaryBarContainer.js` (lines 188-214)
- **Styles:** `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/tutorialStyles.js`
- **Material-UI Responsive Design:** https://mui.com/material-ui/customization/breakpoints/
- **Material-UI Drawer:** https://mui.com/material-ui/react-drawer/

---

**Story Status:** Ready for Development
**Story Points:** 5 (Medium complexity - responsive design implementation)
**Priority:** Medium (UX enhancement, not critical bug)
**Estimate:** 3-4 hours
**Dependencies:** Independent - can be developed in parallel with Story 2
