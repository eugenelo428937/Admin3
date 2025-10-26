# Tutorial Product Card Speed Dial Enhancement - Brownfield Story

## Story Title
Tutorial Product Card Speed Dial UI Enhancement - Brownfield Addition

## User Story
As a **customer browsing tutorial products**,
I want **a more streamlined interface using a Speed Dial button instead of separate action buttons**,
So that **I can access tutorial actions (Add to Cart, Select Tutorial, View Selections) in a cleaner, more modern interface**.

## Story Context

### Existing System Integration
- **Integrates with**: TutorialProductCard component (`frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/TutorialProductCard.js`)
- **Technology**: React 18, Material-UI 5, functional components with hooks
- **Follows pattern**: EnhancedTutorialProductCard style guide reference (`frontend/react-Admin3/src/components/styleguide/ProductCards/EnhancedTutorialProductCard.js`)
- **Touch points**:
  - TutorialChoiceContext for state management
  - TutorialChoiceDialog component
  - TutorialChoicePanel component
  - Material-UI SpeedDial component

## Acceptance Criteria

### Functional Requirements

1. **Remove existing action buttons from card body**
   - Remove the "Select Tutorial" button (lines 320-327 in TutorialProductCard.js)
   - Remove the "View Selection" button (lines 328-339 in TutorialProductCard.js)
   - Remove the containing Box wrapper (lines 312-341 in TutorialProductCard.js)

2. **Add MUI SpeedDial component**
   - Position SpeedDial at same location as current "Add to Cart" button (bottom-right of CardActions)
   - Use "+" icon as the primary action button
   - SpeedDial opens upward (`direction="up"`)

3. **SpeedDial interaction behavior**
   - Click on "+" icon opens SpeedDial with 3 actions
   - "+" icon rotates 45 degrees to become "×" close button when open
   - SpeedDial remains expanded until:
     - User clicks the close button ("×"), OR
     - User clicks outside the SpeedDial area

4. **SpeedDialAction items configuration**
   - **Action 1**: "Add to Cart" with cart-plus icon (`<AddShoppingCart />`)
   - **Action 2**: "Select Tutorial" with calendar icon (`<CalendarMonthOutlined />`)
   - **Action 3**: "View selections" with view/list icon (suggest: `<ViewModule />` or `<ListAlt />`)

5. **Conditional visibility for SpeedDial actions**
   - "Add to Cart" action: Hidden if `hasChoices === false` (no selected tutorials)
   - "View selections" action: Hidden if `hasChoices === false` (no selected tutorials)
   - "Select Tutorial" action: Always visible

6. **Action event handlers**
   - "Select Tutorial" click → Opens TutorialChoiceDialog (`setShowChoiceDialog(true)`)
   - "View selections" click → Opens TutorialChoicePanel (`showChoicePanelForSubject(subjectCode)`)
   - "Add to Cart" click → Triggers add to cart logic (to be implemented if not existing)

### Integration Requirements

7. Existing TutorialChoiceDialog functionality continues to work unchanged
8. Existing TutorialChoicePanel functionality continues to work unchanged
9. New SpeedDial follows existing EnhancedTutorialProductCard pattern
10. Integration with TutorialChoiceContext maintains current behavior

### Quality Requirements

11. Changes are covered by appropriate tests (update existing tests or add new ones)
12. Component follows Material-UI SpeedDial API best practices
13. No regression in existing tutorial product card functionality verified
14. Accessible keyboard navigation for SpeedDial actions
15. Responsive behavior maintained on mobile and desktop

## Technical Notes

### Integration Approach
- Reference the EnhancedTutorialProductCard implementation (lines 331-427) for SpeedDial structure
- Use the same MUI components: `SpeedDial`, `SpeedDialAction`, `SpeedDialIcon`
- Maintain existing state management hooks from TutorialChoiceContext
- Add backdrop overlay when SpeedDial is open (lines 415-427 in EnhancedTutorialProductCard)

### Existing Pattern Reference
The EnhancedTutorialProductCard already implements this pattern successfully:
- SpeedDial with 3 actions (Add to Cart, Select Tutorial, View Selection)
- Proper positioning in CardActions section
- Backdrop overlay for better UX
- Event handlers for each action

