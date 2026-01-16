# Product Filtering State Management Refactoring - Brownfield Enhancement PRD

**Version:** 1.0
**Date:** 2025-01-19
**Status:** Draft
**Author:** John (PM Agent)
**Related:** This PRD addresses FR0 from the main PRD (Complete Product Filtering System Redesign)

---

## Table of Contents

1. [Intro Project Analysis and Context](#1-intro-project-analysis-and-context)
2. [Requirements](#2-requirements)
3. [User Interface Enhancement Goals](#3-user-interface-enhancement-goals)
4. [Technical Constraints and Integration Requirements](#4-technical-constraints-and-integration-requirements)
5. [Epic and Story Structure](#5-epic-and-story-structure)

---

## 1. Intro Project Analysis and Context

### Scope Assessment

✅ **This enhancement requires full PRD process** because:
- **Complexity**: 4-week implementation across 4 phases
- **Architectural Impact**: Major refactoring of state management architecture
- **Multiple Stories**: Requires 18 coordinated stories based on the phased approach
- **High Risk**: Critical user-facing functionality with race conditions

This is NOT a simple epic-level task.

### 1.1 Existing Project Overview

#### Analysis Source
- ✅ **IDE-based analysis** with comprehensive code review document provided
- ✅ **Code review document**: `specs/filtering-code-review.md` (1,770 lines)
- ✅ **Project context**: Working in loaded Admin3 Django/React codebase

#### Current Project State

**Admin3 - Online Store for Actuarial Education**

**Backend**: Django 5.1 REST API with PostgreSQL, JWT authentication, modular app structure
**Frontend**: React 18 with Material-UI, Axios, React Router, Context API

**Current Filtering System (Problem Area)**:
- **Product filtering, navigation, and search** functionality across frontend
- **Redux-based filter management** in `filtersSlice.js` (459 lines)
- **URL query parameter** handling for shareable links
- **Navigation integration** for product browsing (MainNavBar, FilterPanel)
- **Search functionality** with fuzzy search capabilities

**Critical Issues Identified**:
1. **Triple State Management**: Redux store, URL parameters, local component state all managing filters independently
2. **Unidirectional Sync**: URL → Redux works, but Redux → URL is missing
3. **Hidden Filters**: Navbar filters bypass Redux entirely, invisible to users
4. **Race Conditions**: Navigation clicks trigger competing state updates
5. **Incomplete Operations**: "Clear All" doesn't clear URL parameters

### 1.2 Available Documentation Analysis

**✅ Available Documentation** (from project):
- ✅ **Tech Stack Documentation** (CLAUDE.md comprehensive)
- ✅ **Source Tree/Architecture** (inferred from code review)
- ✅ **Coding Standards** (Django/React patterns documented)
- ✅ **API Documentation** (REST API endpoints documented)
- ✅ **Technical Debt Documentation** (Code review identifies architectural issues)
- ✅ **Comprehensive Code Review** (1,770 lines with root cause analysis)

**📊 Documentation Quality**: Excellent - code review provides extensive analysis

### 1.3 Enhancement Scope Definition

#### Enhancement Type
- ✅ **Major Feature Modification** (refactoring existing filtering system)
- ✅ **Performance/Scalability Improvements** (eliminating race conditions)
- ✅ **Bug Fix and Stability Improvements** (resolving 5 critical user issues)

#### Enhancement Description

Refactor the product filtering, navigation, and search system to establish **Redux as the Single Source of Truth** with automated bidirectional URL synchronization. This eliminates triple state management (Redux/URL/local state) that causes filter interference, hidden filters, incomplete clear operations, and navigation race conditions.

#### Impact Assessment
- ✅ **Major Impact** - Architectural changes required
  - Affects 10+ files across filtering, navigation, and search
  - Requires new middleware for Redux ↔ URL synchronization
  - Restructures state management architecture
  - High risk to existing user workflows

### 1.4 Goals and Background Context

#### Goals
- Establish Redux as Single Source of Truth for all filter state
- Implement bidirectional Redux ↔ URL synchronization via middleware
- Consolidate navbar filters into Redux (eliminate hidden filters)
- Fix navigation race conditions between Redux actions and URL parsing
- Enable proper "Clear All Filters" functionality
- Maintain URL shareability for filtered product views
- Improve code maintainability and reduce technical debt
- Restore reliable fuzzy search functionality

#### Background Context

The filtering system has evolved into a state management nightmare with three competing systems (Redux, URL parameters, local component state) operating independently without proper synchronization. This architectural flaw manifests as five critical user-facing bugs:

1. Navigation clicks don't update product lists
2. Filter panel and URL parameters interfere with each other
3. Hidden filters can't be cleared
4. "Clear All" button doesn't clear URL query strings
5. Fuzzy search behaves unreliably

The root cause is violation of the Single Source of Truth (SSOT) principle, where filter state exists in multiple locations with only partial, unidirectional synchronization (URL → Redux). This creates race conditions, hidden state, and inconsistent behavior that severely impacts user experience and developer productivity.

The code review document provides comprehensive analysis with 4-phase refactoring strategy spanning 4 weeks, addressing Priority 0 (critical fixes), Priority 1 (cleanup), Priority 2 (architecture), and Priority 3 (enhancements).

### 1.5 Change Log

| Change | Date | Version | Description | Author |
|--------|------|---------|-------------|--------|
| Initial PRD | 2025-01-19 | 1.0 | Created brownfield PRD from code review analysis | John (PM Agent) |

---

## 2. Requirements

### 2.1 Functional Requirements

**FR1**: The system shall establish Redux as the Single Source of Truth for all filter state, eliminating competing state management in URL parameters and local component state.

**FR2**: The system shall implement bidirectional synchronization between Redux store and URL parameters via Redux middleware, ensuring any Redux filter change automatically updates the URL.

**FR3**: The system shall consolidate all navbar filters (`tutorial_format`, `distance_learning`, `tutorial`, `group`, `variation`, `product`) into the Redux store, making them visible and manageable through the FilterPanel UI.

**FR4**: The "Clear All Filters" button shall clear both Redux filter state AND URL query parameters, preventing filter reappearance after clearing.

**FR5**: Navigation click handlers (MainNavBar, NavigationMenu) shall dispatch only Redux actions, with URL updates handled automatically by middleware, eliminating race conditions.

**FR6**: The FilterPanel component shall display ALL active filters including previously hidden navbar filters, enabling users to see and remove any applied filter.

**FR7**: The ActiveFilters component shall render chips for all active filters from Redux state, including navbar filters, with individual and bulk removal capabilities.

**FR8**: The URL shall remain shareable and bookmarkable, preserving current filter state for users who share or bookmark product listing URLs.

**FR9**: Browser back/forward navigation shall correctly restore filter states by parsing URL parameters and synchronizing to Redux on page load.

**FR10**: The SearchBox component shall use Redux state for filter management instead of local component state, eliminating third state management system.

**FR11**: The system shall maintain existing product search and filtering API contracts, requiring no backend API changes.

**FR12**: All existing FilterPanel filter types (subjects, categories, product_types, products, modes_of_delivery) shall continue to function with identical user experience.

### 2.2 Non-Functional Requirements

**NFR1**: Redux → URL synchronization shall use `history.replaceState()` (not `pushState()`) to avoid polluting browser history with every filter change.

**NFR2**: The refactored system shall maintain current page load performance, with no measurable increase in initial render time (< 5ms variance).

**NFR3**: Filter changes shall trigger API calls with existing debounce timing (250ms), preventing performance degradation from synchronization overhead.

**NFR4**: The middleware implementation shall be testable in isolation with unit tests achieving ≥80% code coverage.

**NFR5**: All existing unit and integration tests for filtering functionality shall pass without modification or be updated to reflect new architecture.

**NFR6**: The refactoring shall maintain existing accessibility standards (WCAG 2.1 AA compliance) for FilterPanel and ActiveFilters components.

**NFR7**: Redux DevTools shall provide full visibility into filter state changes and middleware actions for debugging purposes.

**NFR8**: The system shall handle edge cases gracefully: empty filters, malformed URL parameters, conflicting filter combinations without throwing errors.

**NFR9**: Code changes shall follow existing project coding standards (snake_case for backend, camelCase for frontend, Material-UI component patterns).

**NFR10**: The refactored codebase shall reduce overall lines of code by removing duplicate URL parsing logic across components (target: -200 LOC).

### 2.3 Compatibility Requirements

**CR1: Existing API Compatibility** - The `/api/products/search` endpoint shall continue to receive filters in the current format (`filters` object + `navbarFilters` object), with frontend consolidating these before API call. Future API simplification is out of scope.

**CR2: Database Schema Compatibility** - No database schema changes are required or permitted for this refactoring. All changes are client-side state management only.

**CR3: UI/UX Consistency** - FilterPanel, ActiveFilters, MainNavBar, and SearchBox components shall maintain current visual design, layout, and interaction patterns. Only internal state management logic changes.

**CR4: Integration Compatibility** - The refactored system shall maintain compatibility with:
- Existing `useProductsSearch` hook consumers
- Rules engine integration for filter-based business logic
- Cookie persistence middleware (though removal is recommended as P2 cleanup)
- Product analytics tracking that monitors filter usage

**CR5: URL Parameter Format Compatibility** - Existing bookmarked URLs with current parameter format (`?subject_code=CB1&group=Materials&product=123`) shall continue to work, parsed correctly into Redux state on page load.

---

## 3. User Interface Enhancement Goals

### 3.1 Integration with Existing UI

The UI enhancements will integrate seamlessly with the existing Material-UI design system and component architecture. All changes maintain current visual patterns while making previously hidden filters visible and interactive.

**Existing UI Patterns to Preserve**:

- **FilterPanel** (left sidebar): Collapsible accordion sections with checkboxes, currently displaying subjects, categories, product_types, products, and modes_of_delivery
- **ActiveFilters** (chip display): Material-UI Chip components with delete icons, color-coded by filter type (primary, info, success)
- **MainNavBar** (top navigation): Dropdown menus with hover/click interactions for product navigation
- **SearchBox** (modal/overlay): Material-UI Autocomplete with multi-select checkboxes for filter selection

**Integration Strategy**:

1. **FilterPanel Extension**: Add new accordion sections for navbar filters (`tutorial_format`, `distance_learning`, `tutorial`) using identical Material-UI Accordion + FormControlLabel + Checkbox pattern as existing filter sections.

2. **ActiveFilters Enhancement**: Render additional chips for navbar filters using existing chip rendering logic with appropriate color variants from FILTER_CONFIG mapping.

3. **Component Consistency**: All new filter UI elements will use existing components:
   - `FilterSection` component for accordion rendering
   - `Chip` component with consistent delete handlers
   - Existing `dispatch(toggleFilter())` action pattern

4. **No New Components**: No new UI components required - all changes are additions to existing component render logic.

### 3.2 Modified/New Screens and Views

**Modified Screens** (no new screens):

1. **Product List Page** (`/products`)
   - **Component**: `FilterPanel.js`
   - **Change**: Add 3 new filter sections for navbar filters
   - **Visual Impact**: FilterPanel height may increase with additional sections
   - **Interaction**: Same checkbox toggle behavior as existing filters

2. **Product List Page** (`/products`)
   - **Component**: `ActiveFilters.js`
   - **Change**: Display additional filter chips for navbar filters when active
   - **Visual Impact**: More chips may appear in the active filters bar
   - **Interaction**: Same chip delete behavior as existing filters

3. **Main Navigation Bar** (all pages)
   - **Component**: `MainNavBar.js`
   - **Change**: No visual changes - only internal click handler logic
   - **Visual Impact**: None
   - **Interaction**: Same navigation click behavior, but improved reliability

4. **Search Modal** (triggered from any page)
   - **Component**: `SearchBox.js` within `SearchModal.js`
   - **Change**: No visual changes - internal state management migrated to Redux
   - **Visual Impact**: None
   - **Interaction**: Same search and filter selection behavior

### 3.3 UI Consistency Requirements

**UC1: Visual Consistency** - All new filter sections in FilterPanel shall use identical styling, spacing, typography, and color scheme as existing filter sections (Material-UI default theme).

**UC2: Interaction Consistency** - Navbar filter checkboxes shall behave identically to existing filter checkboxes: single-click toggle, immediate feedback, debounced API call.

**UC3: Responsive Behavior** - New filter sections shall maintain responsive design patterns for mobile, tablet, and desktop viewports matching existing FilterPanel behavior.

**UC4: Accessibility Consistency** - New filter UI elements shall maintain WCAG 2.1 AA compliance with:
- Proper ARIA labels for screen readers
- Keyboard navigation support (Tab, Space, Enter)
- Sufficient color contrast ratios
- Focus indicators matching existing components

**UC5: Loading States** - Filter interactions shall display existing loading indicators (CircularProgress, skeleton screens) with no new loading UI patterns introduced.

**UC6: Error Handling UI** - Filter errors shall display using existing Alert/Snackbar components with consistent error messaging patterns.

**UC7: Animation Consistency** - Filter panel expansions, chip additions/removals shall use existing Material-UI transition timings (Collapse, Fade) without introducing new animation behaviors.

**UC8: Empty States** - When no filters are active, the ActiveFilters component shall maintain current empty state behavior (component hidden, not showing "No filters" message).

**UC9: Clear All Button** - The existing "Clear All Filters" button shall maintain current position, styling, and visual feedback, with only internal logic changes to clear URL parameters.

---

## 4. Technical Constraints and Integration Requirements

### 4.1 Existing Technology Stack

**Languages**:
- Backend: Python 3.14+
- Frontend: JavaScript (ES6+), JSX

**Frameworks**:
- Backend: Django 5.1, Django REST Framework
- Frontend: React 18.x (functional components with hooks)
- State Management: Redux Toolkit (RTK), React Redux
- UI Library: Material-UI v5 (MUI)

**Database**:
- PostgreSQL (ACTEDDBDEV01)
- No schema changes required for this refactoring

**Infrastructure**:
- Development: Windows with PowerShell, Django dev server (port 8888), React dev server (port 3000)
- Version Control: Git
- Environment Management: Python virtual environment (`.venv`), npm for frontend

**External Dependencies**:
- React Router v6 (navigation)
- Axios (HTTP client)
- Redux Toolkit Query (API caching, 5-minute cache duration)
- Material-UI Icons

**Key Constraints**:
- Frontend-only refactoring (no backend API changes)
- Must work with existing RTK Query setup and cache invalidation
- Must integrate with existing Redux store configuration
- Must respect existing middleware chain (cookie persistence currently active)

### 4.2 Integration Approach

#### Database Integration Strategy
**N/A** - No database changes required. All state management is client-side only.

#### API Integration Strategy

**Current API Contract** (maintained):
```javascript
// useProductsSearch.js - Current API call format
const searchParams = {
    filters: {
        subjects: [],
        categories: [],
        product_types: [],
        products: [],
        modes_of_delivery: [],
        searchQuery: ''
    },
    navbarFilters: {
        tutorial_format: '',
        distance_learning: '',
        tutorial: '',
        group: '',
        variation: '',
        product: ''
    },
    pagination: { page: 1, page_size: 20 }
};
```

**Integration Strategy**:
1. **Consolidate Before API Call**: Frontend will merge navbar filters into main filters object internally within Redux, then split back to current format for API compatibility
2. **No Backend Changes**: Backend API endpoints (`/api/products/search`) remain unchanged
3. **RTK Query Integration**: Existing `useProductsSearch` hook will continue using RTK Query with current cache invalidation logic
4. **Debouncing Maintained**: 250ms debounce timing preserved in search hook

#### Frontend Integration Strategy

**Redux Store Integration**:
1. **Middleware Addition**: New `urlSyncMiddleware` added to Redux store configuration in `store.js`
2. **Middleware Ordering**:
   ```javascript
   // store.js
   middleware: (getDefaultMiddleware) =>
     getDefaultMiddleware()
       .concat(api.middleware)      // RTK Query (existing)
       .concat(cookieMiddleware)    // Cookie persistence (existing, Phase 2 removal)
       .concat(urlSyncMiddleware),  // NEW: URL sync (Phase 1)
   ```
3. **FiltersSlice Extension**: Add navbar filter fields to existing `filtersSlice.js` state without breaking existing selectors

**Component Integration**:
1. **ProductList.js**: Remove URL parsing logic (lines 89-169), rely on middleware for sync
2. **MainNavBar.js**: Remove manual `navigate()` calls from click handlers, dispatch Redux actions only
3. **FilterPanel.js**: Add new filter sections using existing `renderFilterSection` pattern
4. **ActiveFilters.js**: Extend `FILTER_CONFIG` mapping to include navbar filters
5. **SearchBox.js**: Replace local `useState` with Redux `useSelector` and `useDispatch`

**React Router Integration**:
- Middleware uses `window.history.replaceState()` for URL updates (no Router hooks needed in middleware)
- ProductList retains URL parsing on mount for bookmark/back-button support
- No changes to existing route definitions

#### Testing Integration Strategy

**Unit Testing**:
1. **New Tests Required**:
   - `urlSyncMiddleware.test.js` - Test middleware sync logic in isolation
   - `FilterUrlManager.test.js` - Test URL parameter conversion utilities (Phase 2)
   - Extended tests for `filtersSlice.test.js` - Test new navbar filter actions

2. **Updated Tests Required**:
   - `ProductList.test.js` - Update to reflect removed URL parsing logic
   - `MainNavBar.test.js` - Update to verify Redux-only dispatches
   - `FilterPanel.test.js` - Add tests for new filter sections
   - `useProductsSearch.test.js` - Update to reflect consolidated filters

**Integration Testing**:
1. Test complete flow: FilterPanel change → Redux update → URL update → API call
2. Test navigation flow: MainNavBar click → Redux update → URL update → ProductList render
3. Test clear flow: Clear All button → Redux clear → URL clear → API call with empty filters
4. Test browser navigation: Back/forward buttons correctly restore filter state

**E2E Testing** (recommended but not blocking):
1. Cypress/Playwright tests for critical user flows
2. Test scenarios from bug reports (navigation clicks, clear all, hidden filters)

---

### 4.3 Risk Assessment and Mitigation

#### Technical Risks

**Risk 1: Middleware Infinite Loop**
- **Scenario**: Middleware updates URL → triggers React Router → triggers Redux update → middleware loops
- **Probability**: Medium
- **Impact**: High (app freeze)
- **Mitigation**:
  - Middleware checks if URL already matches target (no-op if identical)
  - Use `replaceState` instead of `navigate()` to avoid router triggers
  - Add loop detection counter (bail after 5 iterations)
- **Test Coverage**: Unit test specifically for loop prevention

**Risk 2: Race Condition During Page Load**
- **Scenario**: URL parsed by ProductList → Redux update → middleware tries to sync URL → conflict
- **Probability**: Medium
- **Impact**: Medium (incorrect initial state)
- **Mitigation**:
  - Middleware detects "init from URL" action and skips sync
  - Add `fromUrlSync: true` flag to distinguish sync sources
  - ProductList URL parsing happens before middleware registration
- **Test Coverage**: Integration test for bookmark load scenario

**Risk 3: Cookie Middleware Conflict**
- **Scenario**: Cookie middleware and URL sync middleware compete for state persistence
- **Probability**: High
- **Impact**: Medium (inconsistent state between cookies and URL)
- **Mitigation**:
  - Phase 1: Cookie middleware runs before URL sync (order matters)
  - Phase 2: Remove cookie middleware entirely (planned cleanup)
- **Test Coverage**: Integration test with both middlewares enabled

---

## 5. Epic and Story Structure

### 5.1 Epic Approach

**Epic Structure Decision: SINGLE COMPREHENSIVE EPIC**

**Rationale**:
- Delivers complete solution to interrelated bugs
- Ensures architectural consistency across all changes
- Enables comprehensive regression testing of entire filtering system
- Aligns with brownfield pattern of enhancing existing system cohesively

**Epic Scope**:
- **Estimated Stories**: 18 stories across 4 phases
- **Timeline**: 4 weeks based on code review analysis
- **Risk Profile**: High impact to critical user functionality

---

## 5.2 Epic: Product Filtering State Management Refactoring

**Epic Goal**: Refactor the product filtering, navigation, and search system to establish Redux as the Single Source of Truth with bidirectional URL synchronization, eliminating race conditions, hidden filters, and incomplete clear operations that currently impact user experience.

**Integration Requirements**:
- Maintain backward compatibility with existing API contracts (`/api/products/search`)
- Preserve URL shareability and bookmark functionality
- Integrate seamlessly with existing Material-UI components and Redux store
- Ensure zero regression in existing filter functionality
- Maintain current performance characteristics (250ms debounce, 5-minute RTK Query cache)

---

### Phase 1: Critical Fixes (Priority 0) - 5 Stories

#### Story 1.1: Implement Redux-to-URL Synchronization Middleware
#### Story 1.2: Extend FiltersSlice with Navbar Filter State
#### Story 1.3: Remove Manual URL Updates from Navigation Handlers
#### Story 1.4: Consolidate Navbar Filters in useProductsSearch Hook
#### Story 1.5: Add Clear All Filters URL Reset

### Phase 2: Cleanup and Consolidation (Priority 1) - 5 Stories

#### Story 1.6: Remove URL Parsing from ProductList Component
#### Story 1.7: Display Navbar Filters in FilterPanel
#### Story 1.8: Display Navbar Filters in ActiveFilters Component
#### Story 1.9: Migrate SearchBox to Redux State Management
#### Story 1.10: Create Centralized URL Parameter Utility

### Phase 3: Architecture Improvements (Priority 2) - 5 Stories

#### Story 1.11: Implement Filter Registry Pattern
#### Story 1.12: Add Filter Validation Logic
#### Story 1.13: Remove Cookie Persistence Middleware
#### Story 1.14: Extract Long Methods from FiltersSlice
#### Story 1.15: Add Performance Monitoring for Filter Operations

### Phase 4: Enhanced Testing and Documentation (Priority 3) - 3 Stories

#### Story 1.16: Comprehensive Integration Test Suite
#### Story 1.17: End-to-End Test Suite with Cypress/Playwright
#### Story 1.18: Documentation and Knowledge Transfer

---

## Story Dependencies Diagram

```
Phase 1 (Critical Fixes):
1.1 (Middleware) ─────┬──→ 1.3 (Nav Handlers) ──┐
                      │                          ├──→ 1.5 (Clear All)
1.2 (Redux Extend) ───┼──→ 1.4 (useProductsSearch)┘
                      │         ↓
                      └──────→ 1.6 (Remove URL Parsing)

Phase 2 (Cleanup):
1.6 ──→ 1.10 (URL Utils)
1.2 ──→ 1.7 (FilterPanel) ──┐
1.2 ──→ 1.8 (ActiveFilters) ┤
1.2 ──→ 1.9 (SearchBox) ────┘

Phase 3 (Architecture):
1.7, 1.8 ──→ 1.11 (Registry) ──→ 1.12 (Validation)
1.1-1.10 ──→ 1.13 (Remove Cookies)
1.1-1.10 ──→ 1.14 (Refactor Slice)
1.1, 1.4 ──→ 1.15 (Performance)

Phase 4 (Testing/Docs):
1.1-1.15 ──→ 1.16 (Integration Tests) ──→ 1.17 (E2E Tests) ──→ 1.18 (Docs)
```

---

## Next Steps

### Immediate Actions

1. **Review and Approve PRD**: Stakeholders review this PRD for completeness and accuracy
2. **Validate Timeline**: Confirm 4-week timeline aligns with team capacity and priorities
3. **Prioritize Phases**: Confirm Phase 1 (Critical Fixes) is highest priority for immediate work
4. **Resource Allocation**: Assign developer(s) to begin Phase 1 stories

### Story Manager Handoff

**Story Manager Handoff:**

"Please develop detailed user stories for this brownfield epic. Key considerations:

- This is an enhancement to an existing system running **React 18 + Redux Toolkit + Material-UI**
- Integration points:
  - Redux store with existing filters slice
  - React Router v6 for navigation
  - RTK Query for API caching
  - Material-UI components for UI consistency
- Existing patterns to follow:
  - Redux Toolkit patterns (createSlice, middleware)
  - Material-UI Accordion + Checkbox for filter sections
  - Functional components with hooks
- Critical compatibility requirements:
  - Maintain existing API contract (`/api/products/search`)
  - Preserve URL shareability for bookmarks
  - No breaking changes to existing filter functionality
- Each story must include verification that existing functionality remains intact

The epic should maintain system integrity while delivering **Redux as Single Source of Truth for filtering with bidirectional URL synchronization**."

---

## Document Metadata

**PRD Version:** 1.0
**Created:** 2025-01-19
**Author:** John (PM Agent)
**Based On:** Code review document `specs/filtering-code-review.md`
**Next Review:** After Phase 1 implementation
**Approval Status:** Pending stakeholder review
