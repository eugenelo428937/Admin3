
# Implementation Plan: Implement Recommended Product Function for Marking Product Card

**Branch**: `001-i-have-added` | **Date**: 2025-10-28 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-i-have-added/spec.md`

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
Extend the product recommendation system to MarkingProductCard components by implementing the same SpeedDial pattern currently used in MaterialProductCard. When a marking product has a recommended complementary product configured in the database (acted_product_productvariation_recommendations table), users will see a SpeedDial button offering options to purchase the marking product alone or together with the recommended product. This feature increases average order value by suggesting relevant product combinations (e.g., Mock Exam Marking Service + Mock Exam eBook) while maintaining all existing marking product functionality (deadline warnings, discount pricing, submission information).

## Technical Context
**Language/Version**: React 18 (frontend), Django 5.1 + Python (backend)
**Primary Dependencies**: Material-UI v5, Django REST Framework, PostgreSQL
**Storage**: PostgreSQL database (acted_product_productvariation_recommendations table - already populated)
**Testing**: React Testing Library + Jest (frontend), Django TestCase (backend)
**Target Platform**: Web application (desktop + mobile responsive)
**Project Type**: web (frontend + backend)
**Performance Goals**: <200ms component render time, 60fps UI animations
**Constraints**: Must preserve all existing MarkingProductCard functionality (deadline warnings, discount pricing), must maintain visual consistency with MaterialProductCard SpeedDial pattern
**Scale/Scope**: ~50-100 marking products with recommendations, single component modification (MarkingProductCard.js)

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Note**: Project constitution is template-only. Applying Admin3 project standards from CLAUDE.md:

### Test-Driven Development (TDD) - MANDATORY
- [x] **RED Phase**: Tests will be written first based on MaterialProductCard.recommendations.test.js patterns
- [x] **GREEN Phase**: Minimal implementation to make tests pass
- [x] **REFACTOR Phase**: Improve code quality while keeping tests green

### Frontend Testing Standards
- [x] Component rendering tests required
- [x] User interaction tests (SpeedDial open/close, purchase actions)
- [x] Mock API calls for recommendation data
- [x] Test coverage target: 80% minimum for new code

### Code Style Conventions
- [x] Functional components with hooks (existing MarkingProductCard pattern)
- [x] Material-UI components (SpeedDial, SpeedDialAction)
- [x] Proper loading states and error handling
- [x] Preserve existing MarkingProductCard structure

### Integration Requirements
- [x] Backend API already provides recommendation data via product serializer
- [x] Database table (acted_product_productvariation_recommendations) already populated
- [x] No backend changes required - frontend-only implementation

**Status**: ✅ PASS - All constitutional requirements met. Feature aligns with existing patterns and TDD enforcement.

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

**Structure Decision**: Option 2 (Web application) - Frontend React component modification only

**Actual Project Structure** (Admin3):
```
frontend/react-Admin3/
├── src/
│   ├── components/
│   │   └── Product/
│   │       └── ProductCard/
│   │           ├── MarkingProductCard.js                    # Target for modifications
│   │           ├── MaterialProductCard.js                   # Reference implementation
│   │           └── __tests__/
│   │               ├── MarkingProductCard.recommendations.test.js  # New test file
│   │               └── MaterialProductCard.recommendations.test.js # Reference tests
│   └── styles/
│       └── product_card.css                                 # Shared styles
└── tests/                                                   # Frontend tests

backend/django_Admin3/
└── products/
    └── models/
        └── product_variation_recommendation.py              # Already exists - no changes needed
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

The `/tasks` command will generate a task list based on the following approach:

1. **Test-First Development (TDD)**:
   - Create test file: `MarkingProductCard.recommendations.test.js`
   - Write 14 tests based on contract scenarios (see contracts/component-interface.md)
   - Reference MaterialProductCard.recommendations.test.js for patterns

2. **Component Implementation**:
   - Modify `MarkingProductCard.js` to add:
     - SpeedDial imports
     - `speedDialOpen` state
     - Three-tier conditional rendering (recommendation tier)
     - Purchase handlers for "Buy Marking Only" and "Buy with Recommended"
   - Preserve all existing functionality (deadlines, discounts, modals)

