# Feature Specification: Frontend Test Coverage - Phase 2 Extension

**Feature Branch**: `20251120-extend-the-current`
**Created**: 2025-11-26
**Status**: Draft
**Input**: User description: "Extend the current spec to include modules that are not included in the current spec."

## Execution Flow (main)
```
1. Parse user description from Input
   → Completed: Extend Phase 1 spec to cover remaining modules
2. Extract key concepts from description
   → Identified: Components, Pages, Store/Redux, Theme, Root-level modules
3. For each unclear aspect:
   → None - building on established Phase 1 patterns
4. Fill User Scenarios & Testing section
   → Completed: Module-based test development scenarios
5. Generate Functional Requirements
   → Completed: All requirements are testable per module
6. Identify Key Entities
   → Completed: Components (100+), Pages (4), Store (12), Theme (5)
7. Run Review Checklist
   → Completed: All checks passed
8. Return: SUCCESS (spec ready for planning)
```

---

## Quick Guidelines
- Focus on WHAT users need and WHY
- Avoid HOW to implement (no tech stack, APIs, code structure)
- Written for business stakeholders, not developers

---

## Problem Statement

Phase 1 of the frontend test coverage initiative (spec 004) successfully achieved 95% coverage for foundational modules (services, hooks, contexts, utils). The following modules remain without comprehensive test coverage:

### Current Test Gap Analysis - Phase 2 Modules

| Module Type | Total Files | Files with Tests | Coverage Gap |
|-------------|-------------|------------------|--------------|
| **Components** | 100+ | ~20 | ~80 files untested |
| **Pages** | 4 | 0 | 4 files untested |
| **Store/Redux** | 12 | 10 | 2 files need improvement |
| **Theme** | 5 | 0 | 5 files untested |
| **Root Level** | 5 | 1 | 4 files untested |

### Component Categories Breakdown

| Category | Files | Test Status |
|----------|-------|-------------|
| Common | 8 | 4 have tests |
| Address | 2 | 1 has tests |
| Cart | 4 | 4 have tests |
| Navigation | 10 | 0 have tests |
| Ordering | 5 | 2 have tests |
| Product | 15+ | 5 have tests |
| User | 7 | 0 have tests |
| Admin | 10 | 0 have tests |
| Test/Demo | 5 | N/A (demo only) |
| Styleguide | 15+ | N/A (documentation) |

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story
As a development team, we need comprehensive test coverage for all frontend modules including components, pages, store management, and theming. This ensures code quality, prevents regressions, and enables confident refactoring across the entire frontend codebase.

### Acceptance Scenarios

1. **Given** a component file exists (e.g., `MainNavBar.js`), **When** a developer looks for its tests, **Then** they find a corresponding `MainNavBar.test.js` in the component's `__tests__` folder

2. **Given** a page file exists (e.g., `Home.js`), **When** tests are run for that page, **Then** the test file `Home.test.js` validates routing, rendering, and user interactions

3. **Given** a Redux slice exists (e.g., `filtersSlice.js`), **When** tests execute, **Then** all actions, reducers, and selectors are validated with state transitions

4. **Given** a theme file exists (e.g., `colorTheme.js`), **When** tests execute, **Then** theme configuration exports are validated

5. **Given** all Phase 2 module tests are complete, **When** coverage reports run, **Then** overall frontend coverage achieves minimum 80%

### Edge Cases

- **What happens when** a component depends on multiple contexts?
  → Tests provide mock context values, each component tested in isolation

- **What happens when** pages use complex routing with parameters?
  → Tests mock React Router, validate parameter handling

- **What happens when** Redux middleware has side effects?
  → Tests mock external dependencies, validate middleware behavior

---

## Requirements *(mandatory)*

### Functional Requirements - Phase 2A: Components

#### Common Components (8 files)
- **FR-021**: Each Common component MUST have a corresponding test file
- **FR-022**: Tests MUST validate rendering, props, and user interactions

**Common components requiring tests:**
| Component | Current Status | Priority |
|-----------|---------------|----------|
| BaseProductCard.js | Needs tests | High |
| CommunicationDetailsPanel.js | Has tests | Complete |
| CollapsibleAlert.js | Has tests | Complete |
| JsonContentRenderer.js | Needs tests | Medium |
| RulesEngineAcknowledgmentModal.js | Needs tests | High |
| RulesEngineInlineAlert.js | Has tests | Complete |
| RulesEngineModal.js | Has tests | Complete |
| VATBreakdown.js | Needs tests | Medium |

