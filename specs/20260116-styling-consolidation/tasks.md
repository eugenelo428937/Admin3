# Tasks: Styling System Cleanup

**Input**: [spec.md](spec.md), [plan.md](plan.md)
**Decision**: No backward compatibility. Legacy patterns deleted, not maintained.
**Total**: 9 phases, 28 tasks

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to
- Include exact file paths in descriptions

## Path Conventions

- **Web app (React frontend)**: `frontend/react-Admin3/src/`
- **Theme directory**: `frontend/react-Admin3/src/theme/`

---

## Phase 1: Fix Color Value Drift (Bug Fix)

**Purpose**: Audit and document MD3 color mismatches between CSS and JS

- [ ] T001 [US4] Audit MD3 color values between `frontend/react-Admin3/src/index.css` and `frontend/react-Admin3/src/theme/tokens/colors.js` - document all mismatches (JS values are correct, from Material Theme Builder)

**Known mismatches (JS is correct):**

| Token | CSS value | JS value (correct) |
|-------|-----------|---------------------|
| secondary | `#765085` | `#69596D` |
| secondary-container | `#F7D8FF` | `#F1DCF4` |
| on-secondary-container | `#5C386B` | `#504255` |
| surface-variant | `#DBE4E6` | `#E5E1EC` |
| on-surface-variant | `#3F484A` | `#47464F` |
| outline | `#6F797A` | `#787680` |
| outline-variant | `#BFC8CA` | `#C9C5D0` |
| surface-dim | `#E1D7DE` | `#DDD8E0` |
| on-surface | `#1F1A1F` | `#1C1B20` |

**Checkpoint**: All mismatches documented. Fix happens in Phase 3 (CSS deletion).

---

## Phase 2: Delete Legacy Layers

**Purpose**: Remove all backward-compatibility code. Critical path for the entire cleanup.

### 2a: Migrate and Delete Old Semantic Layer

- [ ] T002 [US3] Migrate `semanticColors` consumers in theme layer:
  - `frontend/react-Admin3/src/theme/components/navigation.js` - Replace 11 `semanticColors.*` refs with imports from `../semantic/navigation`
  - `frontend/react-Admin3/src/theme/index.js` - Remove `semanticColors` from palette merge

- [ ] T003 [US3] Delete `frontend/react-Admin3/src/theme/colors/semantic.js` (no remaining consumers after T002)

- [ ] T004 [US3] Delete `frontend/react-Admin3/src/theme/colors/index.js` (re-export layer, no longer needed). Verify: `grep -r "from.*colors[/'\"]" src/theme/` returns 0 results

### 2b: Delete Legacy Token Exports

- [ ] T005 [US1] Delete `legacyScales` and `createStringKeyScale` from `frontend/react-Admin3/src/theme/tokens/colors.js`:
  - First migrate `frontend/react-Admin3/src/theme/components/misc.js`: `legacyScales.granite["050"]` → `scales.granite[50]`
  - First migrate `frontend/react-Admin3/src/misc/testTheme.js`: convert all 47 `legacyScales` refs to `scales` with numeric keys
  - Delete `createStringKeyScale()` function
  - Delete `legacyScales` export
  - Verify: `grep -r "legacyScales" src/` returns 0 results

- [ ] T006 [US1] Delete `statusColors` from `frontend/react-Admin3/src/theme/tokens/colors.js`:
  - First migrate `frontend/react-Admin3/src/theme/components/alerts.js` (20 refs): Replace with `status` tokens from `../semantic/common`
  - First migrate `frontend/react-Admin3/src/theme/index.js`: Remove `statusColors` import, define palette warning/info/success inline from md3/scales
  - Delete `statusColors` export
  - Verify: `grep -r "statusColors" src/` returns 0 results

### 2c: Clean Theme Entry Point

- [ ] T007 [US1] Clean `frontend/react-Admin3/src/theme/index.js` - Remove backward-compat wrappers:
  - Delete `colorTheme` wrapper object
  - Delete `palettesTheme` alias
  - Delete top-level palette color entries (`offwhite`, `granite`, `purple`, `sky`, `mint`, `orange`, `pink`, `yellow`, `cobalt`, `green`, `red`)
  - Delete `bpp` namespace
  - Delete `md3` palette entry
  - Delete `liftkit` palette entry
  - Delete bottom re-exports (`export { colorTheme }`, etc.)
  - Inline palette values directly from md3/scales imports
  - Result: Clean `createTheme()` with only standard MUI roles + semantic + productCards + navigation + scales

### 2d: Migrate Component Consumers

- [ ] T008 [US1] Migrate `palette.liftkit` consumers in components:
  - `frontend/react-Admin3/src/components/Navigation/UserActions.js` (3 refs): `palette.liftkit.light.*` → `'semantic.*'` tokens
  - `frontend/react-Admin3/src/components/Address/SmartAddressInput.js` (6 refs): `palette.liftkit.light.*` → `'semantic.*'` tokens
  - `frontend/react-Admin3/src/components/User/UserFormWizard.js` (2 refs): `palette.liftkit.light.*` → `'semantic.*'` tokens
  - `frontend/react-Admin3/src/components/sandbox/UserForm-backup.js` (2 refs): same as UserFormWizard, consider deletion
  - Update 6 test files: remove liftkit from mocks, add semantic tokens