### Key Implementation Details
```javascript
// Import required MUI components
import SpeedDial from "@mui/material/SpeedDial";
import SpeedDialAction from "@mui/material/SpeedDialAction";
import SpeedDialIcon from "@mui/material/SpeedDialIcon";

// State management
const [speedDialOpen, setSpeedDialOpen] = useState(false);

// Speed dial actions configuration
const actions = [
  { icon: <AddShoppingCart />, name: "Add to Cart", show: hasChoices },
  { icon: <CalendarMonthOutlined />, name: "Select Tutorial", show: true },
  { icon: <ViewModule />, name: "View selections", show: hasChoices },
];
```

### Key Constraints
- Must maintain existing functionality of TutorialChoiceDialog and TutorialChoicePanel
- Must follow Material-UI component patterns and accessibility standards
- Must work with existing TutorialChoiceContext state management
- SpeedDial must be positioned in the existing CardActions area where the "Add to Cart" button currently resides

## Definition of Done

- [x] Card body action buttons removed (Select Tutorial, View Selection)
- [x] SpeedDial component added at Add to Cart button position
- [x] SpeedDial opens with 3 actions (Add to Cart, Select Tutorial, View selections)
- [x] "+" icon rotates 45° to "×" when open
- [x] SpeedDial closes on outside click or close button click
- [x] Conditional visibility implemented for Add to Cart and View selections
- [x] Event handlers properly wired to TutorialChoiceDialog and TutorialChoicePanel
- [x] Existing functionality regression tested
- [x] Code follows existing patterns from EnhancedTutorialProductCard
- [x] Tests pass (existing and new)
- [x] Responsive behavior verified on mobile and desktop
- [x] Accessibility verified (keyboard navigation, screen readers)

## Risk and Compatibility Check

### Minimal Risk Assessment

**Primary Risk**: Breaking existing tutorial selection workflow or cart functionality
**Mitigation**:
- Follow the proven EnhancedTutorialProductCard pattern exactly
- Maintain all existing state management and event handlers
- Test all user flows: Select Tutorial → View Selections → Add to Cart

**Rollback**:
- Git revert commit if issues arise
- Simple rollback since changes are isolated to TutorialProductCard component

### Compatibility Verification

- [x] No breaking changes to existing APIs
- [x] No database changes required
- [x] UI changes follow existing design patterns (EnhancedTutorialProductCard reference)
- [x] Performance impact is negligible (SpeedDial is a lightweight MUI component)
- [x] No changes to TutorialChoiceContext required
- [x] No changes to TutorialChoiceDialog or TutorialChoicePanel required

## Related Components

### Files to Modify
- `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/TutorialProductCard.js`

### Reference Files (Read-only)
- `frontend/react-Admin3/src/components/styleguide/ProductCards/EnhancedTutorialProductCard.js` (implementation pattern)
- `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/TutorialChoiceDialog.js` (integration)
- `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/TutorialChoicePanel.js` (integration)
- `frontend/react-Admin3/src/contexts/TutorialChoiceContext.js` (state management)

## Validation Checklist

### Scope Validation
- [x] Story can be completed in one development session (estimated 2-3 hours)
- [x] Integration approach is straightforward (follow existing pattern)
- [x] Follows existing patterns exactly (EnhancedTutorialProductCard)
- [x] No design or architecture work required

### Clarity Check
- [x] Story requirements are unambiguous
- [x] Integration points are clearly specified (TutorialChoiceDialog, TutorialChoicePanel)
- [x] Success criteria are testable
- [x] Rollback approach is simple (git revert)

## Success Criteria

The story is successfully completed when:

1. TutorialProductCard uses SpeedDial instead of separate action buttons
2. All 3 actions work correctly (Add to Cart, Select Tutorial, View selections)
3. Conditional visibility works as specified
4. SpeedDial interaction matches EnhancedTutorialProductCard behavior
5. Existing tutorial selection workflow remains unchanged
6. All tests pass
7. No regressions in existing functionality
8. Responsive and accessible implementation verified
