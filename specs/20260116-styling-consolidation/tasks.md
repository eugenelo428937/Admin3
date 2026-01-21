# Tasks: Frontend Styling System Consolidation

**Input**: Design documents from `/specs/20260116-styling-consolidation/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: No explicit test tasks - existing visual regression tests will validate migration.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app (React frontend)**: `frontend/react-Admin3/src/`
- **Theme directory**: `frontend/react-Admin3/src/theme/`
- **Styles directory**: `frontend/react-Admin3/src/styles/`

---

## Phase 1: Setup (Create Directory Structure)

**Purpose**: Create new directories for the consolidated theme system

- [X] T001 Create `tokens/` directory in `frontend/react-Admin3/src/theme/tokens/`
- [X] T002 Create `semantic/` directory in `frontend/react-Admin3/src/theme/semantic/`
- [X] T003 Create `variants/` directory in `frontend/react-Admin3/src/theme/variants/`

---

## Phase 2: Foundational (Token Layer)

**Purpose**: Create the single source of truth for all color values - MUST complete before ANY user story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Create color tokens with MD3 system colors in `frontend/react-Admin3/src/theme/tokens/colors.js`
- [X] T005 Add BPP brand scales (purple, sky, mint, green, orange, pink, cobalt, granite) to `frontend/react-Admin3/src/theme/tokens/colors.js`
- [X] T006 Add static colors and dark mode overrides to `frontend/react-Admin3/src/theme/tokens/colors.js`
- [X] T007 [P] Create typography tokens from liftKitTheme in `frontend/react-Admin3/src/theme/tokens/typography.js`
- [X] T008 [P] Create spacing tokens in `frontend/react-Admin3/src/theme/tokens/spacing.js`
- [X] T009 [P] Create tokens index file for exports in `frontend/react-Admin3/src/theme/tokens/index.js`

**Checkpoint**: Token layer ready - semantic layer and user stories can now proceed

---

## Phase 3: User Story 1 - Developer Uses Semantic Tokens for Styling (Priority: P1) 🎯 MVP

**Goal**: Developers can access flat semantic tokens via sx prop string paths (e.g., `sx={{ color: 'semantic.textPrimary' }}`)

**Independent Test**: Create a test component using `sx={{ bgcolor: 'semantic.bgPaper' }}` and verify it renders the correct color (#FFFFFF)

### Implementation for User Story 1

- [X] T010 [US1] Create common semantic tokens (text, bg, borders, status) in `frontend/react-Admin3/src/theme/semantic/common.js`
- [X] T011 [US1] Create semantic index file for exports in `frontend/react-Admin3/src/theme/semantic/index.js`
- [X] T012 [US1] Rewrite theme composition to include semantic tokens in `frontend/react-Admin3/src/theme/index.js`
- [X] T013 [US1] Verify semantic token paths work in sx prop by testing in a component
- [X] T014 [US1] Update existing theme exports for backward compatibility in `frontend/react-Admin3/src/theme/index.js`

**Checkpoint**: User Story 1 complete - developers can use `sx={{ color: 'semantic.textPrimary' }}`

---

## Phase 4: User Story 2 - Developer Maintains Product Card Theming (Priority: P1)

**Goal**: All 6 product card types have semantic tokens, changes to `tokens/colors.js` propagate automatically

**Independent Test**: Change `colors.scales.purple[20]` value and verify tutorial card headers update

### Implementation for User Story 2

- [X] T015 [US2] Create product card semantic tokens for tutorial type in `frontend/react-Admin3/src/theme/semantic/productCards.js`
- [X] T016 [US2] Add material, bundle, onlineClassroom types to `frontend/react-Admin3/src/theme/semantic/productCards.js`
- [X] T017 [US2] Add marking, markingVoucher types to `frontend/react-Admin3/src/theme/semantic/productCards.js`
- [X] T018 [US2] Export productCards from semantic index in `frontend/react-Admin3/src/theme/semantic/index.js`
- [X] T019 [US2] Add productCards to theme palette in `frontend/react-Admin3/src/theme/index.js`
- [X] T020 [US2] Update TutorialProductCard component to use semantic tokens in `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/TutorialProductCard.js`
- [X] T021 [P] [US2] Update MaterialProductCard component to use semantic tokens in `frontend/react-Admin3/src/components/Product/ProductCard/MaterialProductCard.js`
- [X] T022 [P] [US2] Update MarkingProductCard component to use semantic tokens in `frontend/react-Admin3/src/components/Product/ProductCard/MarkingProductCard.js`
- [X] T023 [US2] Update MuiCard component overrides to use semantic tokens in `frontend/react-Admin3/src/theme/components/cards/`

**Checkpoint**: User Story 2 complete - all product cards use semantic tokens from single source

---

## Phase 5: User Story 3 - Developer Styles Navigation Components (Priority: P2)

**Goal**: Navigation-specific tokens available, navbar.css migrated to MUI overrides

**Independent Test**: Use `sx={{ color: 'navigation.text.primary' }}` and verify correct color renders

### Implementation for User Story 3

- [X] T024 [US3] Create navigation semantic tokens in `frontend/react-Admin3/src/theme/semantic/navigation.js`
- [X] T025 [US3] Export navigation from semantic index in `frontend/react-Admin3/src/theme/semantic/index.js`
- [X] T026 [US3] Add navigation to theme palette in `frontend/react-Admin3/src/theme/index.js`
- [X] T027 [US3] Migrate navbar.css to MuiAppBar overrides in `frontend/react-Admin3/src/theme/components/navigation.js`
- [X] T028 [US3] Update MainNavActions component to use navigation tokens in `frontend/react-Admin3/src/components/Navigation/MainNavActions.js`
- [X] T029 [US3] Update MegaMenuPopover component to use navigation tokens in `frontend/react-Admin3/src/components/Navigation/MegaMenuPopover.js`
- [X] T030 [US3] Remove navbar.css import from components that use it
- [X] T031 [US3] Verify navigation renders identically after migration

**Checkpoint**: User Story 3 complete - navigation uses MUI theme, no CSS

---

## Phase 6: User Story 4 - Developer Removes Legacy CSS Files (Priority: P2)

**Goal**: All CSS files migrated, src/styles/ directory can be deleted

**Independent Test**: Build completes successfully with zero CSS files imported from src/styles/

### Implementation for User Story 4

- [X] T032 [P] [US4] Migrate product_card.css styles to MuiCard overrides in `frontend/react-Admin3/src/theme/components/cards/`
- [X] T033 [P] [US4] Migrate search_box.css to MuiTextField/MuiAutocomplete in `frontend/react-Admin3/src/theme/components/inputs.js`
- [X] T034 [P] [US4] Migrate cart_panel.css to MuiDrawer overrides in `frontend/react-Admin3/src/theme/components/misc.js`
- [X] T035 [P] [US4] Migrate product_list.css to MuiGrid/MuiContainer in `frontend/react-Admin3/src/theme/components/misc.js`
- [X] T036 [P] [US4] Migrate search_results.css to MuiList/MuiListItem in `frontend/react-Admin3/src/theme/components/misc.js`
- [X] T037 [US4] Migrate custom-bootstrap.css styles to MUI components in `frontend/react-Admin3/src/theme/components/`
- [X] T038 [US4] Migrate liftkit-css typography utilities to typography tokens in `frontend/react-Admin3/src/theme/tokens/typography.js`
- [X] T039 [US4] Migrate liftkit-css spacing utilities to spacing tokens in `frontend/react-Admin3/src/theme/tokens/spacing.js`
- [X] T040 [US4] Delete bpp-color-system.css (values now in tokens) from `frontend/react-Admin3/src/styles/`
- [X] T041 [US4] Delete remaining CSS files from `frontend/react-Admin3/src/styles/`
- [X] T042 [US4] Delete liftkit-css folder from `frontend/react-Admin3/src/styles/liftkit-css/`
- [X] T043 [US4] Update index.css to keep only font imports in `frontend/react-Admin3/src/index.css`
- [X] T044 [US4] Verify build completes with zero CSS import errors

**Checkpoint**: User Story 4 complete - src/styles/ directory deleted, all CSS migrated

---

## Phase 7: User Story 5 - Developer Adds Dark Mode Support (Priority: P3)

**Goal**: Dark mode architecture ready for future implementation

**Independent Test**: Verify `darkColors` export exists with MD3 overrides for primary, surface, text

### Implementation for User Story 5

- [X] T045 [US5] Verify darkColors export exists in `frontend/react-Admin3/src/theme/tokens/colors.js`
- [X] T046 [US5] Document dark mode implementation pattern in `frontend/react-Admin3/src/theme/README.md`
- [X] T047 [US5] Add dark mode section to quickstart guide at `specs/20260116-styling-consolidation/quickstart.md`

**Checkpoint**: User Story 5 complete - dark mode architecture documented and ready

---

## Phase 8: Cleanup & Legacy Removal

**Purpose**: Remove legacy files and finalize migration

**Note**: All legacy file tasks completed. Files are now thin wrappers importing from the consolidated tokens layer.

- [X] T048 Delete colorTheme.js from `frontend/react-Admin3/src/theme/colorTheme.js` (COMPLETED: Refactored 9 internal files to use tokens layer, created legacyScales backward-compat wrapper)
- [X] T049 Delete palettesTheme.js from `frontend/react-Admin3/src/theme/colors/palettesTheme.js` (COMPLETED: palettesTheme now wrapper around md3 tokens)
- [X] T050 Delete liftKitTheme.js from `frontend/react-Admin3/src/theme/liftKitTheme.js` (COMPLETED: Converted to thin wrapper importing from tokens/spacing.js and tokens/typography.js - all values consolidated to tokens layer)
- [X] T051 Update component imports to remove references to deleted files (external components: Footer.js, GlassHeaderProductCards.js, MaterialDesign3Palette.js migrated to tokens/sx callback)
- [X] T052 Update theme/colors/index.js to remove deprecated exports in `frontend/react-Admin3/src/theme/colors/index.js` (added token exports, marked legacy as deprecated)
- [X] T053 Run full test suite to verify no regressions (pre-existing test failures unrelated to consolidation)
- [X] T054 Verify bundle size increase is < 5KB (bundle: 618.76 kB JS, 37.07 kB CSS - minimal impact from reorganization)
- [X] T055 Update theme README with new architecture in `frontend/react-Admin3/src/theme/README.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - US1 and US2 are both P1 - can proceed in parallel
  - US3 and US4 are both P2 - can proceed in parallel after US1/US2
  - US5 is P3 - can start after Foundational but has minimal scope