- [ ] T009 [US1] [US2] Migrate top-level `palette.{color}['XXX']` consumers:
  - `frontend/react-Admin3/src/components/Footer/Footer.js` (15 refs): `palette.granite["XXX"]` → `'semantic.*'` tokens
  - `frontend/react-Admin3/src/components/User/ResetPasswordForm.js` (5 refs): same pattern
  - `frontend/react-Admin3/src/components/User/ForgotPasswordForm.js` (5 refs): same pattern
  - `frontend/react-Admin3/src/pages/Home.js` (1 ref): `palette.granite["090"]` → `'semantic.textPrimary'`
  - StyleGuide ProductCard files (~38 refs): migrate to `productCards.*` semantic tokens

**Checkpoint**: `grep -r "legacyScales\|statusColors\|colorTheme\|palettesTheme\|semanticColors\|palette\.liftkit\|palette\.bpp" src/` = 0 results. App runs correctly.

---

## Phase 3: Gut `index.css`

**Purpose**: Reduce CSS footprint from 675 lines to ~30 lines

- [ ] T010 [US4] Strip `frontend/react-Admin3/src/index.css` to essentials:
  - **Keep**: Golden ratio scale variables (lines 1-27), font smoothing (lines 666-671), body margin reset
  - **Delete**: All `--md-sys-color-*` vars, all `--md-ref-palette-*` vars, both dark theme blocks, all `--color-*` BPP vars, all `--light__*`/`--dark__*` LiftKit vars, all `--bs-*` Bootstrap vars
  - Pre-check: Only `MaterialDesign3Palette.js` uses `var(--md-sys-*)` - migrate or accept for styleguide
  - Verify: App loads without console errors or visual regressions

- [ ] T011 [P] [US4] Check if shadow tokens (`--shadow-sm`, `--shadow`, `--shadow-md`, `--shadow-lg`, `--shadow-xl`) are referenced outside `index.css`. If yes, add to JS tokens. If no, delete.

**Checkpoint**: `index.css` < 40 lines. No `--md-sys-*` or `--color-*` variables remain.

---

## Phase 4: Migrate Raw Hex Values in Components

**Purpose**: Zero hex literals in production component files

- [ ] T012 [P] [US1] Clean `frontend/react-Admin3/src/components/Navigation/SearchModal.js` hex values (6 occurrences): `#dee2e6` → `'semantic.borderDefault'`, `#495057` → `'semantic.textSecondary'`, `#f8f9fa` → `'semantic.bgSubtle'`

- [ ] T013 [P] [US1] Clean `frontend/react-Admin3/src/components/Common/JsonContentRenderer.js` hex values (6 occurrences): `#fff3cd`/`#ffeaa7` → `'semantic.statusWarningBg'`, `#856404` → `'semantic.statusWarning'`, `#f8f9fa` → `'semantic.bgSubtle'`, `#dee2e6` → `'semantic.borderDefault'`

- [ ] T014 [P] [US2] Clean `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/TutorialSelectionSummaryBar.js` hex values: `rgba(99,50,185,0.965)` → `productCards.tutorial.button` with alpha, `#7950d1` → `productCards.tutorial.button`, `#fff` → `'semantic.textOnPrimary'`

- [ ] T015 [P] [US1] Clean `frontend/react-Admin3/src/components/User/UserFormWizard.js` hex gradient: `#9E9E9E`/`#d9d9d9` → `scales.granite[40]`/`scales.granite[20]` via theme callback

**Checkpoint**: `grep -rn '#[0-9a-fA-F]' src/components/ --exclude-dir=__tests__ --exclude-dir=styleguide --exclude-dir=sandbox` = 0 results

---

## Phase 5: Clean Up Remaining CSS/SCSS Files

**Purpose**: Evaluate and clean CSS/SCSS files

