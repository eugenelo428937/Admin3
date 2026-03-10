# Styling System Cleanup - Implementation Plan

**Date:** 2025-01-27
**Spec:** 2025-01-27-styling-system-cleanup-spec.md
**Branch:** 20260116-styling-consolidation

## Task Overview

9 phases, 28 tasks. Phases 1-3 are the critical path. Phases 4-9 can be parallelized after Phase 3.

---

## Phase 1: Fix Color Value Drift (Bug Fix)

### T001: Audit MD3 color values between CSS and JS

**Files:** `src/index.css`, `src/theme/tokens/colors.js`
**Action:** Compare every `--md-sys-color-*` CSS variable against the corresponding `md3.*` JS value. Document all mismatches.

**Known mismatches (JS is correct, from Material Theme Builder):**

| Token | CSS value | JS value (correct) |
|-------|-----------|---------------------|
| secondary | `#765085` | `#69596D` |
| on-secondary | `#FFFFFF` | `#FFFFFF` |
| secondary-container | `#F7D8FF` | `#F1DCF4` |
| on-secondary-container | `#5C386B` | `#504255` |
| surface-variant | `#DBE4E6` | `#E5E1EC` |
| on-surface-variant | `#3F484A` | `#47464F` |
| outline | `#6F797A` | `#787680` |
| outline-variant | `#BFC8CA` | `#C9C5D0` |
| surface-dim | `#E1D7DE` | `#DDD8E0` |
| on-surface | `#1F1A1F` | `#1C1B20` |

**Verification:** Visual comparison of any component using these colors. The fix is in Phase 3 (CSS deletion), but this audit ensures we know the correct values.

---

## Phase 2: Delete Legacy Layers

### T002: Migrate `semanticColors` consumers in theme layer

**Files to modify:**

1. `src/theme/components/navigation.js` - Replace 11 `semanticColors.*` references:

   | Old | New |
   |-----|-----|
   | `semanticColors.navigation.text.primary` | `navigation.text.primary` (import from `../semantic/navigation`) |
   | `semanticColors.navigation.text.secondary` | `navigation.text.secondary` |
   | `semanticColors.navigation.text.muted` | `navigation.text.muted` |
   | `semanticColors.navigation.border.subtle` | `navigation.border.subtle` |
   | `semanticColors.navigation.border.divider` | `navigation.border.divider` |
   | `semanticColors.navigation.background.color` | `navigation.background.default` |
   | `semanticColors.navigation.background.hover` | `navigation.background.hover` |
   | `semanticColors.navigation.background.active` | `navigation.background.active` |
   | `semanticColors.navigation.button.color` | `navigation.button.color` |
   | `semanticColors.navigation.button.hoverColor` | `navigation.button.hoverColor` |
   | `semanticColors.navigation.mobile.*` | `navigation.mobile.*` |
   | `semanticColors.navigation.hamburger.*` | (fold into `navigation.mobile` or keep) |

   **Import change:** `import { semanticColors } from '../colors/semantic'` → `import navigation from '../semantic/navigation'`

2. `src/theme/index.js` - Remove `semanticColors` from palette merge:
   - Delete `import { semanticColors } from './colors/semantic'`
   - Change `semantic: { ...semanticColors, ...semantic }` → `semantic: semantic`

**Verification:** Run app, check navigation renders correctly. Run existing tests.

### T003: Delete `src/theme/colors/semantic.js`

**Depends on:** T002

**Action:** Delete the file. It has no remaining consumers after T002.

### T004: Delete `src/theme/colors/index.js`

**Depends on:** T003

**Action:** Delete this re-export layer. After T003, no file imports from `./colors/` or `./colors/index`.

**Check first:** Verify no remaining imports with: `grep -r "from.*colors[/'\"]" src/theme/`

### T005: Delete `legacyScales` and `createStringKeyScale`

**Depends on:** T003 (main consumer was `colors/semantic.js`)

