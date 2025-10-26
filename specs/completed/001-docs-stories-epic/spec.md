# Feature Specification: Tutorial Selection UX Refactoring

**Feature Branch**: `001-docs-stories-epic`
**Created**: 2025-10-05
**Status**: Draft
**Input**: User description: "@docs/stories/epic-tutorial-ux-refactor/EPIC-2-Tutorial-Selection-UX-Refactoring.md"

## Execution Flow (main)
```
1. Parse user description from Input → ✅ Parsed from Epic 2 documentation
2. Extract key concepts from description → ✅ Identified: component refactoring, SOLID principles, responsive design, visual feedback
3. For each unclear aspect → ✅ All aspects clearly defined in epic documentation
4. Fill User Scenarios & Testing section → ✅ Completed
5. Generate Functional Requirements → ✅ All requirements testable
6. Identify Key Entities (if data involved) → ✅ UI Component entities identified
7. Run Review Checklist → ✅ No [NEEDS CLARIFICATION] markers
8. Return: SUCCESS (spec ready for planning) → ✅ READY
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

---

## User Scenarios & Testing

### Primary User Story
**Problem:** When students select tutorial courses, the current interface has several UX issues that make the selection process confusing and difficult, especially on mobile devices:
1. Tutorial event details and selection controls are mixed together, making cards cluttered
2. Choice selection feedback is unclear - students can't easily see which choices they've selected
3. Summary of selected choices is not visible while browsing, requiring students to remember their selections
4. Price information button doesn't work, leaving students unable to see pricing details
5. Layout doesn't adapt well to mobile and tablet screens
6. SpeedDial button behavior is inconsistent and confusing

**Solution:** Refactor the tutorial selection interface to improve usability through clear component separation, intuitive visual feedback, responsive layouts, and a persistent summary bar that shows all selected choices.

**User Journey:**
1. Student navigates to tutorials page and sees tutorial products displayed in cards
2. Student hovers over a tutorial card and sees SpeedDial expand with "Select Tutorial" and "Price Info" options
3. Student clicks "Select Tutorial" and sees a dialog with tutorial events displayed in a responsive grid (3 columns on desktop, 2 on tablet, 1 on mobile)
4. Each tutorial event is shown in a clean detail card with event information clearly separated from selection buttons
5. Student clicks "1st Choice" button on a tutorial event - button changes appearance to show it's selected (filled/contained style)
6. A summary bar appears at the bottom showing "CS2 Tutorials: 1st Choice - Bristol (TUT-CS2-BRI-001)"
7. Student continues browsing and selects a 2nd choice - summary bar updates to show both choices
8. Student can click "Edit" in summary bar to modify choices, "Add to Cart" to proceed, or "Remove" to clear selections
9. After adding to cart, summary bar collapses to a single line showing "CS2 Tutorials [Edit]"
10. Student clicks "Price Info" on any tutorial card and sees variation-specific pricing table in a modal

### Acceptance Scenarios

**Scenario 1: Tutorial detail card displays event information clearly**
- **Given** student opens tutorial selection dialog
- **When** student views tutorial event cards
- **Then** each card shows event title, code, location, dates, and venue in a consistent layout
- **And** selection buttons (1st/2nd/3rd) are visually separated from event details
- **And** cards maintain fixed dimensions for consistent grid alignment

**Scenario 2: Choice selection provides clear visual feedback**
- **Given** student is viewing tutorial events in selection dialog
- **When** student clicks "1st Choice" button on an event
- **Then** button changes from outlined style to contained (filled) style with white text
- **And** student can clearly distinguish selected from unselected choices
- **And** previously selected choice at that level (if any) changes back to outlined style

**Scenario 3: Summary bar shows selected choices while browsing**
- **Given** student has selected 1st and 2nd choices for CS2 tutorials
- **When** student is browsing tutorial events
- **Then** summary bar displays at bottom of screen showing:
  - Subject title "CS2 Tutorials"
  - Ordered list: "1. 1st Choice - Bristol (TUT-CS2-BRI-001)"
  - Ordered list: "2. 2nd Choice - London (TUT-CS2-LON-002)"
  - Action buttons: Edit, Add to Cart, Remove

**Scenario 4: Summary bar collapses after adding to cart**
- **Given** student has selected 2 tutorial choices (both draft state)
- **When** student clicks "Add to Cart" in summary bar
- **Then** choices are added to cart (isDraft: false)
- **And** summary bar collapses to single line showing "CS2 Tutorials [Edit] [X]"
- **And** expanded details are hidden until student clicks Edit

**Scenario 5: Responsive layout adapts to screen size**
- **Given** student is viewing tutorial selection dialog
- **When** student views on desktop (large screen)
- **Then** tutorial detail cards are displayed in 3-column grid
- **When** student views on tablet (medium screen)
- **Then** tutorial detail cards are displayed in 2-column grid
- **When** student views on mobile (small screen)
- **Then** tutorial detail cards are displayed in 1-column grid

**Scenario 6: Price info displays variation-specific pricing**
- **Given** student is viewing tutorial product card
- **When** student clicks "Price Info" button on SpeedDial
- **Then** modal/popover opens showing pricing table
- **And** table displays all tutorial variations with their respective prices
- **And** student can see which variation applies to each tutorial format

**Scenario 7: SpeedDial behavior is consistent and intuitive**
- **Given** student is viewing tutorial product card
- **When** student hovers mouse over SpeedDial button
- **Then** SpeedDial expands to show action buttons
- **When** student clicks an action button (Select Tutorial or Price Info)
- **Then** SpeedDial collapses and executes the action
- **When** student moves mouse away from SpeedDial
- **Then** SpeedDial collapses back to closed state

**Scenario 8: Summary bar allows editing and removal**
- **Given** student has selected tutorial choices shown in summary bar
- **When** student clicks "Edit" button in summary bar
- **Then** tutorial selection dialog opens with current choices pre-selected
- **When** student clicks "Remove" button in summary bar
- **Then** all draft choices for that subject are cleared
- **And** summary bar for that subject disappears

### Edge Cases

**Edge Case 1: Multiple subjects with different choice counts**
- What happens when student selects 3 choices for CS2 and 1 choice for CP1?
- **Expected:** Two separate summary bars display - one for CS2 (expanded showing 3 choices), one for CP1 (expanded showing 1 choice)

**Edge Case 2: Summary bar with mixed draft and carted states**
- What happens when student has 2 choices in cart (isDraft: false) and adds a 3rd draft choice?
- **Expected:** Summary bar shows all 3 choices in expanded state until all are added to cart, then collapses

**Edge Case 3: Screen size changes during selection**
- What happens when student rotates device from portrait to landscape during tutorial selection?
- **Expected:** Grid layout smoothly transitions from 1-column to 2-column (or vice versa) maintaining scroll position

**Edge Case 4: No tutorial events available for selection**
- What happens when dialog opens but no tutorial events are available?
- **Expected:** Dialog displays message "No tutorial events available at this time" with option to close

**Edge Case 5: SpeedDial with keyboard navigation**
- How does SpeedDial behave when student uses keyboard instead of mouse?
- **Expected:** Tab focuses SpeedDial button, Enter/Space expands it, arrow keys navigate actions, Escape collapses it

---

## Requirements

### Functional Requirements

**Component Separation (SOLID Principles):**
- **FR-001**: System MUST display tutorial event information in standalone detail cards with fixed dimensions
- **FR-002**: System MUST separate tutorial selection controls from event display components
- **FR-003**: System MUST provide summary display component independent of selection dialog

**Visual Feedback:**
- **FR-004**: System MUST display unselected choice buttons in outlined style
- **FR-005**: System MUST display selected choice buttons in contained style with contrasting text
- **FR-006**: System MUST provide immediate visual feedback when student selects or deselects a choice
- **FR-007**: System MUST clearly distinguish draft choices from carted choices in summary display

**Responsive Layout:**
- **FR-008**: System MUST display tutorial detail cards in 3-column grid on large screens (desktop)
- **FR-009**: System MUST display tutorial detail cards in 2-column grid on medium screens (tablet)
- **FR-010**: System MUST display tutorial detail cards in 1-column grid on small screens (mobile)
- **FR-011**: System MUST maintain card dimensions and spacing across all screen sizes

**Selection Summary:**
- **FR-012**: System MUST display persistent summary bar showing all selected tutorial choices while student is browsing
- **FR-013**: System MUST organize summary by subject with collapsible sections
- **FR-014**: System MUST display choices in ordered list format (1st, 2nd, 3rd) with location and event code
- **FR-015**: System MUST provide Edit, Add to Cart, and Remove action buttons in summary bar
- **FR-016**: System MUST collapse summary bar to single line when all choices for a subject are in cart (isDraft: false)
- **FR-017**: System MUST expand summary bar when subject has any draft choices (isDraft: true)

**Price Information:**
- **FR-018**: System MUST provide working price information button for all tutorial products
- **FR-019**: System MUST display variation-specific pricing in table format when student clicks price info
- **FR-020**: System MUST show all tutorial variations with their respective prices in price info display

**SpeedDial Behavior:**
- **FR-021**: System MUST expand SpeedDial when student hovers mouse over button
- **FR-022**: System MUST collapse SpeedDial when student moves mouse away
- **FR-023**: System MUST collapse SpeedDial after student clicks an action button
- **FR-024**: System MUST execute the selected action (Select Tutorial or Price Info) when student clicks action button

**Accessibility:**
- **FR-025**: System MUST support keyboard navigation for all tutorial selection interactions
- **FR-026**: System MUST provide ARIA labels for screen reader compatibility
- **FR-027**: System MUST maintain focus management when opening/closing dialogs and summary bars

**Data Persistence:**
- **FR-028**: System MUST maintain student's tutorial selections when navigating between dialog and summary bar
- **FR-029**: System MUST preserve draft state (isDraft: true) for selections not yet added to cart
- **FR-030**: System MUST update summary display when student modifies selections in dialog

**Backward Compatibility:**
- **FR-031**: System MUST maintain all existing tutorial selection functionality without regression
- **FR-032**: System MUST preserve integration with tutorial choice state management (isDraft flags)
- **FR-033**: System MUST maintain cart integration for adding/updating tutorial items

### Key Entities

**TutorialDetailCard (UI Component)**
- Represents a single tutorial event display card
- **Key Attributes:**
  - Event title, code, location, venue, dates
  - Selection state (which choice level is selected, if any)
  - Fixed dimensions for grid alignment
- **Relationships:**
  - Displays data from a TutorialEvent
  - Triggers selection changes in TutorialChoiceContext
  - Used within TutorialSelectionDialog

**TutorialSelectionDialog (UI Component)**
- Represents the modal dialog for browsing and selecting tutorial events
- **Key Attributes:**
  - Subject context (which subject's tutorials are being selected)
  - Current draft choices for the subject
  - Responsive grid layout configuration (columns per breakpoint)
- **Relationships:**
  - Contains multiple TutorialDetailCard components
  - Integrates with TutorialChoiceContext for state management
  - Triggers TutorialSelectionSummaryBar visibility

**TutorialSelectionSummaryBar (UI Component)**
- Represents the persistent summary of selected tutorial choices
- **Key Attributes:**
  - Subject code and title
  - Ordered list of choices (1st, 2nd, 3rd) with locations and event codes
  - Expanded/collapsed state based on isDraft flags
  - Action buttons (Edit, Add to Cart, Remove)
- **Relationships:**
  - Displays data from TutorialChoiceContext
  - One summary bar per subject with selections
  - Triggers dialog opening for editing
  - Triggers cart operations for adding/removing

**TutorialChoice (Data Entity)**
- Represents a student's tutorial selection (from Epic 1)
- **Key Attributes:**
  - Subject code, choice level (1st/2nd/3rd)
  - Event details (title, code, location, dates, venue)
  - Draft status (isDraft: boolean)
- **Relationships:**
  - Multiple choices per subject (up to 3)
  - Displayed in TutorialDetailCard (selection state)
  - Displayed in TutorialSelectionSummaryBar (summary list)

---

## Review & Acceptance Checklist

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain → **All aspects clearly defined in epic documentation**
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

---

## Execution Status

- [x] User description parsed
- [x] Key concepts extracted (component refactoring, SOLID principles, responsive design, visual feedback)
- [x] Ambiguities marked (none - all aspects clearly defined)
- [x] User scenarios defined (8 acceptance scenarios + 5 edge cases)
- [x] Requirements generated (33 functional requirements)
- [x] Entities identified (TutorialDetailCard, TutorialSelectionDialog, TutorialSelectionSummaryBar, TutorialChoice)
- [x] Review checklist passed (all criteria met)

---

## Success Metrics

**User Experience Improvements:**
- Students can clearly distinguish selected from unselected tutorial choices (100% visual clarity)
- Summary bar visibility enables students to track selections without memorizing (persistent display)
- Responsive layouts work seamlessly on all device sizes (mobile, tablet, desktop)
- Price information is accessible and displays correctly (functional price info button)
- SpeedDial behavior is consistent and predictable (hover-based expansion/collapse)

**Code Quality:**
- Components follow Single Responsibility Principle (one clear purpose per component)
- Component responsibilities are clearly bounded and documented
- No regression in existing tutorial selection functionality (all tests passing)
- Visual regression tests verify UI consistency across screen sizes

**Performance:**
- Component rendering performance matches or exceeds current implementation
- No layout shift or jank during responsive transitions
- Smooth animations and transitions for user interactions

---

## Out of Scope

**Explicitly NOT included in this feature:**
- Changes to tutorial data models or state management (Epic 1 deliverables)
- Changes to cart functionality beyond UI display (cart logic complete in Epic 1)
- Backend API modifications for tutorial events or products
- Tutorial event creation or management
- Subject catalog management
- Tutorial pricing logic changes
- Checkout process modifications
- New tutorial selection business rules (e.g., max choices per subject)
- Tutorial event scheduling or availability management
- Email notifications for tutorial selections
- Tutorial waitlist or registration features

---

## Dependencies & Assumptions

**Dependencies:**
- Epic 1 (Tutorial Cart Integration Fix) completed with isDraft state management
- TutorialChoiceContext with helper methods (markChoicesAsAdded, restoreChoicesToDraft, getDraftChoices, getCartedChoices, hasCartedChoices)
- Existing cart integration with merge logic for tutorial items
- Tutorial metadata builder utilities for consistent data structure

**Assumptions:**
- Students use devices with screen sizes ranging from mobile (320px) to desktop (1920px+)
- Tutorial events have consistent data structure (title, code, location, dates, venue)
- Maximum 3 tutorial choices per subject (business rule from Epic 1)
- Only 1st choice tutorial is charged (business rule from Epic 1)
- Summary bar displays at bottom of viewport for accessibility
- SpeedDial component is appropriate UI pattern for tutorial product actions
- Material-UI component library patterns are followed for consistency
- Existing MaterialProductCard implementation provides reference for price info display

---

## Next Steps

1. **Run `/plan`** to generate technical implementation plan from this spec
2. **Run `/tasks`** to create actionable task breakdown for Stories 2.1, 2.2, and 2.3
3. **Assign Story 2.1** (Extract TutorialDetailCard) to development team
4. **Sequential development** following story order: 2.1 → 2.2 → 2.3
5. **Comprehensive testing** including visual regression, responsive testing, and accessibility validation

---

**Spec Status**: ✅ **READY FOR PLANNING** (all requirements defined and testable)
