# Tasks: Navigation Styling Consolidation

**Input**: Design documents from `/specs/20260113-Styling-Clean-up/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Visual verification via screenshot comparison (manual checkpoint). No automated test tasks.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Frontend**: `frontend/react-Admin3/src/`
- **Theme files**: `frontend/react-Admin3/src/theme/`
- **Navigation components**: `frontend/react-Admin3/src/components/Navigation/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify existing patterns and prepare theme extension points

- [x] T001 Take baseline screenshots of navigation in current state for visual regression comparison
- [x] T002 Verify existing semantic token pattern in frontend/react-Admin3/src/theme/colors/semantic.js
- [x] T003 Verify existing MUI variant pattern in frontend/react-Admin3/src/theme/components/navigation.js

**Checkpoint**: Baseline captured, existing patterns confirmed

---

## Phase 2: Foundational (Token Definitions)

**Purpose**: Add semantic tokens that ALL variants and components will reference

**⚠️ CRITICAL**: No component migration can begin until tokens are defined

- [x] T004 Add `navigation.text.primary` token mapping to `colorTheme.offwhite['000']` in frontend/react-Admin3/src/theme/colors/semantic.js
- [x] T005 [P] Add `navigation.text.secondary` token mapping to `colorTheme.offwhite['001']` in frontend/react-Admin3/src/theme/colors/semantic.js
- [x] T006 [P] Add `navigation.text.muted` token mapping to `colorTheme.bpp.granite['040']` in frontend/react-Admin3/src/theme/colors/semantic.js
- [x] T007 [P] Add `navigation.border.subtle` token mapping to `colorTheme.bpp.granite['020']` in frontend/react-Admin3/src/theme/colors/semantic.js
- [x] T008 [P] Add `navigation.border.divider` token mapping to `colorTheme.bpp.granite['030']` in frontend/react-Admin3/src/theme/colors/semantic.js
- [x] T009 [P] Add `navigation.background.hover` token mapping to `colorTheme.bpp.granite['070']` in frontend/react-Admin3/src/theme/colors/semantic.js
- [x] T010 [P] Add `navigation.background.active` token mapping to `colorTheme.bpp.granite['080']` in frontend/react-Admin3/src/theme/colors/semantic.js
- [x] T011 [P] Add `navigation.button.color` token mapping to `colorTheme.offwhite['000']` in frontend/react-Admin3/src/theme/colors/semantic.js
- [x] T012 [P] Add `navigation.button.hoverColor` token mapping to `colorTheme.bpp.purple['110']` in frontend/react-Admin3/src/theme/colors/semantic.js
- [x] T013 Verify all 9 navigation tokens are accessible via `theme.palette.semantic.navigation.*`

**Checkpoint**: All semantic tokens defined and accessible - variant definition can begin

---

## Phase 3: User Story 1 - Developer Modifies Navigation Colors (Priority: P1) 🎯 MVP

**Goal**: Centralize all navigation colors via semantic tokens so changing one value updates all components

**Independent Test**: Change `navigation.text.primary` token value and verify all navigation text updates without modifying component files

### Implementation for User Story 1

#### Add MUI Variants (reference semantic tokens)

- [x] T014 [US1] Add `navPrimary` Button variant in frontend/react-Admin3/src/theme/components/navigation.js using `semanticColors.navigation.button.color`
- [x] T015 [P] [US1] Add `navViewAll` Button variant in frontend/react-Admin3/src/theme/components/navigation.js using `semanticColors.navigation.button.color`
- [x] T016 [P] [US1] Add `topNavAction` Button variant in frontend/react-Admin3/src/theme/components/navigation.js using `semanticColors.navigation.text.primary`
- [x] T017 [P] [US1] Add `navViewAllText` Typography variant in frontend/react-Admin3/src/theme/components/navigation.js using `semanticColors.navigation.border.subtle`
- [x] T018 [P] [US1] Add `navHeading` Typography variant in frontend/react-Admin3/src/theme/components/navigation.js

#### Migrate NavigationMenu.js

- [x] T019 [US1] Replace `color: theme.palette.offwhite?.["000"]` with `variant="navPrimary"` for menu trigger buttons in frontend/react-Admin3/src/components/Navigation/NavigationMenu.js
- [x] T020 [US1] Replace View All button inline styles with `variant="navViewAll"` in frontend/react-Admin3/src/components/Navigation/NavigationMenu.js
- [x] T021 [US1] Replace View All Typography `borderBottom` styles with `variant="navViewAllText"` in frontend/react-Admin3/src/components/Navigation/NavigationMenu.js
- [x] T022 [US1] Replace section heading inline styles with `variant="navHeading"` in frontend/react-Admin3/src/components/Navigation/NavigationMenu.js
- [x] T023 [US1] Remove `textTransform: "none"` and color fallbacks, keep only layout props (margin, flex) in frontend/react-Admin3/src/components/Navigation/NavigationMenu.js

#### Migrate TopNavBar.js

- [x] T024 [US1] Replace inline color styles with `variant="topNavAction"` for action buttons in frontend/react-Admin3/src/components/Navigation/TopNavBar.js
- [x] T025 [US1] Remove `|| "inherit"` and `|| "text.primary"` fallbacks in frontend/react-Admin3/src/components/Navigation/TopNavBar.js

