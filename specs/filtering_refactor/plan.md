
# Implementation Plan: Scrollable Filter Groups in FilterPanel

**Branch**: `002-in-the-frontend` | **Date**: 2025-10-28 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/002-in-the-frontend/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, `GEMINI.md` for Gemini CLI, `QWEN.md` for Qwen Code or `AGENTS.md` for opencode).
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
Add maximum height constraints and vertical scrolling to filter group option lists in the FilterPanel component to prevent long lists (especially subjects) from overwhelming the interface. Apply viewport-relative max-heights (50vh desktop, 40vh mobile) that dynamically adjust to ensure the filter panel never exceeds viewport height. Include full keyboard accessibility with auto-scroll focus and ARIA attributes for screen readers.

## Technical Context
**Language/Version**: JavaScript (React 19.1.0)
**Primary Dependencies**: Material-UI 7.1.0 (Accordion, AccordionDetails, useMediaQuery, useTheme), Redux Toolkit 2.8.2
**Storage**: N/A (UI component only, no data persistence)
**Testing**: React Testing Library 16.3.0, Jest (via react-scripts 5.0.1)
**Target Platform**: Web (Chrome, Firefox, Safari - desktop & mobile browsers)
**Project Type**: Web application (frontend/backend structure)
**Performance Goals**: 60fps scrolling, <16ms frame time for smooth animations, auto-scroll on keyboard focus
**Constraints**: Must work on desktop (≥900px) and mobile (<900px) viewports, WCAG 2.1 Level AA accessibility
**Scale/Scope**: Single component modification (FilterPanel.js), affects 5 filter groups (subjects, categories, product types, products, modes of delivery)

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### TDD Mandatory Process (from CLAUDE.md)
- [x] **RED Phase Required**: Tests written first to capture scrollable behavior, max-height constraints, keyboard focus, ARIA attributes
- [x] **GREEN Phase Required**: Minimal implementation to make tests pass (styling changes to AccordionDetails)
- [x] **REFACTOR Phase Required**: Code quality improvements while keeping tests green
- [x] **Test Coverage**: Minimum 80% coverage for component changes
- [x] **No Production Code Without Tests**: Tests must exist and fail before implementation

### Compliance Assessment
✅ **PASS** - This feature follows TDD principles:
- Component-level unit tests can be written first (test scrolling behavior, max-height application, ARIA attributes)
- Visual regression tests can validate UX (scrollbar presence, viewport adaptation)
- Accessibility tests can verify keyboard focus behavior and ARIA attributes
- No backend changes required (purely frontend UI enhancement)
- No new dependencies or architectural complexity introduced

## Project Structure

### Documentation (this feature)
```
specs/[###-feature]/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
# Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure]
```

**Structure Decision**: Option 2 (Web application) - Project uses frontend/ and backend/ structure. Changes isolated to `frontend/react-Admin3/src/components/Product/FilterPanel.js`

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:
   ```
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate API contracts** from functional requirements:
   - For each user action → endpoint
   - Use standard REST/GraphQL patterns
   - Output OpenAPI/GraphQL schema to `/contracts/`

3. **Generate contract tests** from contracts:
   - One test file per endpoint
   - Assert request/response schemas
   - Tests must fail (no implementation yet)

4. **Extract test scenarios** from user stories:
   - Each story → integration test scenario
   - Quickstart test = story validation steps

5. **Update agent file incrementally** (O(1) operation):
   - Run `.specify/scripts/bash/update-agent-context.sh claude`
     **IMPORTANT**: Execute it exactly as specified above. Do not add or remove any arguments.
   - If exists: Add only NEW tech from current plan
   - Preserve manual additions between markers
   - Update recent changes (keep last 3)
   - Keep under 150 lines for token efficiency
   - Output to repository root

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, agent-specific file

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
1. **RED Phase Tasks** (Write failing tests first):
   - Task: Write unit test for max-height styling (desktop & mobile breakpoints)
   - Task: Write unit test for overflow scrolling behavior
   - Task: Write unit test for ARIA role="region" and aria-label attributes
   - Task: Write unit test for scrollIntoView on checkbox focus
   - Task: Write integration test for keyboard navigation through scrollable list
   - Task: Write integration test for multiple expanded accordions

2. **GREEN Phase Tasks** (Minimal implementation):
   - Task: Add sx prop with maxHeight and overflowY to AccordionDetails components
   - Task: Add responsive breakpoint objects (xs: 40vh, md: 50vh)
   - Task: Add role="region" and aria-label to AccordionDetails
   - Task: Add onFocus handler to checkboxes with scrollIntoView logic
   - Task: Verify all tests pass (run test suite)

3. **REFACTOR Phase Tasks** (Code quality improvements):
   - Task: Extract scrollable styling into reusable constant
   - Task: Add PropTypes or TypeScript types for new behavior
   - Task: Update component documentation/comments
   - Task: Run quickstart.md acceptance tests

**Ordering Strategy**:
- **TDD order**: All test tasks before implementation tasks (strict RED-GREEN-REFACTOR)
- **No parallel execution**: Tests must fail first before implementation begins
- **Dependencies**:
  - Test tasks → Implementation tasks (tests block implementation)
  - Implementation tasks → Refactor tasks (implementation blocks refactor)
  - Refactor tasks → Acceptance tests (refactor blocks sign-off)

**Estimated Output**: 15-18 numbered, sequentially-ordered tasks in tasks.md

**Key Files Modified**:
- `frontend/react-Admin3/src/components/Product/FilterPanel.js` (main component)
- `frontend/react-Admin3/src/components/Product/__tests__/FilterPanel.test.js` (tests)

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

**No complexity violations** - This feature follows all constitutional principles:
- Uses existing dependencies (Material-UI, React Testing Library)
- No new architectural patterns introduced
- Follows TDD RED-GREEN-REFACTOR cycle
- Single component modification (FilterPanel.js)
- No backend changes required


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) - research.md generated
- [x] Phase 1: Design complete (/plan command) - data-model.md, contracts/, quickstart.md, CLAUDE.md updated
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [x] Phase 3: Tasks generated (/tasks command) - tasks.md created with 15 TDD tasks
- [ ] Phase 4: Implementation complete - **NEXT STEP**
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS (TDD principles applicable, no complexity violations)
- [x] Post-Design Constitution Check: PASS (no new dependencies, pure UI enhancement)
- [x] All NEEDS CLARIFICATION resolved (via /clarify session 2025-10-28)
- [x] Complexity deviations documented: N/A (no deviations)

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
