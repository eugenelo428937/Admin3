
# Implementation Plan: Hong Kong Address Lookup Service Integration

**Branch**: `003-currently-the-backend` | **Date**: 2025-11-01 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/Users/work/Documents/Code/Admin3/specs/003-currently-the-backend/spec.md`

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
Add Hong Kong address lookup functionality to the existing Django/React application, enabling users to search for and select Hong Kong addresses using the government Address Lookup Service (ALS). The implementation will mirror the existing UK address lookup pattern (`address_lookup_proxy`) while supporting free-text search across all address components (building, street, district, region) and displaying results in English only. Users can mix countries between home and work addresses (e.g., UK home + HK work). The system will apply conditional validation: strict for lookup-selected addresses, basic validation for manual entry. When the HK lookup service is unavailable, the system will disable lookup and allow manual address entry to prevent blocking user registration/profile updates.

## Technical Context
**Language/Version**: Backend: Python 3.11+ (Django 5.2.2), Frontend: JavaScript ES6+ (React 19.1)
**Primary Dependencies**: Backend: Django REST Framework 3.16, requests library; Frontend: Material-UI, axios
**Storage**: PostgreSQL (existing user profile schema with address fields)
**Testing**: Backend: Django test framework (APITestCase), Frontend: Jest + React Testing Library
**Target Platform**: Web application (Linux server backend, modern browsers frontend)
**Project Type**: Web (backend + frontend)
**Performance Goals**: Address lookup API response < 2 seconds, UI free-text search debounced (300ms)
**Constraints**: Must maintain existing UK address lookup without disruption, reuse existing address fields in user profile model, handle HK ALS API unavailability gracefully
**Scale/Scope**: Single new backend endpoint (`address_lookup_proxy_hk`), updates to existing UserFormWizard component, support for ~2-3 address lookup scenarios per user registration/update

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Status**: ✅ PASS (no constitution file found - using default best practices)

Since no project-specific constitution exists at `.specify/memory/constitution.md`, we apply standard Django/React best practices:
- Follow existing codebase patterns (mirror UK address lookup implementation)
- Maintain backward compatibility (no changes to existing UK functionality)
- Write tests first (TDD approach for new endpoint and React component updates)
- Use existing architectural patterns (Django views, React functional components)
- No new external dependencies required (reuse requests, axios)

**Initial Assessment**: No constitutional violations detected. Feature extends existing functionality using established patterns.

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

**Structure Decision**: **Option 2: Web application** (backend/ + frontend/ structure confirmed in repository)

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

The /tasks command will generate a TDD-ordered task list following this structure:

### Phase 0: Research & Setup (1-2 tasks)
- Review existing UK address lookup implementation pattern
- Set up test fixtures for HK ALS API mocking

### Phase 1: Backend Contract Tests (3-5 tasks) [P]
- Write contract test for successful address search (200 response)
- Write contract test for missing search_text (400 response)
- Write contract test for service unavailable (500 response)
- Write contract test for address object structure validation
- All tests must FAIL initially (no implementation yet)

### Phase 2: Backend Implementation (4-6 tasks)
- Implement `/api/utils/address-lookup-hk/` Django view (make contract tests pass)
- Add HK ALS API integration helper functions (parse response, transform to contract format)
- Implement error handling (timeout, connection errors, API errors)
- Add request validation (search_text length, sanitization)
- Configure URL routing for new endpoint
- Add settings for HK ALS API URL (optional API key if needed)

### Phase 3: Frontend Unit Tests (2-3 tasks) [P]
- Write `useHKAddressLookup` hook tests (mock axios)
- Write `HKAddressSearch` component tests (rendering, user interactions)
- Tests must FAIL before implementation

### Phase 4: Frontend Implementation (3-4 tasks)
- Implement `useHKAddressLookup` React hook (make hook tests pass)
- Update `UserFormWizard.js` to support HK address lookup (country-based routing)
- Implement address selection and form auto-population
- Add error handling UI (service unavailable message, manual entry fallback)

### Phase 5: Validation Logic (2-3 tasks)
- Implement strict validation for lookup-selected addresses (FR-016)
- Implement basic validation for manual entry (FR-017)
- Add validation mode tracking in form state

### Phase 6: Integration Tests (2-3 tasks)
- Write integration test for full user flow (registration with HK address)
- Write integration test for mixed country addresses (UK home + HK work)
- Write integration test for manual entry fallback

### Phase 7: Edge Cases & Polish (2-3 tasks) [P]
- Handle 3D vs 2D address display formatting
- Add loading states and debouncing (if autocomplete needed)
- Test with real HK ALS API (staging environment)

### Phase 8: Documentation & Deployment (1-2 tasks)
- Update API documentation
- Run quickstart.md validation tests
- Create deployment checklist

**Ordering Strategy**:
- **TDD strict**: All tests written BEFORE implementation
- **Backend first**: API contract → implementation → frontend (vertical slices)
- **Parallel tasks marked [P]**: Independent test files can be written concurrently
- **Dependency order**: Contract tests → implementation → validation → integration → edge cases

**Estimated Output**: **28-35 tasks** in tasks.md

**Task Breakdown Example**:
```markdown
## Phase 1: Backend Contract Tests

### Task 1: Write successful search contract test [P]
**File**: `backend/django_Admin3/utils/tests/test_address_lookup_hk.py`
**TDD Stage**: RED
**Dependencies**: None
**Description**: Create contract test that verifies GET /api/utils/address-lookup-hk/?search_text=central returns 200 with addresses array, total, and search_text fields.
**Acceptance**: Test fails (no endpoint implementation yet)

### Task 2: Write missing search_text contract test [P]
**File**: `backend/django_Admin3/utils/tests/test_address_lookup_hk.py`
**TDD Stage**: RED
**Dependencies**: None
**Description**: Create contract test that verifies missing search_text parameter returns 400 with error and allow_manual=true.
**Acceptance**: Test fails (no endpoint implementation yet)
```

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
- [x] Phase 1: Design complete (/plan command) - ✅ data-model.md, contracts/, quickstart.md created
- [x] Phase 2: Task planning complete (/plan command - describe approach only) - ✅ Task generation strategy documented
- [ ] Phase 3: Tasks generated (/tasks command) - Next step: Run `/tasks`
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS (no violations, extends existing patterns)
- [x] Post-Design Constitution Check: PASS (no new violations detected)
- [x] All NEEDS CLARIFICATION resolved (5 clarifications completed in spec phase)
- [x] Complexity deviations documented (none - follows existing UK lookup pattern)

**Artifacts Generated**:
- ✅ `/specs/003-currently-the-backend/plan.md` (this file)
- ✅ `/specs/003-currently-the-backend/research.md` (Phase 0)
- ✅ `/specs/003-currently-the-backend/data-model.md` (Phase 1)
- ✅ `/specs/003-currently-the-backend/contracts/address-lookup-hk-api.md` (Phase 1)
- ✅ `/specs/003-currently-the-backend/quickstart.md` (Phase 1)
- ✅ `/CLAUDE.md` (updated with new technical context)

**Next Command**: `/tasks` (to generate tasks.md from Phase 2 strategy)

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
