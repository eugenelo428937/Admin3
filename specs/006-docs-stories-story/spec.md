# Feature Specification: Display Navbar Filters in FilterPanel and ActiveFilters (Stories 1.7-1.8)

**Feature Branch**: `006-docs-stories-story`
**Created**: 2025-10-19
**Status**: Draft
**Input**: User description: "@docs/stories/story-1.7-display-navbar-filters-filterpanel.md to @docs/stories/story-1.8-display-navbar-filters-activefilters.md"

## Execution Flow (main)
```
1. Parse user description from Input
   → Stories 1.7 and 1.8 from filtering refactoring epic
2. Extract key concepts from description
   → Actors: Users browsing products
   → Actions: View filters, toggle filters, remove filters
   → Data: Navbar filters (tutorial_format, distance_learning, tutorial)
   → Constraints: Must match existing UI patterns, maintain performance
3. For each unclear aspect:
   → ✅ No clarifications needed - stories are detailed
4. Fill User Scenarios & Testing section
   → User flow: Apply navbar filter → See in FilterPanel → See as chip → Remove via chip
5. Generate Functional Requirements
   → FR-001 through FR-012 covering visibility, interaction, removal
6. Identify Key Entities
   → Navbar filters: tutorial_format, distance_learning, tutorial
7. Run Review Checklist
   → ✅ No implementation details in requirements
   → ✅ All requirements testable
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

---

## User Scenarios & Testing

### Primary User Story

**As a user shopping for educational products**, I want to see ALL active filters including those from the navigation menu (tutorial format, distance learning, tutorial products) displayed in both the filter panel sidebar and as removable chips at the top of the product listing, so that I can:

1. Understand what filters are currently limiting my product search results
2. Toggle navbar filters on/off through checkboxes in the filter panel
3. Quickly remove any filter (including navbar filters) by clicking the × on its chip
4. Clear all filters at once using the "Clear All" button

### Acceptance Scenarios

1. **Given** I am on the products page with no filters applied, **When** I select "Online" from the Tutorial Format section in the filter panel, **Then**
   - The "Online" option shows as checked in the filter panel
   - A chip labeled "Tutorial Format: Online" appears in the active filters chip bar
   - The product listing updates to show only online tutorial products
   - The URL updates to include `tutorial_format=online`

2. **Given** I have applied "Distance Learning" filter via checkbox in filter panel, **When** I click the × on the "Distance Learning" chip, **Then**
   - The chip disappears from the chip bar
   - The checkbox in the filter panel unchecks
   - The product listing refreshes to include non-distance-learning products
   - The URL parameter `distance_learning=1` is removed

3. **Given** I have multiple filters active including navbar filters (Subject: CB1, Tutorial Format: Online, Distance Learning), **When** I click "Clear All Filters", **Then**
   - All chips disappear simultaneously (including navbar filter chips)
   - All filter panel checkboxes/radios uncheck
   - Product listing shows all available products
   - URL resets to `/products` with no query parameters

4. **Given** I am viewing products with "Tutorial Products" filter active, **When** I bookmark the URL or share it with a colleague, **Then**
   - The bookmarked/shared URL includes `tutorial=1` parameter
   - When the URL is opened, the "Tutorial Products" checkbox is checked in the filter panel
   - A "Tutorial Products" chip appears in the chip bar
   - Only tutorial products are displayed

5. **Given** I am on a mobile device, **When** I open the filter panel drawer and toggle navbar filters, **Then**
   - Filter panel drawer opens smoothly
   - Navbar filter sections are visible and functional
   - Checkboxes have adequate touch targets (44×44px minimum)
   - Chips wrap to multiple rows on narrow screens
   - Delete icons on chips are easily tappable

### Edge Cases

- **What happens when multiple navbar filters are active simultaneously?**
  - All active navbar filter chips display in the chip bar
  - Chips may wrap to multiple rows if screen width is limited
  - Each chip can be independently removed
  - All navbar filters are considered in the AND logic for product filtering

- **How does the system handle invalid filter values from URL?**
  - Invalid `tutorial_format` values (not 'online', 'in_person', 'hybrid') are ignored
  - Invalid boolean values for `distance_learning` and `tutorial` default to false
  - User sees no active chip for invalid filters
  - Product listing behaves as if invalid filter doesn't exist

- **What happens when navbar filters are toggled rapidly?**
  - Each toggle triggers state update immediately
  - URL updates are debounced to prevent history pollution
  - API calls are debounced (250ms) to prevent server overload
  - UI remains responsive with smooth transitions

- **How does Clear All interact with search query?**
  - "Clear All Filters" button clears navbar filters AND search query
  - All chips disappear (both filter chips and search chip if present)
  - User returns to viewing all products unfiltered

---

## Requirements

### Functional Requirements

**FR-001**: System MUST display Tutorial Format filter section in the filter panel sidebar
- Section titled "Tutorial Format"
- Radio button options: "Online", "In-Person", "Hybrid"
- Collapsible accordion section matching existing filter section styling
- Positioned logically near top of filter list (after Subjects section)

**FR-002**: System MUST display Distance Learning filter section in the filter panel sidebar
- Section titled "Distance Learning"
- Single checkbox option: "Distance Learning Only"
- Collapsible accordion section matching existing filter section styling
- Helper text explaining: "Show only products available through distance learning"

**FR-003**: System MUST display Tutorial Products filter section in the filter panel sidebar
- Section titled "Tutorial"
- Single checkbox option: "Tutorial Products Only"
- Collapsible accordion section matching existing filter section styling
- Helper text explaining: "Show only tutorial products"

**FR-004**: System MUST display active navbar filters as removable chips in the chip bar
- Tutorial Format chip shows when selected (e.g., "Tutorial Format: Online")
- Distance Learning chip shows when checkbox checked (label: "Distance Learning")
- Tutorial Products chip shows when checkbox checked (label: "Tutorial Products")
- Each chip displays delete icon (×) for removal
- Chips styled consistently with existing filter chips (same height, padding, colors)

**FR-005**: Users MUST be able to toggle navbar filters via filter panel checkboxes/radios
- Clicking checkbox/radio immediately updates filter state
- Visual feedback shows selected state (checked/unchecked)
- No "Apply" button required (immediate effect)
- Filter changes trigger product listing refresh after brief debounce

**FR-006**: Users MUST be able to remove navbar filters by clicking chip delete icon
- Clicking × on Tutorial Format chip clears tutorial format selection
- Clicking × on Distance Learning chip unchecks distance learning filter
- Clicking × on Tutorial Products chip unchecks tutorial products filter
- Chip disappears immediately
- Product listing refreshes with filter removed

**FR-007**: System MUST integrate navbar filter changes with URL synchronization
- Selecting navbar filter adds query parameter to URL (e.g., `?tutorial_format=online`)
- Removing navbar filter removes query parameter from URL
- URL remains shareable (opening URL restores filter state)
- Browser back/forward buttons work correctly with navbar filters

**FR-008**: System MUST include navbar filters in product search API calls
- API payload includes tutorial_format value when selected
- API payload includes distance_learning boolean when checked
- API payload includes tutorial boolean when checked
- Backend filters products based on navbar filter criteria

**FR-009**: "Clear All Filters" button MUST clear navbar filters along with existing filters
- Single click clears all filter types simultaneously
- All chips disappear (existing filters + navbar filters)
- All filter panel checkboxes/radios reset to unchecked state
- URL resets to base path `/products`
- Product listing shows all available products

**FR-010**: Navbar filter sections MUST be accessible via keyboard navigation
- Tab key moves focus between filter sections
- Enter/Space key toggles checkboxes and radio buttons
- Filter panel sections expandable/collapsible via keyboard
- Focus indicators clearly visible on all interactive elements

**FR-011**: Navbar filter chips and sections MUST work responsively on all device sizes
- Desktop: Filter panel always visible in sidebar
- Tablet: Filter panel collapsible/expandable
- Mobile: Filter panel in drawer that overlays content
- Chips wrap to multiple rows on narrow screens
- Touch targets on mobile meet 44×44px minimum size

**FR-012**: System MUST maintain existing filter functionality when navbar filters are added
- Existing filters (Subjects, Categories, Product Types, etc.) continue working unchanged
- Navbar filters combine with existing filters using AND logic
- Multiple filters from different categories can be active simultaneously
- Performance remains acceptable (no noticeable slowdown)

### Key Entities

**Navbar Filters** (data stored in browser state and URL):
- **Tutorial Format**: Single-select filter for tutorial delivery method
  - Values: 'online', 'in_person', 'hybrid', or null (not selected)
  - Display labels: "Online", "In-Person", "Hybrid"
  - Default: null (no tutorial format filter applied)

- **Distance Learning**: Boolean filter for distance learning availability
  - Values: true (only distance learning products) or false (all products)
  - Display label: "Distance Learning Only"
  - Default: false

- **Tutorial Products**: Boolean filter for tutorial product type
  - Values: true (only tutorial products) or false (all products)
  - Display label: "Tutorial Products Only"
  - Default: false

**Filter Panel Sections** (UI groupings):
- Each navbar filter has dedicated collapsible section
- Sections positioned after Subjects, before Categories
- Sections use checkbox (boolean) or radio button (single-select) controls

**Active Filter Chips** (UI elements):
- Removable chip displayed for each active navbar filter
- Chip contains filter label and delete icon
- Chips positioned in chip bar alongside existing filter chips

---

## Review & Acceptance Checklist

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Scope is clearly bounded (Stories 1.7 and 1.8 only)
- [x] Dependencies identified (state from Story 1.2)

---

## Execution Status

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked (none - stories are detailed)
- [x] User scenarios defined
- [x] Requirements generated (FR-001 through FR-012)
- [x] Entities identified (navbar filters, sections, chips)
- [x] Review checklist passed

---

## Additional Context

### Dependencies
- **Story 1.2**: Navbar filters must already exist in state (tutorial_format, distance_learning, tutorial)
- **Story 1.2**: Actions for navbar filters must be implemented (setTutorialFormat, toggleDistanceLearning, setTutorial)
- **Story 1.1**: URL synchronization middleware must be functional

### Related User Stories
- **Story 1.7**: Display Navbar Filters in FilterPanel (filter panel sidebar implementation)
- **Story 1.8**: Display Navbar Filters in ActiveFilters (chip bar implementation)
- Both stories address the same user problem: making hidden navbar filters visible and manageable

### User Impact
Resolves critical usability issue where users could not see or clear navigation menu filters:
> "There are hidden filters like specific product selected from the nav bar that cannot be cleared." - User Report

Users gain transparency into what filters are affecting their product search results and simple one-click removal of any unwanted filters.