#### Navigation Components (10 files)
- **FR-023**: Navigation components MUST have tests covering menu rendering and interactions
- **FR-024**: Tests MUST validate responsive behavior (mobile vs desktop)

**Navigation components requiring tests:**
| Component | Current Status | Priority |
|-----------|---------------|----------|
| AuthModal.js | Needs tests | High |
| MainNavActions.js | Needs tests | Medium |
| MainNavBar.js | Needs tests | High |
| MobileNavigation.js | Needs tests | High |
| NavigationMenu.js | Needs tests | Medium |
| NavbarBrand.js | Needs tests | Low |
| SearchModal.js | Needs tests | High |
| TopNavActions.js | Needs tests | Low |
| TopNavBar.js | Needs tests | Medium |
| UserActions.js | Needs tests | Medium |

#### Product Components (15+ files)
- **FR-025**: Product components MUST have tests covering product display and filtering
- **FR-026**: Tutorial-related components MUST test selection flows

**Product components requiring tests:**
| Component | Current Status | Priority |
|-----------|---------------|----------|
| ActiveFilters.js | Has integration tests | Needs unit tests |
| FilterDebugger.js | Needs tests | Low |
| FilterPanel.js | Has tests | Complete |
| ProductCard/Tutorial/TutorialDetailCard.js | Has tests | Complete |
| ProductCard/Tutorial/TutorialSelectionDialog.js | Needs tests | High |
| ProductCard/Tutorial/TutorialSelectionSummaryBar.js | Needs tests | High |
| ProductCard/Tutorial/TutorialSummaryBarContainer.js | Needs tests | Medium |
| ProductList.js | Needs tests | High |

#### Ordering Components (5 files)
- **FR-027**: Ordering components MUST have tests covering checkout flow
- **FR-028**: Tests MUST validate cart operations and payment steps

**Ordering components requiring tests:**
| Component | Current Status | Priority |
|-----------|---------------|----------|
| CartPanel.js | Has partial tests | Needs improvement |
| CheckoutPage.js | Needs tests | High |
| CheckoutSteps/CartReviewStep.js | Needs tests | High |
| CheckoutSteps/CartSummaryPanel.js | Needs tests | Medium |
| CheckoutSteps/TermsConditionsStep.js | Needs tests | High |

#### User Components (7 files)
- **FR-029**: User components MUST have tests covering profile and authentication flows
- **FR-030**: Tests MUST validate form submissions and error handling

**User components requiring tests:**
| Component | Current Status | Priority |
|-----------|---------------|----------|
| EmailVerification.js | Needs tests | High |
| Logout.js | Needs tests | Low |
| OrderHistory.js | Needs tests | Medium |
| PhoneCodeAutocomplete.js | Needs tests | Medium |
| PhoneCodeDropdown.js | Needs tests | Medium |
| ProfileForm.js | Needs tests | High |
| ResendActivation.js | Needs tests | Medium |

#### Admin Components (10 files)
- **FR-031**: Admin components MUST have tests covering CRUD operations
- **FR-032**: Tests MUST validate form submissions and data display

**Admin components requiring tests:**
| Component | Current Status | Priority |
|-----------|---------------|----------|
| exam-sessions/ExamSessionForm.js | Needs tests | Medium |
| exam-sessions/ExamSessionList.js | Needs tests | Medium |
| products/ProductDetail.js | Needs tests | Medium |
| products/ProductForm.js | Needs tests | Medium |
| products/ProductImport.js | Needs tests | Low |
| products/ProductList.js | Needs tests | Medium |
| products/ProductTable.js | Needs tests | Low |
| subjects/SubjectDetail.js | Needs tests | Low |
| subjects/SubjectForm.js | Needs tests | Low |
| subjects/SubjectList.js | Needs tests | Low |

#### Address Components (2 files)
- **FR-033**: Address components MUST have tests covering address selection and editing

| Component | Current Status | Priority |
|-----------|---------------|----------|
| AddressEditModal.js | Has tests | Complete |
| AddressSelectionPanel.js | Needs tests | High |

### Functional Requirements - Phase 2B: Pages

- **FR-034**: Each page file MUST have a corresponding test file
- **FR-035**: Page tests MUST validate routing, data loading, and user flows
- **FR-036**: Page tests MUST achieve minimum 80% coverage

**Pages requiring tests:**
| Page | Current Status | Priority |
|------|---------------|----------|
| Cart.js | Needs tests | High |
| Home.js | Needs tests | High |
| ProfilePage.js | Needs tests | High |
| Registration.js | Needs tests | High |