#### Migrate TopNavActions.js

- [x] T026 [US1] Replace `color: theme.palette.liftkit?.light?.background` with `variant="topNavAction"` in frontend/react-Admin3/src/components/Navigation/TopNavActions.js
- [x] T027 [US1] Remove color fallbacks, keep only layout props in frontend/react-Admin3/src/components/Navigation/TopNavActions.js

#### Migrate MegaMenuPopover.js

- [x] T028 [US1] Replace hardcoded color references with semantic token references in frontend/react-Admin3/src/components/Navigation/MegaMenuPopover.js
- [x] T029 [US1] Verify all border colors use `theme.palette.semantic.navigation.border.*` tokens in frontend/react-Admin3/src/components/Navigation/MegaMenuPopover.js

#### Verification

- [x] T030 [US1] Take post-migration screenshots and compare with baseline - verify pixel-identical appearance
- [x] T031 [US1] Test: Change `navigation.text.primary` token value and verify all navigation text updates

**Checkpoint**: User Story 1 complete - all navigation colors centralized via semantic tokens

---

## Phase 4: User Story 2 - Developer Adds New Navigation Button (Priority: P2)

**Goal**: Enable adding new navigation buttons using only variant props with no inline color definitions

**Independent Test**: Add a test button using only `variant="navPrimary"` and verify it matches existing navigation styling

### Implementation for User Story 2

- [x] T032 [US2] Document variant usage examples in quickstart.md for navPrimary, navViewAll, topNavAction
- [x] T033 [US2] Verify all existing navigation buttons use variants (search for remaining inline color styles)
- [x] T034 [US2] Create code snippet examples showing before/after for each variant type

**Checkpoint**: User Story 2 complete - new buttons can be styled with variant props only

---

## Phase 5: User Story 3 - Enable Dark Mode Support (Priority: P3)

**Goal**: Demonstrate that swapping token values enables theme switching without component changes

**Independent Test**: Swap token values for dark mode equivalents and verify navigation displays correctly

### Implementation for User Story 3

- [x] T035 [US3] Add comment block in semantic.js documenting dark mode token swap pattern
- [x] T036 [US3] Test: Temporarily change token values to dark mode colors and verify navigation adapts
- [x] T037 [US3] Document dark mode enablement process in quickstart.md

**Checkpoint**: User Story 3 complete - dark mode can be enabled by changing only token values

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final cleanup and documentation

- [x] T038 [P] Remove any remaining `|| "inherit"` fallbacks across all navigation files
- [x] T039 [P] Verify no hardcoded color values remain in navigation component files (grep for theme.palette in Navigation/)
- [x] T040 Update quickstart.md with final migration checklist status
- [x] T041 Final visual regression comparison - all navigation appearances pixel-identical to baseline

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - capture baseline first
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories (tokens must exist before variants)
- **User Story 1 (Phase 3)**: Depends on Foundational - add variants then migrate components
- **User Story 2 (Phase 4)**: Depends on User Story 1 - variants must exist to document usage
- **User Story 3 (Phase 5)**: Depends on User Story 1 - tokens must be in use to test swapping
- **Polish (Phase 6)**: Depends on all user stories

### User Story Dependencies

- **User Story 1 (P1)**: Depends on Foundational (Phase 2) - No other story dependencies
- **User Story 2 (P2)**: Depends on User Story 1 (variants must exist)
- **User Story 3 (P3)**: Depends on User Story 1 (tokens must be in use)

### Within User Story 1

1. Add all MUI variants first (T014-T018) - variants reference tokens
2. Migrate NavigationMenu.js (T019-T023) - largest file, most patterns
3. Migrate TopNavBar.js (T024-T025)
4. Migrate TopNavActions.js (T026-T027)
5. Migrate MegaMenuPopover.js (T028-T029)
6. Verify (T030-T031)

### Parallel Opportunities

**Foundational Phase (tokens)**:
- T005-T012 can all run in parallel (different token definitions in same file section)

**User Story 1 (variants)**:
- T015-T018 can run in parallel (different variant definitions)

**User Story 1 (component migration)**:
- Each component can be migrated after variants are defined
- Components are independent files

---

## Parallel Example: Foundational Token Addition