**File:** `src/theme/tokens/colors.js`

**Action:**
- Delete `createStringKeyScale()` function (lines 396-406)
- Delete `legacyScales` export (lines 409-431)
- Remove `legacyScales` from default export object

**Remaining consumers to migrate first:**

1. `src/theme/components/misc.js` (1 reference):
   - `legacyScales.granite["050"]` → `scales.granite[50]`
   - Update import: `import { legacyScales }` → `import { scales }`

2. `src/misc/testTheme.js` (47 references):
   - This is a test utility. Convert all `legacyScales.color["XXX"]` → `scales.color[XX]`
   - E.g., `legacyScales.granite["090"]` → `scales.granite[90]`

**Verification:** `grep -r "legacyScales" src/` returns zero results.

### T006: Delete `statusColors`

**File:** `src/theme/tokens/colors.js`

**Consumers to migrate:**

1. `src/theme/components/alerts.js` (20 references):
   - Replace `statusColors.success.background` → `scales.green[10]` (or define in semantic/common.js)
   - Replace `statusColors.success.main` → `scales.green[60]`
   - Replace `statusColors.success.dark` → `scales.green[70]`
   - Replace `statusColors.error.background` → `md3.errorContainer`
   - Replace `statusColors.error.dark` → `md3.onErrorContainer`
   - Replace `statusColors.warning.background` → `scales.orange[10]`
   - Replace `statusColors.warning.dark` → `scales.orange[70]`
   - Replace `statusColors.info.background` → `scales.cobalt[10]`
   - Replace `statusColors.info.dark` → `scales.cobalt[70]`
   - **Import change:** `import { statusColors }` → `import { md3, scales } from '../tokens/colors'` + `import { status } from '../semantic/common'`

   **Better approach:** Use status tokens from `semantic/common.js` which already defines:
   - `status.error` / `status.errorContainer` / `status.onErrorContainer`
   - `status.warning` / `status.warningContainer` / `status.onWarningContainer`
   - `status.success` / `status.successContainer` / `status.onSuccessContainer`
   - `status.info` / `status.infoContainer` / `status.onInfoContainer`

   The alert overrides should import from the semantic layer:
   ```
   import { status } from '../semantic/common';
   ```

2. `src/theme/index.js` - Remove `statusColors` from imports and palette composition:
   - Delete `import { statusColors } from './tokens/colors'`
   - Replace `warning: colorTheme.palette.warning` → define inline from md3/scales
   - Replace `info: colorTheme.palette.info` → define inline
   - Replace `success: colorTheme.palette.success` → define inline

**Action in `tokens/colors.js`:**
- Delete `statusColors` export (lines 270-334)
- Remove from default export object

**Verification:** `grep -r "statusColors" src/` returns zero results. Alerts render correctly.

### T007: Clean `theme/index.js` - Remove backward-compat wrappers

**Depends on:** T002, T005, T006

**File:** `src/theme/index.js`

**Deletions:**
- `colorTheme` wrapper object (lines 26-46)
- `palettesTheme` alias (line 49)
- `baseTheme` intermediate (inline breakpoints into main createTheme)
- Top-level palette color entries: `offwhite`, `granite`, `purple`, `sky`, `mint`, `orange`, `pink`, `yellow`, `cobalt`, `green`, `red` (lines 122-133)
- `bpp` namespace (line 136)
- `md3` palette entry (line 137) - components should use semantic tokens, not raw md3
- `liftkit` palette entry (line 138)
- Bottom re-exports: `export { colorTheme }`, `export { typographyConfig as typographyTheme }`, etc. (lines 177-184)

**Replacements:**
- `palettesTheme.primary` → `md3.primary` (direct import)
- `colorTheme.palette.warning` → inline `{ main: scales.orange[50], ... }`
- `colorTheme.palette.text` → `{ primary: md3.onSurface, secondary: md3.onSurfaceVariant }`

