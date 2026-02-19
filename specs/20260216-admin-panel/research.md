# Research: Admin Panel

**Branch**: `20260216-admin-panel` | **Date**: 2026-02-16

## R1: Admin Component Pattern

**Decision**: Follow the existing List/Form/Detail pattern used by exam-sessions, subjects, and products admin pages.

**Rationale**: The codebase already has a proven pattern with 3 working admin modules. Each module has:
- `{Entity}List.js` - Table with CRUD buttons, loading/error states
- `{Entity}Form.js` - Create/Edit form using `useParams` to detect mode
- `{Entity}Detail.js` - Read-only view with Edit/Delete buttons
- `{entity}Service.js` - Axios service with getAll, getById, create, update, delete

Reusing this pattern minimizes risk, maintains consistency (FR-040/041), and leverages tested code.

**Alternatives considered**:
- Generic/abstract admin components: Rejected because existing pages are standalone and the codebase convention avoids premature abstraction.
- RTK Query for admin pages: Rejected because existing admin pages use simple service + useState pattern, and RTK Query is reserved for the product filter system.

## R2: MegaMenu Implementation

**Decision**: Replace the existing MUI `<Menu>` dropdown (NavigationMenu.js lines 667-722) with the existing `MegaMenuPopover` component, using MUI `Grid` for two-row layout.

**Rationale**: `MegaMenuPopover` is already used 4 times in NavigationMenu.js (Subjects, Products, Distance Learning, Tutorials) with full accessibility support. The component accepts `children` and renders them in a full-width popover. Using the same component ensures visual and behavioral consistency.

**Implementation approach**:
- Replace `<Menu>` + `<MenuItem>` with `<MegaMenuPopover>` + `<Grid>` children
- Row 1: Catalog, Store, Filtering (disabled), User
- Row 2: Tutorials (disabled), Marking (disabled), Orders (disabled)
- Disabled categories render with `sx={{ opacity: 0.5, pointerEvents: 'none' }}`

**Alternatives considered**:
- New custom admin menu component: Rejected because MegaMenuPopover already exists and works.
- Sidebar navigation: Rejected because the spec explicitly requires MegaMenuPopover.

## R3: Backend API Endpoint Availability

**Decision**: Frontend services will target expected API endpoints. Some endpoints need backend creation (documented as dependencies).

**Rationale**: The spec states "Backend API creation — this spec covers frontend only; backend endpoints are assumed to exist or will be specified separately."

**Existing endpoints (ready to use)**:

| Entity | Endpoint | CRUD Status |
|--------|----------|-------------|
| Exam Sessions | `/api/catalog/exam-sessions/` | Full CRUD |
| Subjects | `/api/catalog/subjects/` | Full CRUD + bulk-import |
| Catalog Products | `/api/catalog/products/` | Full CRUD + bulk-import |

**Endpoints needing backend work** (frontend will target these paths):

| Entity | Expected Endpoint | Operations Needed |
|--------|-------------------|-------------------|
| Exam Session Subjects | `/api/catalog/exam-session-subjects/` | Full CRUD |
| Product Variations | `/api/catalog/product-variations/` | Full CRUD |
| Product-Product-Variations | `/api/catalog/product-product-variations/` | Full CRUD |
| Catalog Product Bundles | `/api/catalog/product-bundles/` | Full CRUD |
| Catalog Bundle Products | `/api/catalog/bundle-products/` | Full CRUD |
| Recommendations | `/api/catalog/recommendations/` | Full CRUD |
| Store Products | `/api/store/products/` | Add CUD (list/retrieve exists) |
| Prices | `/api/store/prices/` | Add CUD (list/retrieve exists) |
| Store Bundles | `/api/store/bundles/` | Add CUD (list/retrieve exists) |
| Store Bundle Products | `/api/store/bundle-products/` | Full CRUD |
| User Profiles | `/api/users/profiles/` | List + Edit |
| User Addresses | `/api/users/profiles/{id}/addresses/` | List + Edit |
| User Contact Numbers | `/api/users/profiles/{id}/contacts/` | List + Edit |
| User Emails | `/api/users/profiles/{id}/emails/` | List + Edit |
| Staff | `/api/users/staff/` | Full CRUD |

## R4: Config URL Pattern

**Decision**: Add new URL config entries to `config.js` and `.env` files for new API endpoints that don't map to existing config URLs.

**Rationale**: The existing pattern uses `config.{entityUrl}` resolved from environment variables. New services can compose URLs from `config.catalogUrl` (`/api/catalog`) and `config.apiBaseUrl` for store/user endpoints.

**Approach**: New services will compose URLs from existing config entries:
- Catalog entities: `${config.catalogUrl}/exam-session-subjects/`
- Store entities: `${config.apiBaseUrl}/api/store/products/`
- User entities: `${config.userUrl}/profiles/`

This avoids adding many new env vars for straightforward path extensions.

## R5: Admin Route Protection

**Decision**: Frontend routes rely on the existing `isSuperuser` check from `useAuth()`. No new route guard component is needed for the initial implementation.

**Rationale**: The current admin pages rely on `isSuperuser` to show/hide the Admin menu, and the backend enforces `IsSuperUser` permission on API endpoints. Edge case FR-044 (direct URL access by non-superusers) can be handled by checking `isSuperuser` in each page component and redirecting if false.

**Alternatives considered**:
- Route guard wrapper component: Could be added later for DRY, but current codebase doesn't use one.
- React Router `loader` auth checks: Rejected to stay consistent with existing patterns.

## R6: Disabled Menu Items

**Decision**: Disabled menu categories render as grey text with `opacity: 0.5` and `pointerEvents: 'none'`. No routes or components are created for disabled items.

**Rationale**: The spec says "Disabled links are visually dimmed and non-clickable, indicating future functionality" and disabled items are explicitly out of scope. Creating placeholder routes would add unnecessary code.