3. **Integration Testing**:
   - Manual testing checklist (10 scenarios from quickstart.md)
   - Backend integration verification (real API data)
   - Accessibility testing (keyboard, screen reader)

**Ordering Strategy**:

```
Phase 2a: Test Setup (TDD RED)
1. Create test file with mock data helpers
2. Write 14 failing tests (one test at a time)
3. Verify tests fail (RED phase)

Phase 2b: Implementation (TDD GREEN)
4. Add SpeedDial imports and state
5. Implement three-tier conditional rendering
6. Implement purchase handlers
7. Run tests → should pass (GREEN phase)

Phase 2c: Refactoring (TDD REFACTOR)
8. Extract helper functions if needed
9. Optimize memoization
10. Clean up code while keeping tests green

Phase 2d: Integration & Validation
11. Manual testing (10 quickstart scenarios)
12. Accessibility audit
13. Performance validation (<200ms render, 60fps animations)
14. Code review and merge
```

**Task Dependencies**:
- Tests must be written BEFORE implementation (TDD enforcement)
- Implementation tasks depend on test tasks
- Integration testing depends on implementation completion
- All tasks are sequential (no parallel execution due to single file modification)

**Estimated Output**: 14-16 numbered, ordered tasks in tasks.md

**Key Files Modified**:
- New: `frontend/react-Admin3/src/components/Product/ProductCard/__tests__/MarkingProductCard.recommendations.test.js`
- Modified: `frontend/react-Admin3/src/components/Product/ProductCard/MarkingProductCard.js`
- Reference: `frontend/react-Admin3/src/components/Product/ProductCard/MaterialProductCard.js` (copy patterns from this file)

**Estimated Effort**:
- Test creation: 2-3 hours
- Implementation: 1-2 hours
- Manual testing: 1 hour
- Code review: 30 minutes
- **Total**: ~5-6 hours

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

**No Complexity Violations**: This feature follows existing patterns and requires no architectural complexity. All constitutional requirements met.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) ✅ research.md created
- [x] Phase 1: Design complete (/plan command) ✅ data-model.md, contracts/, quickstart.md, CLAUDE.md updated
- [x] Phase 2: Task planning complete (/plan command - describe approach only) ✅ Approach documented above
- [x] Phase 3: Tasks generated (/tasks command) ✅ tasks.md created with 32 numbered tasks
- [ ] Phase 4: Implementation complete → Execute tasks.md
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS ✅ TDD enforced, follows existing patterns
- [x] Post-Design Constitution Check: PASS ✅ No new complexity, frontend-only changes
- [x] All NEEDS CLARIFICATION resolved ✅ All 4 clarifications answered in research.md
- [x] Complexity deviations documented ✅ None - no violations

**Generated Artifacts**:
- ✅ `/specs/001-i-have-added/plan.md` (this file)
- ✅ `/specs/001-i-have-added/research.md` (6 research questions resolved)
- ✅ `/specs/001-i-have-added/data-model.md` (component state, API contracts)
- ✅ `/specs/001-i-have-added/contracts/component-interface.md` (14 test scenarios)
- ✅ `/specs/001-i-have-added/quickstart.md` (10 manual test cases)
- ✅ `/specs/001-i-have-added/tasks.md` (32 numbered implementation tasks)
- ✅ `/CLAUDE.md` (updated with feature context)

**Ready for Implementation**: ✅ YES (execute tasks.md)

---

## Summary

**Planning Phase Complete**: ✅
**All Clarifications Resolved**: ✅ (4/4 from spec)
**Design Artifacts Generated**: ✅ (6 documents)
**Constitutional Compliance**: ✅ (TDD enforced, no violations)
**Estimated Implementation Effort**: 5-6 hours
**Risk Level**: LOW (proven pattern, isolated changes)

---

*Based on Constitution v2.1.1 - See `.specify/memory/constitution.md`*
*Next Command*: `/tasks` to generate implementation task list