**Result:** Clean `createTheme()` with only standard MUI roles + semantic + productCards + navigation + scales.

**Verification:** App starts. Theme object shape matches spec. Existing theme tests may need updating.

### T008: Migrate `palette.liftkit` consumers in components

**Depends on:** T007 (liftkit removed from palette)

**Files and mappings:**

1. **`src/components/Navigation/UserActions.js`** (3 references):
   - `theme.palette.liftkit.light.background` → `'semantic.bgDefault'` (or `'navigation.background.default'`)
   - `theme.palette.liftkit.light.onSurface` → `'semantic.textPrimary'`

2. **`src/components/Address/SmartAddressInput.js`** (6 references):
   - `theme.palette.liftkit.light.background` → `'semantic.bgDefault'`
   - `theme.palette.liftkit.light.*` → map to corresponding `semantic.*` tokens
   - `theme.palette.liftkit.dark.*` → remove dark mode refs (dark mode not implemented)

3. **`src/components/User/UserFormWizard.js`** (2 references):
   - `theme.palette.liftkit.light.onPrimary` → `'semantic.textOnPrimary'`

4. **`src/components/sandbox/UserForm-backup.js`** (2 references):
   - Same as UserFormWizard. This is a backup file - consider deletion.

**Test files to update:** 6 test files with mock `liftkit` palette objects. Remove liftkit from mocks, add semantic tokens.

**Verification:** Components render correctly. Tests pass.

### T009: Migrate top-level `palette.{color}['XXX']` consumers

**Depends on:** T007

**Files and mappings:**

1. **`src/components/Footer/Footer.js`** (15 references):
   - `theme.palette.granite["030"]` → `'semantic.borderDefault'` (or `'semantic.borderSubtle'`)
   - `theme.palette.granite["020"]` → `'semantic.borderSubtle'`
   - `theme.palette.granite["070"]` → add footer-specific semantic token or use `'navigation.background.hover'`
   - `theme.palette.granite["010"]` → `'semantic.bgSubtle'`
   - `theme.palette.granite["050"]` → `'semantic.textHint'`
   - `theme.palette.granite["000"]` → `'semantic.bgDefault'` (or static white)
   - `theme.palette.granite["040"]` → `'semantic.textDisabled'`

2. **`src/components/User/ResetPasswordForm.js`** (5 references):
   - `theme.palette.granite["090"]` → `'semantic.textPrimary'` (dark text)
   - `theme.palette.granite["030"]` → `'semantic.borderDefault'`

3. **`src/components/User/ForgotPasswordForm.js`** (5 references):
   - Same pattern as ResetPasswordForm

4. **`src/pages/Home.js`** (1 reference):
   - `theme.palette.granite["090"]` → `'semantic.textPrimary'`

5. **Styleguide ProductCard files** (TutorialProductCard, MaterialProductCard, MaterialProductCard2, MarkingProductCard - ~38 references):
   - These are display/demo components. Migrate to `productCards.*` semantic tokens.
   - `theme.palette.purple["070"]` → `theme.palette.productCards.tutorial.buttonHover`
   - `theme.palette.sky["060"]` → `theme.palette.productCards.material.button`
   - etc.

**Verification:** Footer, forms, and Home page render correctly.

---

## Phase 3: Gut `index.css`

### T010: Strip `index.css` to essentials

**Depends on:** T001 (audit complete, we know JS values are correct)

**File:** `src/index.css` (675 lines → ~30 lines)

**Keep:**
- Lines 1-27: Golden ratio scale variables (`:root` font-size, `--md`, `--scaleFactor`, `--sm`, `--xs`, `--2xs`, `--lg`, `--xl`, `--2xl`, step multipliers)
- Lines 666-671: Font smoothing settings
- Line 674-675: `body { margin: 0; }`

