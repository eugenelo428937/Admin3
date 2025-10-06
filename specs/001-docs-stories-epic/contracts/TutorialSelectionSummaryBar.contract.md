# Component Contract: TutorialSelectionSummaryBar

**Component**: TutorialSelectionSummaryBar
**Type**: Container (New)
**Story**: 2.3 - Implement TutorialSelectionSummaryBar & UI Polish

## Props Contract

```typescript
interface TutorialSelectionSummaryBarProps {
  subjectCode: string;
  onEdit: () => void;
  onAddToCart: () => void;
  onRemove: () => void;
}
```

## Rendering Contract

**MUST use**:
- Material-UI Snackbar component
- `anchorOrigin={{vertical: 'bottom', horizontal: 'center'}}`
- `open` prop controlled by parent based on choice existence

**Expanded State** (when `getDraftChoices(subjectCode).length > 0`):
- Subject title: "{subjectName} Tutorials"
- Ordered list of choices (1st, 2nd, 3rd):
  - "1. 1st Choice - {location} ({eventCode})"
  - "2. 2nd Choice - {location} ({eventCode})"
  - "3. 3rd Choice - {location} ({eventCode})"
- Action buttons: [Edit] [Add to Cart] [Remove]
- Close button (X icon)

**Collapsed State** (when all choices carted: `hasCartedChoices(subjectCode) && getDraftChoices(subjectCode).length === 0`):
- Subject title: "{subjectName} Tutorials"
- Action buttons: [Edit] [X]
- No choice details visible

## State Management Contract

**Expansion Logic**:
```javascript
const hasDraft = getDraftChoices(subjectCode).length > 0;
const hasCarted = hasCartedChoices(subjectCode);
const expanded = hasDraft || !hasCarted;
```

**Visibility Logic**:
```javascript
const visible = getSubjectChoices(subjectCode).length > 0;
```

## Interaction Contract

**Edit Button**:
- Calls `onEdit()`
- Parent opens TutorialSelectionDialog

**Add to Cart Button**:
- Enabled when: `getDraftChoices(subjectCode).length > 0`
- Calls `onAddToCart()`
- Parent calls `markChoicesAsAdded(subjectCode)` + `CartContext.addToCart()`
- Summary bar transitions to collapsed state after successful add

**Remove Button**:
- Always enabled when summary bar visible
- Calls `onRemove()`
- Parent calls `removeSubjectChoices(subjectCode)`
- Summary bar disappears

**Close Button (X)**:
- Only hides summary bar temporarily
- Choices remain in context (isDraft state preserved)
- Summary bar reappears on page refresh if choices exist

## Accessibility Contract

- Snackbar MUST have `role="alert"` for screen readers
- Action buttons MUST have descriptive `aria-label` attributes
- Keyboard navigation MUST work (Tab to buttons, Enter to activate)

## Test Contract

**Unit Tests** (TDD RED phase):
1. Renders expanded with draft choices
2. Displays ordered list of choices with location and event code
3. Renders action buttons (Edit, Add to Cart, Remove)
4. Collapses when all choices carted (isDraft: false)
5. Hides when no choices exist
6. Calls onEdit when Edit button clicked
7. Calls onAddToCart when Add to Cart button clicked
8. Calls onRemove when Remove button clicked
9. "Add to Cart" button disabled when no draft choices

**Integration Tests**:
1. Summary bar expands when choice selected in dialog
2. Summary bar collapses after Add to Cart
3. Summary bar disappears after Remove
4. Edit button opens dialog with pre-selected choices

**Test File**: `__tests__/TutorialSelectionSummaryBar.test.js`

## Dependencies

**Material-UI Components**:
- Snackbar, SnackbarContent
- Button
- IconButton
- CloseIcon
- Typography
- Box (for layout)

**Context Dependencies**:
- TutorialChoiceContext (useTutorialChoice hook)

## Styling Requirements

- Background: Semi-transparent dark background (MUI default)
- Text: White for visibility on dark background
- Max width: 600px on desktop
- Full width on mobile (<600px)
- Padding: 16px
- Button spacing: 8px gap

## Performance Requirements

- Expand/collapse animation: <150ms
- Re-render on context updates: <16ms
- No flicker during state transitions

---

**Contract Status**: Defined
**Implementation Status**: Not started (TDD RED phase pending)