```bash
# Launch all token additions together:
Task: "Add navigation.text.secondary token in semantic.js"
Task: "Add navigation.text.muted token in semantic.js"
Task: "Add navigation.border.subtle token in semantic.js"
Task: "Add navigation.border.divider token in semantic.js"
Task: "Add navigation.background.hover token in semantic.js"
Task: "Add navigation.background.active token in semantic.js"
Task: "Add navigation.button.color token in semantic.js"
Task: "Add navigation.button.hoverColor token in semantic.js"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (baseline screenshots)
2. Complete Phase 2: Foundational (all 9 tokens)
3. Complete Phase 3: User Story 1 (variants + migration)
4. **STOP and VALIDATE**: Visual comparison - pixel-identical to baseline
5. Commit and potentially ship MVP

### Incremental Delivery

1. Setup + Foundational → Tokens available
2. User Story 1 → Colors centralized → Visual verification (MVP!)
3. User Story 2 → Documentation complete → Developer guide available
4. User Story 3 → Dark mode tested → Future-proofed architecture
5. Polish → Final cleanup → Feature complete

---

## Phase 7: User Story 4 - Mobile Navigation Styling (Priority: P1) 🆕

**Goal**: Extend semantic token architecture to mobile navigation components for consistent theming

**Independent Test**: Change mobile navigation token values and verify mobile menu updates without modifying component files

### New Semantic Tokens Required

- [x] T042 [US4] Add `navigation.mobile.icon.color` token mapping to `colorTheme.offwhite['000']` in frontend/react-Admin3/src/theme/colors/semantic.js
- [x] T043 [P] [US4] Add `navigation.mobile.border.color` token mapping to `rgba(255, 255, 255, 0.12)` equivalent in frontend/react-Admin3/src/theme/colors/semantic.js
- [x] T044 [P] [US4] Add `navigation.mobile.title.color` token mapping to `colorTheme.offwhite['000']` in frontend/react-Admin3/src/theme/colors/semantic.js
- [x] T045 [P] [US4] Add `navigation.hamburger.hover.background` token mapping for hamburger button hover state in frontend/react-Admin3/src/theme/colors/semantic.js

### Add MUI Variants for Mobile Navigation

- [x] T046 [US4] Add `mobileNavIcon` IconButton variant in frontend/react-Admin3/src/theme/components/navigation.js using `semanticColors.navigation.mobile.icon.color`
- [x] T047 [P] [US4] Add `mobileNavTitle` Typography variant in frontend/react-Admin3/src/theme/components/navigation.js using mobile title styling
- [x] T048 [P] [US4] Add `hamburgerToggle` IconButton variant in frontend/react-Admin3/src/theme/components/navigation.js for hamburger menu button

### Migrate MobileNavigation.js

- [x] T049 [US4] Replace `color: "white"` with `variant="mobileNavIcon"` for Search IconButton in frontend/react-Admin3/src/components/Navigation/MobileNavigation.js
- [x] T050 [P] [US4] Replace `color: "white"` with `variant="mobileNavIcon"` for Cart IconButton in frontend/react-Admin3/src/components/Navigation/MobileNavigation.js
- [x] T051 [P] [US4] Replace `color: "white"` with `variant="mobileNavIcon"` for Login/Profile IconButton in frontend/react-Admin3/src/components/Navigation/MobileNavigation.js
- [x] T052 [P] [US4] Replace `color: "white"` with `variant="mobileNavIcon"` for Back button IconButton in frontend/react-Admin3/src/components/Navigation/MobileNavigation.js
- [x] T053 [US4] Replace hardcoded `borderColor: 'rgba(255, 255, 255, 0.12)'` with semantic token reference in MobileNavHeader component
- [x] T054 [US4] Replace hardcoded title `color: "white"` with `variant="mobileNavTitle"` in MobileNavHeader component
- [x] T055 [US4] Replace Drawer `backgroundColor: 'primary.main'` with semantic token for mobile menu background in frontend/react-Admin3/src/components/Navigation/MobileNavigation.js

### Migrate MainNavBar.js Hamburger Button

- [x] T056 [US4] Replace CSS variable `var(--navbar-menu-toggle-bg-color-hover)` with semantic token in IconButton hover state in frontend/react-Admin3/src/components/Navigation/MainNavBar.js
- [x] T057 [US4] Apply `variant="hamburgerToggle"` to hamburger IconButton in frontend/react-Admin3/src/components/Navigation/MainNavBar.js

### Verification

- [x] T058 [US4] Take post-migration screenshots of mobile navigation and compare with baseline
- [x] T059 [US4] Test: Change `navigation.mobile.icon.color` token value and verify all mobile nav icons update
- [x] T060 [US4] Verify no hardcoded color values remain in MobileNavigation.js (grep for "white", "rgba", hardcoded hex)

**Checkpoint**: User Story 4 complete - mobile navigation colors centralized via semantic tokens

---

## Updated Dependencies

### Phase 7 Dependencies

- **User Story 4 (Phase 7)**: Depends on Phase 2 (Foundational tokens) - can run in parallel with User Stories 2-3
- Token tasks (T042-T045) must complete before variant tasks (T046-T048)
- Variant tasks must complete before component migration tasks (T049-T060)

### Parallel Opportunities in Phase 7

**Token Addition (T042-T045)**: All can run in parallel (different token definitions)

**Variant Addition (T046-T048)**: All can run in parallel (different variant definitions)

**Component Migration**:
- MobileNavigation.js IconButton migrations (T049-T052) can run in parallel
- MainNavBar.js migration (T056-T057) can run in parallel with MobileNavigation.js tasks

---

## Notes

- No automated tests - visual regression via screenshot comparison
- All color-related inline styles must move to variants
- Layout properties (margin, padding, flex) stay inline
- Semantic tokens provide single source of truth
- MUI variants provide reusable component configurations
- Visual appearance MUST remain pixel-identical after migration