**Delete:**
- Lines 29-182: All `--md-sys-color-*` and `--md-ref-palette-*` CSS variables
- Lines 187-301: Both dark theme blocks (media query + data-theme)
- Lines 303-505: All `--color-*` BPP variables, product card header vars
- Lines 507-628: All `--light__*` / `--dark__*` LiftKit variables
- Lines 629-665: All `--bs-*`, `--user-*`, `--icon-*`, `--main-*`, `--quick-*` Bootstrap/legacy vars
- Lines 657-663: Shadow tokens (move to JS if needed, otherwise delete)

**Verification:** App loads without visual regressions. No console errors about missing CSS variables.

**Risk:** If any component still references CSS variables via `var(--color-*)`. Pre-check:
- Only `MaterialDesign3Palette.js` (styleguide) uses `var(--md-sys-*)` - acceptable for demo purposes, but should be migrated too.

### T011: Migrate shadow tokens to JS (if used)

**File:** `src/theme/tokens/` (new) or `src/theme/semantic/common.js`

**Action:** Check if `--shadow-sm`, `--shadow`, `--shadow-md`, `--shadow-lg`, `--shadow-xl` are referenced anywhere besides `index.css`. If yes, add to JS tokens. If no, delete.

---

## Phase 4: Migrate Raw Hex Values in Components

### T012: Clean `SearchModal.js` hex values

**File:** `src/components/Navigation/SearchModal.js` (6 hex values)

| Hex | Semantic replacement |
|-----|---------------------|
| `#dee2e6` | `'semantic.borderDefault'` |
| `#495057` | `'semantic.textSecondary'` |
| `#f8f9fa` | `'semantic.bgSubtle'` |

### T013: Clean `JsonContentRenderer.js` hex values

**File:** `src/components/Common/JsonContentRenderer.js` (6 hex values)

| Hex | Semantic replacement |
|-----|---------------------|
| `#fff3cd` | `'semantic.statusWarningBg'` |
| `#ffeaa7` | `'semantic.statusWarningBg'` (border variant - may need new token) |
| `#856404` | `'semantic.statusWarning'` (closest match) |
| `#f8f9fa` | `'semantic.bgSubtle'` |
| `#dee2e6` | `'semantic.borderDefault'` |
| `#495057` | `'semantic.textSecondary'` |

### T014: Clean `TutorialSelectionSummaryBar.js` hex values

**File:** `src/components/Product/ProductCard/Tutorial/TutorialSelectionSummaryBar.js`

| Hex | Semantic replacement |
|-----|---------------------|
| `rgba(99, 50, 185, 0.965)` | Use `theme.palette.productCards.tutorial.button` with alpha |
| `#7950d1` | `theme.palette.scales.purple[60]` or `theme.palette.productCards.tutorial.button` |
| `#fff` | `'semantic.textOnPrimary'` |

### T015: Clean `UserFormWizard.js` hex values

**File:** `src/components/User/UserFormWizard.js` (1 hex gradient)

| Hex | Semantic replacement |
|-----|---------------------|
| `linear-gradient(135deg, #9E9E9E 0%, #d9d9d9 100%)` | Use `theme.palette.scales.granite[40]` and `scales.granite[20]` via callback |

---

## Phase 5: Clean Up Remaining CSS/SCSS Files

### T016: Migrate `CheckoutSteps.css` to MUI

**File:** `src/components/Ordering/CheckoutSteps/CheckoutSteps.css` (73 lines)

**Option A (preferred):** Convert to `styled()` components or `sx` props in the parent component.
**Option B:** Keep CSS file but replace hardcoded values with CSS custom properties from theme.

The file contains keyframe animations and responsive layout - keeping it as CSS is acceptable since MUI `sx` doesn't handle `@keyframes` cleanly. Remove hardcoded `rem`/`px` values where possible.

### T017: Clean `App.scss`

**File:** `src/App.scss` (107 lines)

