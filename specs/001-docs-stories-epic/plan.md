# Implementation Plan: Tutorial Selection UX Refactoring

**Branch**: `001-docs-stories-epic` | **Date**: 2025-10-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-docs-stories-epic/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path → ✅ DONE
2. Fill Technical Context → ✅ DONE
   → Project Type: web (frontend+backend)
   → Structure Decision: Option 2 (Web application)
3. Fill Constitution Check → ✅ DONE (Template constitution - no specific violations)
4. Evaluate Constitution Check → ✅ PASS (No violations)
   → Update Progress Tracking: Initial Constitution Check ✅
5. Execute Phase 0 → research.md ✅ DONE
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md ✅ DONE
7. Re-evaluate Constitution Check → ✅ PASS (No new violations)
   → Update Progress Tracking: Post-Design Constitution Check ✅
8. Plan Phase 2 → Task generation approach described ✅ DONE
9. STOP - Ready for /tasks command ✅
```

**IMPORTANT**: The /plan command STOPS at step 9. Phase 2 is executed by /tasks command.

## Summary

**Feature**: Tutorial Selection UX Refactoring (Epic 2)

**Primary Requirement**: Refactor tutorial selection components to improve user experience through:
- Clear component separation (SOLID principles)
- Responsive layouts (mobile, tablet, desktop)
- Intuitive visual feedback for choice selection
- Persistent summary bar showing selected choices
- Working price information display
- Consistent SpeedDial behavior

**Technical Approach**:
- Extract `TutorialDetailCard` as standalone React component
- Rename `TutorialChoiceDialog` → `TutorialSelectionDialog` with responsive grid
- Create `TutorialSelectionSummaryBar` using Material-UI Snackbar
- Leverage Epic 1's `isDraft` state management (completed)
- Follow Material-UI patterns for consistency
- Maintain backward compatibility with existing functionality

## Technical Context

**Language/Version**: JavaScript ES6+ with React 18.2
**Primary Dependencies**:
- React 18 (functional components with hooks)
- Material-UI v5 (Dialog, Snackbar, SpeedDial, Grid, Button components)
- React Context API (TutorialChoiceContext from Epic 1)
- React Testing Library + Jest for component tests

**Storage**: Browser localStorage (via TutorialChoiceContext - Epic 1 implementation)
**Testing**:
- Frontend: Jest + React Testing Library
- Test commands: `npm test` (watch), `npm test -- --coverage --watchAll=false` (coverage)
- Target: 80%+ coverage per TDD enforcement

**Target Platform**: Web browsers (desktop, tablet, mobile)
**Project Type**: web (frontend React + backend Django)
**Performance Goals**:
- Component render < 16ms (60fps)
- Layout shift < 0.1 CLS
- SpeedDial response < 100ms
- Dialog open < 200ms

**Constraints**:
- Frontend-only changes (no backend modifications)
- Maintain Epic 1 state management compatibility
- No breaking changes to TutorialChoiceContext API
- Follow existing Material-UI theme patterns

**Scale/Scope**:
- 3 new React components (TutorialDetailCard, TutorialSelectionDialog refactored, TutorialSelectionSummaryBar)
- ~800-1200 LOC estimated
- 30+ component tests (unit + integration)
- Responsive breakpoints: lg (>1280px), md (960-1280px), sm (<960px)

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Status**: ✅ PASS

**Constitution Analysis** (based on template constitution):

1. **Library-First Principle**: Not applicable - refactoring existing UI components
2. **CLI Interface**: Not applicable - web UI components
3. **Test-First (NON-NEGOTIABLE)**: ✅ ENFORCED
   - TDD mandatory via CLAUDE.md and tdd-guard.config.js
   - RED-GREEN-REFACTOR cycle required
   - 80% minimum test coverage
   - TodoWrite integration for TDD phase tracking

4. **Integration Testing**: ✅ APPLICABLE
   - Component integration tests required
   - Cross-component interaction testing (Dialog ↔ SummaryBar ↔ Context)
   - Responsive behavior testing across breakpoints

5. **Observability**: ✅ APPLICABLE
   - Console logging for debugging
   - React DevTools profiling for performance
   - Visual regression testing recommended

**No violations detected**. Frontend-only UX refactoring aligns with constitutional requirements.

## Project Structure

### Documentation (this feature)
```
specs/001-docs-stories-epic/
├── plan.md              # This file (/plan command output)
├── spec.md              # Feature specification (already exists)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
│   ├── TutorialDetailCard.contract.md
│   ├── TutorialSelectionDialog.contract.md
│   └── TutorialSelectionSummaryBar.contract.md
└── tasks.md             # Phase 2 output (/tasks command - NOT created yet)
```

### Source Code (repository root)
```
# Option 2: Web application (frontend + backend)
backend/django_Admin3/
└── (No changes - frontend-only feature)

