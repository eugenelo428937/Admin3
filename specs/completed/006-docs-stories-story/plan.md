
# Implementation Plan: Display Navbar Filters in FilterPanel and ActiveFilters

**Branch**: `006-docs-stories-story` | **Date**: 2025-10-19 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/Users/work/Documents/Code/Admin3/specs/006-docs-stories-story/spec.md`

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

**Primary Requirement**: Make navbar filters (tutorial_format, distance_learning, tutorial) visible and manageable in the product filtering UI by adding filter sections to FilterPanel sidebar and removable chips to ActiveFilters chip bar.

**Technical Approach**: Extend existing React components (FilterPanel.js, ActiveFilters.js) with new sections for navbar filters. Use Redux Toolkit for state management (already implemented in Story 1.2). Follow existing Material-UI patterns for accordion sections and chip components. Integrate with existing URL synchronization middleware and product search API.

**User Impact**: Resolves critical usability issue where users could not see or clear navigation menu filters. Users gain transparency into active filters and one-click removal capability.

## Technical Context
**Language/Version**: JavaScript ES2022, React 18.2
**Primary Dependencies**: React 18, Material-UI v5, Redux Toolkit 1.9, React Router v6
**Storage**: Browser state (Redux) + URL query parameters
**Testing**: Jest 29, React Testing Library 14
**Target Platform**: Modern browsers (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
**Project Type**: web (frontend React + backend Django)
**Performance Goals**: < 5ms FilterPanel render, < 50ms chip click response, < 250ms API call debounce
**Constraints**: Must match existing UI patterns exactly, maintain 60fps animations, 44×44px touch targets on mobile
**Scale/Scope**: ~150 LOC additions to FilterPanel.js, ~100 LOC to ActiveFilters.js, 3 new filter sections, comprehensive test coverage

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Status**: ✅ PASS - No project constitution defined (template only). Applying general best practices:

**Test-Driven Development**:
- ✅ All tests written before implementation (React Testing Library tests for FilterPanel and ActiveFilters)
- ✅ Tests must fail initially (verifying new sections/chips don't exist yet)
- ✅ Red-Green-Refactor cycle enforced

**Existing Pattern Consistency**:
- ✅ Follows existing FilterPanel accordion pattern (no new components)
- ✅ Follows existing ActiveFilters chip pattern (no new architecture)
- ✅ Redux actions already exist from Story 1.2 (dependency)
- ✅ URL sync middleware already implemented (Story 1.1)

**Simplicity**:
- ✅ Additive changes only (no breaking changes to existing filters)
- ✅ Reuses existing Material-UI components (Accordion, Checkbox, Radio, Chip)
- ✅ No new abstractions or patterns introduced
- ✅ Minimal code additions (~250 LOC total)

**Performance**:
- ✅ No additional API calls (uses existing product search endpoint)
- ✅ No new state management overhead (Redux already in use)
- ✅ Debouncing already implemented for API calls (250ms)
- ✅ Performance targets defined and measurable

**No violations identified** - This is a straightforward UI extension following established patterns.

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

**Structure Decision**: Option 2 (Web application) - Frontend React + Backend Django detected in Technical Context. This feature modifies frontend only:

```
frontend/react-Admin3/src/
├── components/Product/
│   ├── FilterPanel.js          # Modified (add navbar filter sections)
│   ├── ActiveFilters.js        # Modified (add navbar filter chips)
│   └── __tests__/
│       ├── FilterPanel.test.js # Modified (add tests for new sections)
│       └── ActiveFilters.test.js # Modified (add tests for new chips)
├── store/slices/
│   └── filtersSlice.js        # Already has navbar filter actions (Story 1.2)
└── store/middleware/
    └── urlSyncMiddleware.js   # Already syncs navbar filters (Story 1.1)
```

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
- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- Each contract → contract test task [P]
- Each entity → model creation task [P] 
- Each user story → integration test task
- Implementation tasks to make tests pass

**Ordering Strategy**:
- TDD order: Tests before implementation 
- Dependency order: Models before services before UI
- Mark [P] for parallel execution (independent files)

**Estimated Output**: 25-30 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) - ✅ research.md created
- [x] Phase 1: Design complete (/plan command) - ✅ data-model.md, quickstart.md, contracts/README.md created, CLAUDE.md updated
- [x] Phase 2: Task planning complete (/plan command - describe approach only) - ✅ Task generation strategy documented
- [x] Phase 3: Tasks generated (/tasks command) - ✅ tasks.md created with 41 TDD-ordered tasks
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS - ✅ No violations, following TDD and existing patterns
- [x] Post-Design Constitution Check: PASS - ✅ Pure UI extension, no new complexity
- [x] All NEEDS CLARIFICATION resolved - ✅ No unknowns, Stories 1.7-1.8 fully detailed
- [x] Complexity deviations documented - ✅ N/A - No deviations

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