- Delete unused `.App-*` classes (CRA boilerplate)
- Migrate reCAPTCHA styles: keep as-is (third-party widget, CSS is appropriate)
- Replace `#282c34`, `#61dafb`, `#f8f9fa`, `#dee2e6`, `#adb5bd`, `#e9ecef` with theme tokens or delete if unused

### T018: Delete unused CSS files

**Files to delete:**
- `src/misc/VATToggle.css` - check if imported anywhere; if not, delete
- `src/misc/glass.css` - check if imported anywhere; if not, delete
- `src/stories/button.css`, `header.css`, `page.css` - Storybook CSS, check if Storybook is active
- `src/components/sandbox/css/*.css` - all 7 sandbox CSS files (development only)

### T019: Evaluate `custom-bootstrap.scss`

**File:** `src/styles/custom-bootstrap.scss`

Audit Bootstrap dependency. If Bootstrap is still used (checkout, forms), keep but minimize. If fully replaced by MUI, delete the file and remove Bootstrap from `package.json`.

---

## Phase 6: Tooling Enforcement

### T020: Add ESLint `no-restricted-imports` rule

**File:** `.eslintrc.js` (or equivalent config)

```javascript
'no-restricted-imports': ['error', {
  patterns: [
    {
      group: ['**/theme/tokens/*'],
      message: 'Components must not import raw tokens. Use semantic tokens via useTheme().',
    },
    {
      group: ['**/theme/colors/*'],
      message: 'Deleted module. Use semantic/ layer instead.',
    },
  ],
}],
```

**Exception:** Files within `src/theme/` are allowed to import tokens (they are part of the theme system).

### T021: Add hex-literal lint check

**Option A:** Use `eslint-plugin-no-color-literals` or similar.
**Option B:** Add CI script:

```bash
# scripts/check-no-hex-colors.sh
grep -rn '#[0-9a-fA-F]\{3,8\}' src/components/ \
  --include='*.js' --include='*.jsx' \
  --exclude-dir='__tests__' --exclude-dir='styleguide' --exclude-dir='sandbox' \
  && echo "FAIL: Raw hex colors in components" && exit 1
echo "PASS: No raw hex colors"
```

### T022: Update theme tests

**Files:**
- `src/theme/__tests__/colorTheme.test.js` - Delete or rewrite. Tests legacy `colorTheme` object.
- `src/theme/__tests__/theme.test.js` - Update to test new palette shape. Remove `bpp`, `liftkit`, `md3` palette assertions. Add `semantic`, `productCards`, `navigation` assertions.

---

## Phase 7: Developer Ergonomics

### T023: Add style helper utilities

**File:** `src/theme/utils/styleHelpers.js` (new)

Implement:
- `composeSx(...sxObjects)` - merge multiple sx objects
- `productCardSx(theme, productType)` - common product card theming
- Document with JSDoc and usage examples

### T024: Add variant documentation comments

**Files:** All files in `src/theme/components/`

Add JSDoc comments to each custom variant showing:
- Variant name
- Usage example
- Visual description

---

## Phase 8: Accessibility Tokens

### T025: Add focus/disabled/a11y tokens to semantic layer

**File:** `src/theme/semantic/common.js`

Add:
```javascript
export const a11y = {
  focusRing: `0 0 0 3px ${md3.primary}66`,
  focusRingError: `0 0 0 3px ${md3.error}66`,
  focusVisible: md3.primary,
};
```

### T026: Add `prefers-reduced-motion` to theme

**File:** `src/theme/components/index.js` (or a new `baseline.js`)

Add `MuiCssBaseline` override with reduced-motion media query.

---

## Phase 9: Remove Dark Mode Dead Code

### T027: Delete `darkMd3` from tokens

**File:** `src/theme/tokens/colors.js`

Delete `darkMd3` export (lines 340-390). No component or theme configuration uses it.

**Verification:** `grep -r "darkMd3" src/` returns zero results (only the token file should reference it).

### T028: Delete dark mode CSS blocks (already done in T010)