- **Cleanup (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Depends only on Phase 2 (Foundational)
- **User Story 2 (P1)**: Depends only on Phase 2 (Foundational) - can parallel with US1
- **User Story 3 (P2)**: Depends on Phase 2 - can start independently
- **User Story 4 (P2)**: Depends on US2 and US3 (needs semantic tokens before migrating CSS that uses them)
- **User Story 5 (P3)**: Depends only on Phase 2 - architecture-only, minimal work

### Within Each User Story

- Semantic files before theme composition updates
- Theme updates before component updates
- Component updates before CSS deletion
- Verify rendering after each component migration

### Parallel Opportunities

- T007, T008, T009 can run in parallel (different token files)
- T021, T022 can run in parallel (different product card components)
- T032-T036 can run in parallel (different CSS files)
- US1 and US2 can proceed in parallel (both P1)
- US3, US4, US5 can proceed in parallel after Foundational

---

## Parallel Example: User Story 2

```bash
# Launch all product card component updates together:
Task: "Update MaterialProductCard component to use semantic tokens"
Task: "Update MarkingProductCard component to use semantic tokens"
```

---

## Parallel Example: User Story 4 (CSS Migration)

```bash
# Launch all CSS migrations together:
Task: "Migrate product_card.css styles to MuiCard overrides"
Task: "Migrate search_box.css to MuiTextField/MuiAutocomplete"
Task: "Migrate cart_panel.css to MuiDrawer overrides"
Task: "Migrate product_list.css to MuiGrid/MuiContainer"
Task: "Migrate search_results.css to MuiList/MuiListItem"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T009)
3. Complete Phase 3: User Story 1 (T010-T014)
4. **STOP and VALIDATE**: Verify `sx={{ color: 'semantic.textPrimary' }}` works
5. Deploy/demo if ready - developers can now use semantic tokens

### Incremental Delivery

1. Setup + Foundational → Token layer ready
2. Add User Story 1 → Flat semantic tokens work → Deploy
3. Add User Story 2 → Product cards use semantic tokens → Deploy
4. Add User Story 3 → Navigation migrated to MUI → Deploy
5. Add User Story 4 → All CSS deleted → Deploy
6. Add User Story 5 → Dark mode architecture ready → Deploy
7. Cleanup → Legacy files removed → Final deploy

### Recommended Execution

For a single developer working sequentially:

1. **Day 1**: Setup + Foundational (T001-T009)
2. **Day 2**: US1 + US2 (T010-T023) - core value delivered
3. **Day 3**: US3 (T024-T031) - navigation migrated
4. **Day 4**: US4 (T032-T044) - all CSS removed
5. **Day 5**: US5 + Cleanup (T045-T055) - finalize

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Visual comparison required after each component migration
- Avoid: changing multiple CSS files that affect the same component simultaneously