- [ ] T016 [P] [US4] Evaluate `frontend/react-Admin3/src/components/Ordering/CheckoutSteps/CheckoutSteps.css` (73 lines). Contains keyframe animations - keep as CSS (MUI sx doesn't handle `@keyframes` cleanly). Remove hardcoded `rem`/`px` values where possible.

- [ ] T017 [P] [US4] Clean `frontend/react-Admin3/src/App.scss`:
  - Delete unused `.App-*` classes (CRA boilerplate)
  - Keep reCAPTCHA styles (third-party widget, CSS is appropriate)
  - Replace hardcoded hex values (`#282c34`, `#61dafb`, `#f8f9fa`, etc.) with theme tokens or delete if unused

- [ ] T018 [P] [US4] Delete unused CSS files (check imports first):
  - `frontend/react-Admin3/src/misc/VATToggle.css`
  - `frontend/react-Admin3/src/misc/glass.css`
  - `frontend/react-Admin3/src/stories/button.css`, `header.css`, `page.css`
  - `frontend/react-Admin3/src/components/sandbox/css/*.css` (all sandbox CSS)

- [ ] T019 [US4] Evaluate `frontend/react-Admin3/src/styles/custom-bootstrap.scss`. Audit Bootstrap dependency. If Bootstrap still used (checkout, forms), keep but minimize. If fully replaced by MUI, delete and remove Bootstrap from `package.json`.

**Checkpoint**: All unnecessary CSS files deleted. Remaining CSS files justified.

---

## Phase 6: Tooling Enforcement

**Purpose**: Prevent regression via lint rules and CI checks

- [ ] T020 [US5] Add ESLint `no-restricted-imports` rule to `.eslintrc.js`:
  - Block `**/theme/tokens/*` imports from components
  - Block `**/theme/colors/*` imports (deleted module)
  - Exception: Files within `src/theme/` are allowed to import tokens

- [ ] T021 [P] [US5] Add hex-literal CI check (`scripts/check-no-hex-colors.sh`):
  - Fail build if hex colors found in `src/components/` (excluding `__tests__/`, `styleguide/`, `sandbox/`)

- [ ] T022 [US5] Update theme tests:
  - Delete or rewrite `src/theme/__tests__/colorTheme.test.js` (tests legacy `colorTheme` object)
  - Update `src/theme/__tests__/theme.test.js`: Remove `bpp`, `liftkit`, `md3` palette assertions. Add `semantic`, `productCards`, `navigation` assertions.

**Checkpoint**: ESLint catches forbidden imports. CI catches hex colors.

---

## Phase 7: Developer Ergonomics

**Purpose**: Add helper utilities and variant documentation

- [ ] T023 [P] [US1] Add style helper utilities in `frontend/react-Admin3/src/theme/utils/styleHelpers.js`:
  - `composeSx(...sxObjects)` - merge multiple sx objects
  - `productCardSx(theme, productType)` - common product card theming
  - Document with JSDoc and usage examples

- [ ] T024 [P] [US1] Add JSDoc variant documentation to all files in `frontend/react-Admin3/src/theme/components/`:
  - Each custom variant gets `@variant`, `@usage`, `@description` comments

**Checkpoint**: Helper utilities usable. Variants documented.

---

## Phase 8: Accessibility Tokens

**Purpose**: Add a11y tokens and reduced motion support

- [ ] T025 [US6] Add focus/disabled/a11y tokens to `frontend/react-Admin3/src/theme/semantic/common.js`:
  - `a11y.focusRing`, `a11y.focusRingError`, `a11y.focusVisible`, `a11y.contrastBorder`

- [ ] T026 [US6] Add `prefers-reduced-motion` override via `MuiCssBaseline` in `frontend/react-Admin3/src/theme/components/index.js` (or new `baseline.js`)

**Checkpoint**: Focus tokens available. Reduced motion respected.

---

## Phase 9: Remove Dark Mode Dead Code

**Purpose**: Delete unused dark mode artifacts

- [ ] T027 [US4] Delete `darkMd3` export from `frontend/react-Admin3/src/theme/tokens/colors.js` (lines 340-390). Verify: `grep -r "darkMd3" src/` returns 0 results.

- [ ] T028 [US4] Verify no dark mode CSS blocks remain. Covered by T010 (index.css gutting). Verify: No `prefers-color-scheme: dark` or `[data-theme="dark"]` selectors in any CSS file.

**Checkpoint**: `grep -r "darkMd3\|prefers-color-scheme" src/` = 0 results (except `prefers-reduced-motion` in Phase 8).

---

## Dependencies & Execution Order

### Critical Path (Sequential)

```text
T001 → T002 → T003/T004 → T005/T006 → T007 → T008/T009 → T010
```

### After T010 (Parallel)

- T012, T013, T014, T015 (hex cleanup - independent files)
- T016, T017, T018, T019 (CSS cleanup - independent files)
- T023, T024 (ergonomics - independent)
- T025, T026 (a11y - independent)
- T027 (dark mode - independent)

### After Hex Cleanup

- T020, T021 (lint enforcement)
- T022 (test updates)

### Recommended Execution

1. **Phase 1**: T001 (audit)
2. **Phase 2**: T002-T009 (delete legacy - critical path)
3. **Phase 3**: T010-T011 (gut index.css)
4. **Phase 4-5**: T012-T019 (hex + CSS cleanup - parallel)
5. **Phase 6**: T020-T022 (tooling)
6. **Phase 7-9**: T023-T028 (ergonomics, a11y, dark mode cleanup - parallel)

## Notes

- [P] tasks = different files, no dependencies, can run in parallel
- [Story] label maps task to user story for traceability
- Commit after each task or logical group
- Visual comparison required after each component migration