Covered by T010 (index.css gutting). This task is a verification step.

**Verification:** No `prefers-color-scheme: dark` or `[data-theme="dark"]` selectors remain in any CSS file.

---

## Dependency Graph

```
T001 (audit) ─────────────────────────────────────┐
                                                    │
T002 (migrate semanticColors) ──┬── T003 (delete colors/semantic.js) ──┬── T004 (delete colors/index.js)
                                │                                       │
                                │   T005 (delete legacyScales) ─────────┤
                                │                                       │
                                │   T006 (delete statusColors) ─────────┤
                                │                                       │
                                └── T007 (clean theme/index.js) ────────┤
                                                                        │
                                    T008 (migrate liftkit consumers) ───┤
                                                                        │
                                    T009 (migrate palette.color consumers)│
                                                                        │
T010 (gut index.css) ◄──────────────────────────────────────────────────┘
T011 (shadow tokens)

T012-T015 (hex cleanup) ◄── T010
T016-T019 (CSS/SCSS cleanup) ◄── T010
T020-T022 (tooling) ◄── T012-T015
T023-T024 (ergonomics) - independent
T025-T026 (a11y) - independent
T027-T028 (dark mode cleanup) ◄── T010
```

## Parallelization

**Sequential (critical path):** T001 → T002 → T003/T004/T005/T006 [P] → T007 → T008/T009 [P] → T010

**After T010 (can run in parallel):**
- [P] T012, T013, T014, T015 (hex cleanup - independent files)
- [P] T016, T017, T018, T019 (CSS cleanup - independent files)
- [P] T023, T024 (ergonomics)
- [P] T025, T026 (a11y)
- [P] T027 (dark mode)

**After hex cleanup:** T020, T021 (lint enforcement), T022 (test updates)

## Verification Checkpoints

| After Phase | Verify |
|-------------|--------|
| Phase 1 | Document all CSS/JS color mismatches |
| Phase 2 | `grep -r "legacyScales\|statusColors\|colorTheme\|palettesTheme\|semanticColors" src/` = 0 results |
| Phase 2 | `grep -r "palette\.liftkit\|palette\.bpp\|palette\.offwhite\|palette\.granite\|palette\.purple\|palette\.sky" src/components/` = 0 results |
| Phase 2 | App runs, navigation and product cards render correctly |
| Phase 3 | `index.css` < 40 lines, no `--md-sys-*` or `--color-*` variables |
| Phase 3 | App loads without console errors |
| Phase 4 | `grep -rn '#[0-9a-fA-F]' src/components/ --exclude-dir=__tests__ --exclude-dir=styleguide --exclude-dir=sandbox` = 0 results |
| Phase 6 | ESLint catches forbidden imports and hex colors |
| Phase 9 | `grep -r "darkMd3\|prefers-color-scheme" src/` = 0 results (except if kept in index.css) |

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Missing a consumer of deleted code | Pre-deletion grep for all references. App build must succeed. |
| Visual regression | Manual comparison of navigation, cards, footer, forms before/after each phase |
| `var(--color-*)` CSS references from third-party libs | Check `node_modules/` is not affected. BPP CSS vars are app-specific. |
| Bootstrap dependency still active | Audit before deleting `custom-bootstrap.scss`. Keep if checkout/forms need it. |
| Test failures from removed palette paths | Update test mocks to match new palette shape. Batch test updates in T022. |

## Success Criteria (from spec)

| Metric | Before | Target | Verified After |
|--------|--------|--------|----------------|
| `index.css` lines | 675 | < 40 | Phase 3 |
| CSS custom properties | 430 | 16 | Phase 3 |
| Color access patterns | 4 | 2 | Phase 5 |
| Raw hex in components | 26 | 0 | Phase 4 |
| Semantic layer files | 2 (overlapping) | 1 set | Phase 2 |
| Backward-compat wrappers | 4 | 0 | Phase 2 |
