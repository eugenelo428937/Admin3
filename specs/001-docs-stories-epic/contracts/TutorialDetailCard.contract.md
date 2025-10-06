# Component Contract: TutorialDetailCard

**Component**: TutorialDetailCard
**Type**: Presentational (Controlled)
**Story**: 2.1 - Extract TutorialDetailCard

## Props Contract

```typescript
interface TutorialDetailCardProps {
  event: {
    eventId: number;
    eventTitle: string;
    eventCode: string;
    location: string;
    venue: string;
    startDate: string; // ISO8601
    endDate: string;   // ISO8601
  };
  variation: {
    variationId: number;
    variationName: string;
    prices: Array<{price_type: string; amount: number}>;
  };
  selectedChoiceLevel: "1st" | "2nd" | "3rd" | null;
  onSelectChoice: (choiceLevel: "1st" | "2nd" | "3rd", eventData: object) => void;
  subjectCode: string;
}
```

## Rendering Contract

**MUST display**:
- Event title (eventTitle)
- Event code (eventCode)
- Location (location)
- Venue (venue)
- Start and end dates (startDate, endDate)

**MUST render**:
- Three choice buttons labeled "1st", "2nd", "3rd"
- Buttons in horizontal layout or vertical stack (responsive)

**Button Styling Contract**:
- Unselected buttons: `variant="outlined"` with default color
- Selected button (matches selectedChoiceLevel): `variant="contained"` with primary color
- All buttons maintain consistent sizing

**Interaction Contract**:
- Clicking any choice button MUST call `onSelectChoice(choiceLevel, eventData)`
- eventData MUST include all event fields + variation data

**Layout Contract**:
- Card maintains fixed dimensions for grid alignment
- Responsive padding and spacing
- Event info visually separated from choice buttons

## Accessibility Contract

- Buttons MUST have `aria-pressed` attribute indicating selection state
- Card MUST have semantic HTML structure (h3 for title, section for details)
- Focus indicators MUST be visible on keyboard navigation

## Test Contract

**Unit Tests** (TDD RED phase):
1. Renders event title, code, location, venue, dates correctly
2. Renders 3 choice buttons with correct labels
3. Applies "outlined" variant to unselected buttons
4. Applies "contained" variant to selectedChoiceLevel button
5. Calls onSelectChoice with correct parameters when button clicked
6. Handles null selectedChoiceLevel (all buttons outlined)

**Test File**: `__tests__/TutorialDetailCard.test.js`

## Dependencies

**Material-UI Components**:
- Card, CardContent, CardActions
- Typography
- Button
- Grid (optional for internal layout)

**No context dependencies** (controlled component, state from props)

## Performance Requirements

- Render time: <16ms (60fps)
- Use React.memo() for optimization (prevents unnecessary re-renders in grid)

---

**Contract Status**: Defined
**Implementation Status**: Not started (TDD RED phase pending)
