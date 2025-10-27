
# Implementation Plan: Material Product Card Enhanced Purchase Options

**Branch**: `001-docs-stories-epic` | **Date**: 2025-10-27 | **Spec**: [/Users/work/Documents/Code/Admin3/docs/features/001-docs-stories-epic/spec.md]
**Input**: Feature specification from `/specs/001-docs-stories-epic/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path → ✅ LOADED
2. Fill Technical Context → ✅ COMPLETE
   → Detected Project Type: web (Django backend + React frontend)
   → Set Structure Decision: Option 2 (Web application)
3. Fill Constitution Check section → ✅ COMPLETE (template constitution, no specific constraints)
4. Evaluate Constitution Check → ✅ PASS
5. Execute Phase 0 → research.md → IN PROGRESS
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md update → PENDING
7. Re-evaluate Constitution Check → PENDING
8. Plan Phase 2 → Describe task generation approach → PENDING
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 9. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary

**Primary Requirement**: Enhance Material Product Card component with SpeedDial purchase options for "Buy Both" bundling and product recommendations, replacing existing radio button interface with modern UI that promotes cross-selling.

**Technical Approach**:
- Backend: Add `ProductVariationRecommendation` model with one-to-one relationships
- API: Extend search serializer with optional `recommended_product` field (backward compatible)
- Frontend: Replace radio button UI (lines 373-437) with conditional Material-UI SpeedDial
- Testing: TDD approach with model tests, API tests, component tests, and integration tests

## Technical Context

**Language/Version**:
- Backend: Python 3.11 with Django 5.1, Django REST Framework
- Frontend: JavaScript ES6+ with React 18

**Primary Dependencies**:
- Backend: Django 5.1, DRF, psycopg2 (PostgreSQL adapter), django-cors-headers
- Frontend: React 18, Material-UI v5, Axios, React Router, Context API

**Storage**: PostgreSQL database (ACTEDDBDEV01)
- Existing tables: `acted_products`, `acted_product_productvariation`
- New table: `acted_product_productvariation_recommendations`
- Relationship: Foreign keys with CASCADE deletion

**Testing**:
- Backend: Django TestCase, APITestCase, pytest
- Frontend: Jest, React Testing Library
- TDD mandatory per CLAUDE.md requirements

**Target Platform**:
- Backend: Django development server (port 8888), production deployment via standard Django WSGI
- Frontend: React development server, production build served statically

**Project Type**: web (Django backend + React frontend)

**Performance Goals**:
- API response time: < 10ms additional latency for recommendation fetch
- Single LEFT JOIN with indexed foreign keys
- Frontend rendering: < 100ms for SpeedDial interactions

**Constraints**:
- Zero regression in existing product display/cart functionality
- Backward compatible API (existing consumers must work without changes)
- Maintain existing cart metadata structure
- One-to-one recommendation relationships only (no circular recommendations)
- Mutual exclusivity: buy_both=true products don't show recommendations

**Scale/Scope**:
- Database: ~500 product variations, ~100 recommendation mappings expected
- Frontend: Single component refactoring (MaterialProductCard.js)
- API: Single endpoint modification (exam-sessions-subjects-products/search)
- 3 coordinated stories (1 backend + 2 frontend)

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Status**: ✅ PASS - Template constitution has no specific constraints

**Notes**: The project's `.specify/memory/constitution.md` is a template without specific principles. Development will follow existing project patterns from CLAUDE.md:
- Test-Driven Development (TDD) mandatory
- Django model/serializer patterns for backend
- React functional components with Material-UI for frontend
- Backward compatibility for API changes

## Project Structure

### Documentation (this feature)
```
specs/[###-feature]/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
│   ├── api_contracts.yaml
│   └── test_contracts.py
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
# Option 2: Web application (SELECTED based on Django + React context)
backend/django_Admin3/
├── products/
│   ├── models/
│   │   ├── product_variation_recommendation.py  # NEW MODEL
│   │   └── __init__.py
│   ├── admin.py                                 # UPDATE
│   └── tests/
│       └── test_product_variation_recommendation.py  # NEW TESTS
├── exam_sessions_subjects_products/
│   ├── serializers.py                           # UPDATE (add recommended_product field)
│   ├── views.py                                 # UPDATE (add recommendation query)
│   └── tests/
│       └── test_recommendation_api.py           # NEW TESTS
└── tests/
    ├── contract/
    ├── integration/
    └── unit/

frontend/
├── src/
│   ├── components/
│   │   └── Product/
│   │       └── ProductCard/
│   │           ├── MaterialProductCard.js       # UPDATE (replace radio, add SpeedDial)
│   │           └── __tests__/
│   │               └── MaterialProductCard.buyboth.test.js  # NEW TESTS
│   └── contexts/
│       └── CartContext.js                       # NO CHANGES (reuse existing)
└── tests/
```

**Structure Decision**: Option 2 (Web application) - Django backend + React frontend detected from epic context

## Phase 0: Outline & Research

**Research Tasks**:

1. **Material-UI SpeedDial Best Practices**
   - Research: Optimal SpeedDial usage patterns for product actions
   - Context: Replacing radio button with hover-based SpeedDial
   - Focus: Accessibility, mobile compatibility, Material-UI v5 patterns

2. **Django OneToOneField vs ForeignKey**
   - Research: Best approach for one-to-one recommendation relationships
   - Context: Each product variation → max 1 recommendation
   - Focus: Unique constraint enforcement, cascade deletion behavior

3. **DRF Nested Serialization Performance**
   - Research: Optimal approach for optional nested objects in serializers
   - Context: Adding `recommended_product` field with LEFT JOIN
   - Focus: N+1 query prevention, prefetch_related patterns

4. **React Conditional Rendering Patterns**
   - Research: Best practices for three-tier conditional UI rendering
   - Context: buy_both SpeedDial → recommendation SpeedDial → standard button
   - Focus: Avoid prop drilling, maintainability, testability

**Output**: research.md documenting decisions for each research area

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

### 1. Data Model Design → `data-model.md`

**Entities from Spec**:

1. **ProductVariationRecommendation** (NEW)
   - Fields: id, product_variation_id, recommended_product_variation_id, created_at, updated_at
   - Relationships: OneToOneField to ProductVariation (source), ForeignKey to ProductVariation (recommended)
   - Constraints: Unique(product_variation_id), prevent self-reference, prevent circular recommendations
   - Validation: clean() method for business rules

2. **ProductVariation** (EXISTING - EXTEND)
   - Add reverse relationship: `recommendation` (OneToOne), `recommended_by` (ForeignKey)
   - No schema changes to existing table

3. **Product** (EXISTING - NO CHANGES)
   - Existing field: `buy_both` boolean
   - No modifications required

### 2. API Contracts → `/contracts/api_contracts.yaml`

**Endpoint**: `GET /api/exam-sessions-subjects-products/search/`

**Response Schema Extension** (backward compatible):
```yaml
ProductVariation:
  properties:
    id:
      type: integer
    variation_type:
      type: string
    name:
      type: string
    prices:
      type: array
      items: Price
    recommended_product:  # NEW OPTIONAL FIELD
      type: object
      nullable: true
      properties:
        essp_id: integer
        esspv_id: integer
        product_code: string
        product_name: string
        product_short_name: string
        variation_type: string
        prices: array<Price>
```

**Admin Endpoint** (NEW): `GET/POST /admin/products/productvariationrecommendation/`
- Standard Django admin CRUD operations
- Autocomplete fields for variation selection
- Validation: prevent self-reference and circular recommendations

### 3. Contract Tests → `/contracts/test_contracts.py`

**Test Cases**:
1. `test_search_api_includes_recommended_product_when_exists()` - Assert nested object structure
2. `test_search_api_omits_recommended_product_when_none()` - Assert backward compatibility
3. `test_search_api_response_schema()` - Validate all required fields present
4. `test_admin_create_recommendation()` - Assert recommendation creation via admin
5. `test_admin_prevents_self_reference()` - Assert validation error on self-recommendation
6. `test_admin_prevents_circular()` - Assert validation error on circular recommendations

### 4. Integration Test Scenarios → `quickstart.md`

**Scenario 1: Buy Both SpeedDial**
1. Create product with buy_both=true and 2 variations
2. Call search API
3. Assert response includes buy_both flag
4. Frontend renders SpeedDial with "Add to Cart" and "Buy Both" actions
5. Click "Buy Both" → assert both items added to cart with correct metadata

**Scenario 2: Recommended Product SpeedDial**
1. Create recommendation: Variation A → Variation B
2. Call search API
3. Assert response includes recommended_product nested object
4. Frontend renders SpeedDial with "Add to Cart" and "Buy with {Name} ({Price})" actions
5. Click "Buy with..." → assert both items added to cart

**Scenario 3: Fallback to Standard Button**
1. Create product with buy_both=false, no recommendations
2. Call search API
3. Assert response has no buy_both flag or recommended_product
4. Frontend renders standard "Add to Cart" button
5. Click button → assert single item added to cart

**Scenario 4: Admin Validation**
1. Create recommendation via Django admin
2. Attempt to create self-referencing recommendation
3. Assert ValidationError raised
4. Attempt to create circular recommendation (A→B, B→A)
5. Assert ValidationError raised

### 5. Agent File Update

Execute: `.specify/scripts/bash/update-agent-context.sh claude`

**Additions to CLAUDE.md**:
- Material-UI SpeedDial component usage for product actions
- ProductVariationRecommendation model with one-to-one relationship pattern
- Conditional rendering pattern: buy_both → recommendation → fallback
- API serializer extension with optional nested objects
- Test patterns for SpeedDial component interactions

**Output**: data-model.md, /contracts/api_contracts.yaml, /contracts/test_contracts.py, quickstart.md, CLAUDE.md updated

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
1. Load Phase 1 artifacts (data-model.md, contracts, quickstart.md)
2. Generate tasks following TDD order (tests → implementation)
3. Sequence: Backend model/tests → API serializer/tests → Frontend SpeedDial/tests
4. Mark independent tasks with [P] for parallel execution

**Task Breakdown**:

**Story 1 - Backend (Tasks 1-8)**:
1. [P] Write model tests for ProductVariationRecommendation
2. Create ProductVariationRecommendation model
3. Generate database migration
4. [P] Write API contract tests for recommended_product field
5. Extend serializer with get_recommended_product() method
6. Add recommendation fetch logic to search view
7. Create Django admin interface for recommendations
8. Verify all Story 1 tests pass

**Story 2 - Frontend Buy Both (Tasks 9-14)**:
9. [P] Write SpeedDial component tests for buy_both
10. Add SpeedDial imports to MaterialProductCard
11. Remove buy_both radio button code (lines 373-437)
12. Implement conditional SpeedDial for buy_both
13. Implement "Buy Both" action handler
14. Verify all Story 2 tests pass

**Story 3 - Frontend Recommendations (Tasks 15-20)**:
15. [P] Write SpeedDial component tests for recommendations
16. Implement conditional SpeedDial for recommended_product
17. Implement dynamic label generation (product name + price)
18. Implement "Buy with Recommended" action handler
19. Add three-tier conditional rendering logic
20. Verify all Story 3 tests pass

**Integration Tasks (21-23)**:
21. Run full regression test suite (backend + frontend)
22. Manual QA: Test all product types (Materials, Tutorials, Markings)
23. Verify quickstart.md scenarios pass end-to-end

**Ordering Strategy**:
- TDD order: All test tasks before implementation tasks
- Dependency order: Backend (Story 1) → Frontend Story 2 → Frontend Story 3
- Parallel opportunities: Model tests, API tests, component tests (different files)

**Estimated Output**: 23 numbered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following TDD principles from CLAUDE.md)
**Phase 5**: Validation (run full test suite, execute quickstart.md, verify zero regression)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

**No violations** - Template constitution has no specific constraints.

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [ ] Phase 0: Research complete (/plan command)
- [ ] Phase 1: Design complete (/plan command)
- [ ] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [ ] Post-Design Constitution Check: PASS
- [ ] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (N/A - no violations)

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