frontend/react-Admin3/
├── src/
│   ├── components/
│   │   └── Product/
│   │       └── ProductCard/
│   │           └── Tutorial/
│   │               ├── TutorialDetailCard.js (NEW)
│   │               ├── TutorialSelectionDialog.js (REFACTORED)
│   │               ├── TutorialSelectionSummaryBar.js (NEW)
│   │               ├── TutorialProductCard.js (MODIFIED)
│   │               ├── TutorialChoiceDialog.js.legacy (ARCHIVED)
│   │               └── TutorialChoicePanel.js.legacy (ARCHIVED)
│   ├── contexts/
│   │   └── TutorialChoiceContext.js (EXISTING - Epic 1)
│   └── utils/
│       └── tutorialMetadataBuilder.js (EXISTING - Epic 1)
└── tests/
    └── components/
        └── Product/
            └── ProductCard/
                └── Tutorial/
                    ├── __tests__/
                    │   ├── TutorialDetailCard.test.js (NEW)
                    │   ├── TutorialSelectionDialog.test.js (NEW)
                    │   ├── TutorialSelectionSummaryBar.test.js (NEW)
                    │   └── TutorialProductCard.test.js (EXISTING - may need updates)
```

**Structure Decision**: Option 2 (Web application with frontend/backend separation)

## Phase 0: Outline & Research

**Status**: ✅ COMPLETE

### Research Areas Completed

1. **Material-UI Component APIs**
   - **Decision**: Use MUI v5 Dialog, Snackbar, Grid, SpeedDial
   - **Rationale**: Existing project dependency, consistent with MaterialProductCard patterns
   - **Alternatives considered**: Custom components (rejected - reinventing wheel, inconsistent styling)

2. **Responsive Grid Layout Strategy**
   - **Decision**: Material-UI Grid with breakpoint-specific column counts
   - **Rationale**: Built-in responsive behavior, theme integration, tested across browsers
   - **Alternatives considered**: CSS Grid (rejected - less integration with MUI theme), Flexbox (rejected - more verbose for multi-column layouts)

3. **Visual Feedback Patterns**
   - **Decision**: Button variant switching (outlined → contained) for selection state
   - **Rationale**: Material Design standard, clear visual distinction, accessible
   - **Alternatives considered**: Color changes only (rejected - insufficient contrast), Icons only (rejected - not immediate enough)

4. **Epic 1 Integration Points**
   - **Decision**: Use existing TutorialChoiceContext methods without modification
   - **Rationale**: Epic 1 complete and tested (48 tests passing), well-defined API
   - **Alternatives considered**: Extend context (rejected - unnecessary, violates Epic 1 completion)

5. **Testing Strategy**
   - **Decision**: React Testing Library for component tests, Jest for assertions
   - **Rationale**: Project standard, user-centric testing approach, excellent async support
   - **Alternatives considered**: Enzyme (rejected - deprecated), Cypress component testing (rejected - overkill for unit tests)

**Output**: `research.md` generated with all decisions documented

## Phase 1: Design & Contracts

**Status**: ✅ COMPLETE

### 1. Data Model (`data-model.md`)

**UI Component Entities** (not database entities):

**TutorialDetailCard Component**
- **Props**:
  - `event` (object): Tutorial event data (title, code, location, venue, dates)
  - `variation` (object): Product variation with pricing data
  - `selectedChoiceLevel` (string|null): Current selection ("1st", "2nd", "3rd", or null)
  - `onSelectChoice` (function): Handler for choice selection
  - `subjectCode` (string): Subject identifier for context
- **State**: None (controlled component)
- **Relationships**: Child of TutorialSelectionDialog

**TutorialSelectionDialog Component**
- **Props**:
  - `open` (boolean): Dialog visibility
  - `onClose` (function): Close handler
  - `product` (object): Tutorial product data
  - `events` (array): Tutorial event list
  - `subjectCode` (string): Subject identifier
- **State**: Draft choices from TutorialChoiceContext
- **Relationships**: Parent of TutorialDetailCard(s), triggers TutorialSelectionSummaryBar

**TutorialSelectionSummaryBar Component**
- **Props**:
  - `subjectCode` (string): Subject to display summary for
  - `onEdit` (function): Edit button handler
  - `onAddToCart` (function): Add to cart handler
  - `onRemove` (function): Remove choices handler
- **State**: Choices from TutorialChoiceContext, expanded/collapsed state
- **Relationships**: Reads from TutorialChoiceContext, triggers TutorialProductCard actions

### 2. API Contracts (`/contracts/`)

**Frontend Component Contracts** (not REST APIs):

**TutorialDetailCard.contract.md**:
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

// Rendering contract
- MUST display event title, code, location, venue, dates
- MUST render 3 choice buttons ("1st", "2nd", "3rd")
- MUST apply outlined variant to unselected buttons
- MUST apply contained variant to selectedChoiceLevel button
- MUST call onSelectChoice when button clicked
- MUST maintain fixed dimensions for grid alignment
```

