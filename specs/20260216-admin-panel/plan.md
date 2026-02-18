# Implementation Plan: Admin Panel

**Branch**: `20260216-admin-panel` | **Date**: 2026-02-16 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/20260216-admin-panel/spec.md`

## Summary

Create a comprehensive admin panel in the React frontend replacing the current 3-item dropdown menu with a full-width MegaMenuPopover organized into two rows of categorized admin links (Catalog, Store, Filtering [disabled], User, Tutorials [disabled], Marking [disabled], Orders [disabled]). Implement CRUD admin pages for catalog entities (exam sessions, subjects, exam session subjects, products, variations, bundles), store entities (products, recommendations, prices, bundles), and user entities (profiles, addresses, contacts, emails, staff). Follow existing List/Form/Detail component patterns with service layer for API communication.

## Technical Context

**Language/Version**: JavaScript ES2022, React 19.2
**Primary Dependencies**: Material-UI v7, React Router v6, Axios, React Testing Library
**Storage**: N/A (frontend only; consumes REST API via httpService/Axios)
**Testing**: Jest + React Testing Library
**Target Platform**: Web SPA (modern browsers)
**Project Type**: Web application (frontend portion only)
**Performance Goals**: CRUD operations complete with feedback within 3 seconds (SC-002/SC-003)
**Constraints**: Superuser-only access (isSuperuser from useAuth hook), consistent admin page pattern (FR-040/041)
**Scale/Scope**: ~15 admin page groups (~45 components total: List + Form + tests per entity)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Test-Driven Development | PASS | All new components get tests first. Min 80% coverage. |
| II. Modular Architecture | PASS | Each admin entity in own directory under `components/admin/`. Services isolated per entity. Functional components with hooks. |
| III. Security First | PASS | `isSuperuser` gating on frontend. Backend enforces `IsSuperUser` permission. No secrets in frontend. |
| IV. Performance Optimization | PASS | Pagination for large datasets (default 20). No new heavy computation. |
| V. Code Quality & Conventions | PASS | PascalCase components, camelCase props. MUI components. Consistent patterns. |

**Post-Phase 1 re-check**: PASS. No violations detected. The design follows all existing patterns without introducing new architectural complexity.

## Project Structure

### Documentation (this feature)

```text
specs/20260216-admin-panel/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0: Decisions and research findings
├── data-model.md        # Phase 1: Frontend entity shapes
├── quickstart.md        # Phase 1: Getting started guide
├── contracts/           # Phase 1: API and route contracts
│   └── frontend-services.md
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
frontend/react-Admin3/src/
├── components/
│   ├── Navigation/
│   │   ├── NavigationMenu.js          # MODIFY: Replace Admin <Menu> with <MegaMenuPopover>
│   │   └── MegaMenuPopover.js         # READ ONLY: Existing reusable component
│   └── admin/
│       ├── exam-sessions/             # EXISTS: ExamSessionList, ExamSessionForm, tests
│       ├── subjects/                  # EXISTS: SubjectList, SubjectForm, SubjectDetail, SubjectImport, tests
│       ├── products/                  # EXISTS: ProductList, ProductForm, ProductDetail, ProductImport, tests
│       ├── exam-session-subjects/     # NEW: ExamSessionSubjectList, ExamSessionSubjectForm, tests
│       ├── product-variations/        # NEW: ProductVariationList, ProductVariationForm, tests
│       ├── product-bundles/           # NEW: ProductBundleList, ProductBundleForm, tests
│       ├── store-products/            # NEW: StoreProductList, StoreProductForm, tests
│       ├── recommendations/           # NEW: RecommendationList, RecommendationForm, tests
│       ├── prices/                    # NEW: PriceList, PriceForm, tests
│       ├── store-bundles/             # NEW: StoreBundleList, StoreBundleForm, tests
│       ├── user-profiles/             # NEW: UserProfileList, UserProfileForm, tests
│       └── staff/                     # NEW: StaffList, StaffForm, tests
├── services/
│   ├── examSessionService.js          # EXISTS: No changes needed
│   ├── subjectService.js              # EXISTS: No changes needed
│   ├── productService.js              # EXISTS: No changes needed (catalog products)
│   ├── examSessionSubjectService.js   # NEW
│   ├── productVariationService.js     # NEW
│   ├── productProductVariationService.js # NEW
│   ├── catalogBundleService.js        # NEW
│   ├── catalogBundleProductService.js # NEW
│   ├── recommendationService.js       # NEW
│   ├── storeProductService.js         # NEW
│   ├── priceService.js                # NEW
│   ├── storeBundleService.js          # NEW
│   ├── storeBundleProductService.js   # NEW
│   ├── userProfileService.js          # NEW
│   └── staffService.js                # NEW
├── hooks/
│   └── useAuth.js                     # READ ONLY: Provides isSuperuser
└── App.js                             # MODIFY: Add new admin routes
```

**Structure Decision**: Frontend-only changes following the existing web application structure. All new admin components live under `components/admin/{entity}/` following the established convention. Services follow the existing httpService + config URL pattern.

## Design Decisions

### D1: Component Pattern — Standalone per Entity

Each admin entity gets its own directory with List + Form components (and optional Detail). No shared abstract base component. This matches the existing exam-sessions/subjects/products pattern.

**Why**: Constitution principle V says "prefer simplicity". Consistency (FR-040/041) is achieved by following the same implementation pattern, not by abstracting it.

### D2: MegaMenu — Reuse MegaMenuPopover

Replace the 3-item `<Menu>` dropdown with `<MegaMenuPopover>` + `<Grid>` children organized in two rows. Disabled categories rendered with reduced opacity and disabled pointer events.

**Why**: MegaMenuPopover is already used 4 times in NavigationMenu.js. Reusing it ensures visual consistency and accessibility.

### D3: Service Layer — Compose from Existing Config

New services compose API URLs from existing config entries (`config.catalogUrl`, `config.apiBaseUrl`) rather than adding new environment variables.

**Why**: Minimizes env file changes. All new catalog endpoints share `/api/catalog/` prefix. Store endpoints share `/api/store/` prefix.

### D4: Route Protection — Page-Level isSuperuser Check

Each admin page component checks `isSuperuser` from `useAuth()` and redirects non-superusers. No route guard wrapper.

**Why**: Matches existing pattern. Backend also enforces authorization.

### D5: User Sub-Resources — Nested Under Profile

User addresses, contacts, and emails are accessed via the UserProfile list/detail pages rather than as independent top-level pages, since they're always viewed in context of a user profile.

**Why**: Domain modeling - these sub-resources are meaningless without their parent profile.

## Backend Dependencies

The following backend API endpoints do NOT currently exist and must be created before the corresponding frontend pages can function with real data:

| Priority | Entity | Endpoint | Notes |
|----------|--------|----------|-------|
| P3 | ExamSessionSubject | `/api/catalog/exam-session-subjects/` | Full CRUD |
| P3 | ProductVariation | `/api/catalog/product-variations/` | Full CRUD |
| P3 | ProductProductVariation | `/api/catalog/product-product-variations/` | Full CRUD |
| P3 | CatalogBundle | `/api/catalog/product-bundles/` | Full CRUD (currently read-only) |
| P3 | CatalogBundleProduct | `/api/catalog/bundle-products/` | Full CRUD |
| P4 | Recommendation | `/api/catalog/recommendations/` | Full CRUD |
| P4 | StoreProduct | `/api/store/products/` | Add CUD (read exists) |
| P4 | Price | `/api/store/prices/` | Add CUD (read exists) |
| P4 | StoreBundle | `/api/store/bundles/` | Add CUD (read exists) |
| P4 | StoreBundleProduct | `/api/store/bundle-products/` | Full CRUD |
| P5 | UserProfile | `/api/users/profiles/` | List + Edit |
| P5 | UserProfile sub-resources | `/api/users/profiles/{id}/addresses/` etc. | List + Edit |
| P5 | Staff | `/api/users/staff/` | Full CRUD |

Frontend development can proceed with mock data or stubbed services while backend endpoints are built.

## Complexity Tracking

> No constitution violations detected. No complexity justifications needed.
