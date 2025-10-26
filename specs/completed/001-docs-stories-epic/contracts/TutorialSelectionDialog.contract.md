# Component Contract: TutorialSelectionDialog

**Component**: TutorialSelectionDialog
**Type**: Container (Refactored from TutorialChoiceDialog)
**Story**: 2.2 - Refactor TutorialSelectionDialog

## Props Contract

```typescript
interface TutorialSelectionDialogProps {
  open: boolean;
  onClose: () => void;
  product: {
    productId: number;
    subjectCode: string;
    subjectName: string;
    location: string;
  };
  events: Array<TutorialEvent>;
}
```

## Rendering Contract

**MUST use**:
- Material-UI Dialog component
- `fullWidth` prop
- `maxWidth="lg"` for responsive sizing

**MUST render**:
- Dialog title: "{subjectName} Tutorials - {location}"
- Grid container with responsive breakpoints
- TutorialDetailCard for each event in events array

**Grid Breakpoints** (CRITICAL):
- Large screens (lg, ≥1280px): 3 columns → `lg={4}`
- Medium screens (md, 960-1280px): 2 columns → `md={6}`
- Small screens (xs/sm, <960px): 1 column → `xs={12}`

**Context Integration**:
- MUST read current draft choices from TutorialChoiceContext
- MUST pre-select TutorialDetailCards based on existing selections
- MUST call `addTutorialChoice()` when selection changes
- MUST trigger TutorialSelectionSummaryBar visibility when choices exist

**Close Behavior**:
- Close button in dialog header
- Clicking backdrop closes dialog (default MUI behavior)
- Pressing Escape closes dialog

## Interaction Contract

**Choice Selection Flow**:
1. User clicks choice button on TutorialDetailCard
2. Dialog calls `addTutorialChoice(subjectCode, choiceLevel, eventData)`
3. Context updates localStorage (isDraft: true)
4. Dialog re-renders with updated selectedChoiceLevel
5. TutorialSelectionSummaryBar becomes visible (parent manages visibility)

**Dialog remains open** during selection (user can select multiple choices before closing)

## Accessibility Contract

- Dialog MUST have `role="dialog"`
- Dialog MUST have `aria-labelledby` pointing to title element
- Focus MUST trap within dialog when open
- First focusable element receives focus on open
- Focus returns to trigger element on close

## Test Contract

**Unit Tests** (TDD RED phase):
1. Renders dialog with correct title
2. Renders Grid with correct breakpoint props
3. Renders TutorialDetailCard for each event
4. Integrates with TutorialChoiceContext (reads draft choices)
5. Pre-selects cards based on existing draft choices
6. Calls addTutorialChoice when card selection changes
7. Calls onClose when close button clicked
8. Responsive grid layout verified for lg/md/sm breakpoints

**Integration Tests**:
1. Dialog → Context → SummaryBar workflow
2. Multiple selection updates context correctly

**Test File**: `__tests__/TutorialSelectionDialog.test.js`

## Dependencies

**Material-UI Components**:
- Dialog, DialogTitle, DialogContent, DialogActions
- Grid
- IconButton (for close button)
- CloseIcon

**Context Dependencies**:
- TutorialChoiceContext (useTutorialChoice hook)

**Child Components**:
- TutorialDetailCard

## Migration Notes

**Replaces**: TutorialChoiceDialog
**Archive**: TutorialChoiceDialog.js → TutorialChoiceDialog.js.legacy
**Import Updates**: All components importing TutorialChoiceDialog must update to TutorialSelectionDialog

## Performance Requirements

- Dialog open animation: <200ms
- Grid re-layout on resize: <100ms
- No layout shift during loading

---

**Contract Status**: Defined
**Implementation Status**: Not started (TDD RED phase pending)