**TutorialSelectionDialog.contract.md**:
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

// Rendering contract
- MUST use Material-UI Dialog component
- MUST render TutorialDetailCard for each event in events array
- MUST use Grid with responsive breakpoints (lg=3, md=2, sm=1)
- MUST integrate with TutorialChoiceContext for draft choices
- MUST pre-select cards based on existing draft choices
- MUST update context when choices change
```

**TutorialSelectionSummaryBar.contract.md**:
```typescript
interface TutorialSelectionSummaryBarProps {
  subjectCode: string;
  onEdit: () => void;
  onAddToCart: () => void;
  onRemove: () => void;
}

// Rendering contract
- MUST use Material-UI Snackbar component
- MUST display subject title
- MUST show ordered list of choices (1st, 2nd, 3rd) when expanded
- MUST show choice location and event code for each
- MUST render Edit, Add to Cart, Remove buttons
- MUST expand when subject has draft choices (isDraft: true)
- MUST collapse to single line when all choices carted (isDraft: false)
```

### 3. Contract Tests (failing)

**Generated Test Files**:
- `/frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/__tests__/TutorialDetailCard.test.js`
- `/frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/__tests__/TutorialSelectionDialog.test.js`
- `/frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/__tests__/TutorialSelectionSummaryBar.test.js`

**Test Status**: All tests FAILING (no implementation exists yet) - as expected in TDD RED phase

### 4. Quickstart Test Scenarios (`quickstart.md`)

**Story 2.1 Validation**: Extract TutorialDetailCard
1. Import TutorialDetailCard component
2. Render with mock event data
3. Verify event information displays correctly
4. Click "1st Choice" button → verify button style changes to contained
5. Verify onSelectChoice callback received correct parameters

**Story 2.2 Validation**: Refactor TutorialSelectionDialog
1. Open TutorialSelectionDialog with tutorial events
2. Verify responsive grid: desktop (3 cols), tablet (2 cols), mobile (1 col)
3. Select multiple tutorial choices → verify context updates
4. Verify TutorialSelectionSummaryBar becomes visible

**Story 2.3 Validation**: Implement TutorialSelectionSummaryBar & UI Polish
1. Select draft choices → verify summary bar expands with ordered list
2. Click "Add to Cart" → verify cart updated, summary bar collapses
3. Hover SpeedDial → verify expansion, click action → verify collapse
4. Click "Price Info" → verify modal displays variation pricing table
5. Test mobile responsiveness across all components

### 5. Agent Context Update (`CLAUDE.md`)

**IMPORTANT**: Agent context file update will preserve existing content and add only NEW tech information from this plan. The update is incremental, not a replacement.

**Output**: Updated `CLAUDE.md` in repository root (preserves manual additions, updates recent changes)

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:

1. **Load Base Template**:
   - Use `.specify/templates/tasks-template.md` as structure
   - Populate with Epic 2 context (3 stories: 2.1, 2.2, 2.3)

2. **Generate TDD Task Sequence** (per story):

   **Story 2.1: Extract TutorialDetailCard**
   - [ ] [RED] Write failing test for TutorialDetailCard rendering
   - [ ] [RED] Write failing test for choice button style variants
   - [ ] [RED] Write failing test for onSelectChoice callback
   - [ ] [GREEN] Implement TutorialDetailCard component (minimal)
   - [ ] [GREEN] Implement choice selection logic
   - [ ] [REFACTOR] Extract common styling, optimize rendering
   - [ ] [VERIFY] Run tests, verify 80%+ coverage

   **Story 2.2: Refactor TutorialSelectionDialog**
   - [ ] [RED] Write failing test for responsive grid layout
   - [ ] [RED] Write failing test for TutorialDetailCard integration
   - [ ] [RED] Write failing test for context integration
   - [ ] [GREEN] Refactor dialog with TutorialDetailCard components
   - [ ] [GREEN] Implement responsive Grid breakpoints
   - [ ] [GREEN] Integrate with TutorialChoiceContext
   - [ ] [REFACTOR] Update import references across codebase
   - [ ] [REFACTOR] Archive legacy TutorialChoiceDialog.js
   - [ ] [VERIFY] Run tests, verify 80%+ coverage

   **Story 2.3: Implement TutorialSelectionSummaryBar & UI Polish**
   - [ ] [RED] Write failing test for summary bar rendering
   - [ ] [RED] Write failing test for expand/collapse behavior
   - [ ] [RED] Write failing test for action buttons
   - [ ] [RED] Write failing test for SpeedDial behavior
   - [ ] [RED] Write failing test for price info display
   - [ ] [GREEN] Implement TutorialSelectionSummaryBar component
   - [ ] [GREEN] Implement expand/collapse logic based on isDraft
   - [ ] [GREEN] Fix SpeedDial hover/click behavior
   - [ ] [GREEN] Implement working price info button
   - [ ] [REFACTOR] Optimize mobile responsiveness
   - [ ] [REFACTOR] Extract common patterns
   - [ ] [VERIFY] Run full test suite, verify 80%+ coverage
   - [ ] [VERIFY] Perform visual regression testing

3. **Ordering Strategy**:
   - **Sequential by Story**: 2.1 → 2.2 → 2.3 (dependencies)
   - **TDD Order within Story**: Tests before implementation
   - **Parallel Markers**: Independent test files can be [P]
   - **Integration Tests**: After unit tests within each story

4. **Task Metadata**:
   - Tag each task with story (2.1, 2.2, 2.3)
   - Tag with TDD phase (RED, GREEN, REFACTOR, VERIFY)
   - Estimate time (S=<2h, M=2-4h, L=4-8h)
   - Mark test tasks as [P] for parallel execution

**Estimated Output**: 35-40 numbered tasks in tasks.md with clear TDD workflow

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following TDD RED-GREEN-REFACTOR)
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation, visual regression testing)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

**No violations detected**. Table remains empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| -         | -          | -                                   |

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved (spec was complete)
- [x] Complexity deviations documented (none exist)

---
*Based on Constitution v2.1.1 (template) - See `.specify/memory/constitution.md`*
*Epic 2 depends on Epic 1 (Complete ✅ 2025-10-05)*