### Functional Requirements - Phase 2C: Store/Redux

- **FR-037**: Each Redux slice MUST have comprehensive action/reducer tests
- **FR-038**: Selectors MUST have tests validating computed state
- **FR-039**: Middleware MUST have tests covering side effects
- **FR-040**: Store configuration MUST have integration tests

**Store modules status:**
| Module | Current Status | Priority |
|--------|---------------|----------|
| store/index.js | Needs tests | High |
| api/catalogApi.js | Has tests | Complete |
| slices/filtersSlice.js | Has tests | Complete |
| slices/baseFilters.slice.js | Covered by filtersSlice | Complete |
| slices/navigationFilters.slice.js | Covered by filtersSlice | Complete |
| slices/filterSelectors.js | Needs tests | Medium |
| middleware/urlSyncMiddleware.js | Has tests | Complete |
| middleware/performanceMonitoring.js | Has tests | Complete |
| filters/filterRegistry.js | Has tests | Complete |
| filters/filterValidator.js | Has tests | Complete |

### Functional Requirements - Phase 2D: Theme

- **FR-041**: Each theme file MUST have tests validating configuration exports
- **FR-042**: Theme tests MUST verify color palettes and typography scales

**Theme files requiring tests:**
| Theme File | Current Status | Priority |
|------------|---------------|----------|
| theme.js | Needs tests | Medium |
| colorTheme.js | Needs tests | Medium |
| typographyTheme.js | Needs tests | Low |
| liftKitTheme.js | Needs tests | Low |
| testTheme.js | N/A (test file) | Skip |

### Functional Requirements - Phase 2E: Root Level

- **FR-043**: App.js MUST have tests validating routing and provider setup
- **FR-044**: Config exports MUST have validation tests

**Root level files requiring tests:**
| File | Current Status | Priority |
|------|---------------|----------|
| App.js | Has App.test.js | Needs improvement |
| config.js | Needs tests | Medium |
| index.js | N/A (entry point) | Skip |
| setupTests.js | N/A (config) | Skip |
| reportWebVitals.js | Needs tests | Low |

---

## Success Criteria *(mandatory)*

### Phase 2 Completion Targets

| Module | Target Coverage | Priority |
|--------|----------------|----------|
| High-priority Components | 80% | Phase 2A |
| Pages | 80% | Phase 2B |
| Store/Redux | 90% | Phase 2C |
| Theme | 70% | Phase 2D |
| Root Level | 70% | Phase 2E |

### Overall Frontend Coverage Target
- **Current**: ~8% (after Phase 1 foundational work)
- **Phase 2 Target**: 60% overall frontend coverage
- **Future Target**: 80% overall frontend coverage

---

## Scope *(mandatory)*

### In Scope (Phase 2)
- Test files for high-priority components (~40 files)
- Test files for all 4 page files
- Enhanced Redux store tests (2 files)
- Test files for 4 theme files
- Improved root-level tests (2 files)

### Out of Scope
- Styleguide components (documentation only)
- Sandbox/test page components (development tools)
- Demo components in Test/ folder
- End-to-end tests
- Visual regression tests
- Performance tests

### Explicitly Excluded Components
- `styleguide/*` - Visual documentation only
- `sandbox/*` - Development testing tools
- `Test/*Demo.js` - Feature demonstration components

---

## Dependencies

1. **Phase 1 Completion**: Services, hooks, contexts, utils tests complete
2. **Existing Test Infrastructure**: Jest and React Testing Library configured
3. **Mock Utilities**: Test helpers for Redux store and Router mocking
4. **Coverage Tools**: Jest coverage reporting configured

---

## Review & Acceptance Checklist

### Content Quality
- [x] No implementation details - focuses on test organization and coverage goals
- [x] Focused on user value - enables developer productivity and code quality
- [x] Written for non-technical stakeholders - uses plain language
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable (80% coverage targets)
- [x] Scope is clearly bounded (Phase 2 modules only)
- [x] Dependencies identified

---

## Execution Status

- [x] User description parsed - Extend to Phase 2 modules
- [x] Key concepts extracted - Components, Pages, Store, Theme
- [x] Ambiguities marked - None
- [x] User scenarios defined - 5 scenarios covering Phase 2 testing
- [x] Requirements generated - 24 requirements (FR-021 through FR-044)
- [x] Entities identified - 120+ source files across 5 module types
- [x] Review checklist passed - All quality criteria met

---
