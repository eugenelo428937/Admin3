# Styling System Cleanup Specification

**Date:** 2025-01-27
**Status:** Draft
**Branch:** 20260116-styling-consolidation
**Supersedes:** 2025-01-16-styling-system-consolidation-design.md

## Problem Statement

The styling consolidation design (Jan 16) established a correct architecture (tokens -> semantic -> components), but the implementation accumulated backward-compatibility layers that were never removed. The result:

- **~430 CSS custom properties** in `index.css`, of which ~310 (72%) duplicate JS tokens
- **Two semantic layers** running in parallel (`colors/semantic.js` + `semantic/common.js`)
- **Three ways to access the same color** (`palette.granite['020']`, `palette.scales.granite[20]`, `palette.bpp.granite['020']`)
- **Four distinct access patterns** in components (string paths, theme callbacks, direct palette, legacy semantic)
- **121 raw hex literals** scattered across 20 component files
- **Color value drift** between CSS vars and JS tokens (e.g., `secondary`: CSS `#765085` vs JS `#69596D`)

**Decision: No backward compatibility.** Legacy patterns will be deleted, not maintained.

## Goals

| Priority | Goal | Measurable Target |
|----------|------|-------------------|
| 1 | Single source of truth | One color definition per value, in `tokens/colors.js` only |
| 2 | Zero raw hex in components | 0 hex literals in `src/components/` (enforced by lint) |
| 3 | Two access patterns max | String paths for static, theme callbacks for dynamic |
| 4 | Minimal CSS footprint | `index.css` < 40 lines (fonts, golden ratio vars, body reset) |
| 5 | Developer ergonomics | Autocomplete for all semantic tokens, helper utilities |
| 6 | Accessibility compliance | WCAG AA contrast for all semantic pairs, focus/disabled tokens |

## Architecture: Three Clean Layers

```
Layer 1: Tokens (raw values, never imported by components)
  src/theme/tokens/colors.js      - All hex values
  src/theme/tokens/typography.js   - Font families, sizes, weights
  src/theme/tokens/spacing.js      - Spacing scale

Layer 2: Semantic (purpose-driven mappings, the primary component interface)
  src/theme/semantic/common.js        - text, bg, border, status, action tokens
  src/theme/semantic/productCards.js   - per-product-type tokens
  src/theme/semantic/navigation.js     - navigation tokens

Layer 3: Component Overrides (MUI component defaults and variants)
  src/theme/components/index.js        - aggregator
  src/theme/components/buttons.js      - Button overrides
  src/theme/components/navigation.js   - AppBar, Tab, Menu overrides
  src/theme/components/cards/          - Card variant overrides
  src/theme/components/alerts.js
  src/theme/components/inputs.js
  src/theme/components/misc.js

Entry Point:
  src/theme/index.js                   - createTheme() composition
```

### Import Rules

```
components/ --> semantic/ --> tokens/
                               ^
components/ -X-> tokens/    (FORBIDDEN - enforced by ESLint)
```

- **Components** import nothing from theme directly. They use `useTheme()` or MUI `sx` string paths.
- **Semantic files** import from `tokens/` only.
- **Component overrides** import from `semantic/` or `tokens/` (overrides are part of the theme layer).

## Detailed Changes

### Phase 1: Fix Color Value Drift (Bug Fix)

**Problem:** MD3 colors in `index.css` differ from `tokens/colors.js`:

| Token | CSS (`index.css`) | JS (`tokens/colors.js`) | Action |
|-------|-------------------|------------------------|--------|
| secondary | `#765085` | `#69596D` | JS is correct (from Material Theme Builder) |
| surfaceVariant | `#DBE4E6` | `#E5E1EC` | JS is correct |
| onSurfaceVariant | `#3F484A` | `#47464F` | JS is correct |
| outline | `#6F797A` | `#787680` | JS is correct |
| outlineVariant | `#BFC8CA` | `#C9C5D0` | JS is correct |

**Action:** This is a visual bug. Fix CSS values to match JS, or (preferred) delete the CSS vars entirely in Phase 3.

### Phase 2: Delete Legacy Layers

#### 2a. Delete `colors/semantic.js`

This file maps product card and navigation colors using `legacyScales` (string-keyed). It is fully superseded by:
- `semantic/productCards.js` (same colors, numeric keys)
- `semantic/navigation.js` (same colors, numeric keys)

**Migration for remaining consumers:**

| Old Path | New Path |
|----------|----------|
| `theme.palette.semantic.cardHeader.tutorial` | `theme.palette.productCards.tutorial.header` |
| `theme.palette.semantic.cardActions.tutorial` | `theme.palette.productCards.tutorial.actions` |
| `theme.palette.semantic.badge.tutorial` | `theme.palette.productCards.tutorial.badge` |
| `theme.palette.semantic.addToCartButton.tutorial.background` | `theme.palette.productCards.tutorial.button` |
| `theme.palette.semantic.addToCartButton.tutorial.hover` | `theme.palette.productCards.tutorial.buttonHover` |
| `theme.palette.semantic.cardText.tutorial.title` | `theme.palette.productCards.tutorial.title` |
| `theme.palette.semantic.navigation.*` | `theme.palette.navigation.*` |
| `theme.palette.semantic.topnavbar.*` | `theme.palette.navigation.*` |
| `theme.palette.semantic.icon.tutorial` | `theme.palette.productCards.tutorial.icon` |

**Files to update:** Components currently importing from or referencing the old semantic layer.

**Files to delete:**
- `src/theme/colors/semantic.js`
- `src/theme/colors/index.js` (re-export layer, no longer needed)

#### 2b. Delete `legacyScales` and `createStringKeyScale`

Remove from `tokens/colors.js`:
- `createStringKeyScale()` function
- `legacyScales` export
- All consumers must use `scales` with numeric keys: `scales.purple[20]` not `legacyScales.purple['020']`

#### 2c. Delete backward-compatibility wrappers in `theme/index.js`

Remove:
- `colorTheme` wrapper object
- `palettesTheme` alias
- Top-level palette color exports (`palette.offwhite`, `palette.granite`, `palette.purple`, etc.)
- `palette.bpp` namespace
- `palette.liftkit` reference
- All re-exports at bottom of file (`export { colorTheme }`, `export { typographyConfig as typographyTheme }`, etc.)

#### 2d. Resolve `statusColors` confusion

`statusColors` in `tokens/colors.js` defines a complete palette (primary, secondary, tertiary, error, warning, info, success, background, surface, text) with different hex values from `md3`. This is actually a LiftKit palette, not status colors.

**Decision:** Delete `statusColors` entirely. The MUI palette in `theme/index.js` should derive directly from `md3` tokens:

```javascript
palette: {
  primary: { main: md3.primary, contrastText: md3.onPrimary },
  secondary: { main: md3.secondary, contrastText: md3.onSecondary },
  error: { main: md3.error, contrastText: md3.onError },
  warning: { main: scales.orange[50], contrastText: staticColors.white },
  info: { main: scales.cobalt[60], contrastText: staticColors.white },
  success: { main: scales.green[60], contrastText: staticColors.white },
  background: { default: md3.background, paper: md3.surfaceContainerLowest },
  text: { primary: md3.onSurface, secondary: md3.onSurfaceVariant },
}
```

### Phase 3: Gut `index.css`

Reduce from ~675 lines to ~30 lines. Keep only:

```css
:root {
  /* Golden ratio scale (powers responsive typography) */
  font-size: 1rem;
  --md: 1em;
  --scaleFactor: 1.618;
  --sm: calc(var(--md) / var(--scaleFactor));
  --xs: calc(var(--sm) / var(--scaleFactor));
  --2xs: calc(var(--xs) / var(--scaleFactor));
  --lg: calc(var(--md) * var(--scaleFactor));
  --xl: calc(var(--lg) * var(--scaleFactor));
  --2xl: calc(var(--xl) * var(--scaleFactor));
  --wholestep: 1.618;
  --halfstep: 1.272;
  --quarterstep: 1.128;
  --eighthstep: 1.061;
  --wholestep-dec: 0.618;
  --halfstep-dec: 0.272;
  --quarterstep-dec: 0.128;
  --eighthstep-dec: 0.061;

  /* Font smoothing */
  font-family: "Inter", "Poppins", "DM Sans Variable", sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  margin: 0;
}
```

**Delete everything else:**
- All `--md-sys-color-*` variables (source of truth is `tokens/colors.js`)
- All `--md-ref-palette-*` tone variables (unused by components)
- All dark theme blocks (`@media prefers-color-scheme`, `[data-theme="dark"]`)
- All `--color-*` BPP variables (source of truth is `tokens/colors.js`)
- All `--light__*` / `--dark__*` LiftKit variables (unused)
- All `--bs-*` Bootstrap variables (migrate to MUI)
- All `--color-interactive-*` / `--color-status-*` / `--color-brand-*` variables
- Product card header CSS variables
- Shadow variables (move to JS tokens if used, otherwise delete)

### Phase 4: Migrate Remaining Component Files

**Raw hex cleanup** - 121 occurrences across 20 files:

| File Category | Count | Action |
|---------------|-------|--------|
| Test files (`__tests__/`) | ~50 | Replace hex with token imports in test assertions |
| Styleguide components | ~30 | These display color values; hex is acceptable for display purposes only |
| Sandbox files | ~15 | Delete or ignore (development only) |
| Production components | ~26 | Replace with semantic tokens |

**Production files requiring hex removal:**
- `JsonContentRenderer.js` - 6 occurrences
- `SearchModal.js` - 6 occurrences
- `FilterDebugger.js` - 1 occurrence (debug component, consider deletion)

**CSS file migration:**
- `CheckoutSteps.css` - Migrate keyframes and layout to MUI `sx` or `styled()`
- `App.scss` - Extract reCAPTCHA styles to a dedicated MUI-compatible approach
- `custom-bootstrap.scss` - Audit for remaining Bootstrap dependencies; migrate or delete

### Phase 5: Standardize Access Patterns

#### Allowed Patterns (2 only)

**Pattern A: String path (static semantic colors)**
```javascript
<Box sx={{ color: 'semantic.textPrimary', bgcolor: 'semantic.bgPaper' }} />
<Box sx={{ bgcolor: 'productCards.tutorial.header' }} />
<Box sx={{ color: 'navigation.text.primary' }} />
```

**Pattern B: Theme callback (dynamic/computed values)**
```javascript
<Box sx={(theme) => ({
  bgcolor: theme.palette.productCards[productType].header,
  color: theme.palette.productCards[productType].title,
  p: theme.spacingTokens.md,
})} />
```

#### Forbidden Patterns

```javascript
// FORBIDDEN: Direct scale access in components
sx={{ color: theme.palette.scales.purple[20] }}        // Use semantic token
sx={{ bgcolor: theme.palette.granite['020'] }}          // Deleted
sx={{ color: theme.palette.bpp.purple['020'] }}         // Deleted
sx={{ color: '#755085' }}                               // Raw hex

// FORBIDDEN: Old semantic paths
sx={{ bgcolor: theme.palette.semantic.cardHeader.tutorial }}   // Use productCards
sx={{ color: theme.palette.semantic.navigation.text.primary }} // Use navigation
```

### Phase 6: Tooling Enforcement

#### ESLint Rules

```javascript
// .eslintrc.js additions
rules: {
  'no-restricted-imports': ['error', {
    patterns: [
      {
        group: ['**/theme/tokens/*'],
        importNames: ['md3', 'scales', 'staticColors', 'darkMd3'],
        message: 'Components must use semantic tokens via useTheme(), not raw tokens.',
      },
      {
        group: ['**/theme/colors/*'],
        message: 'Deleted: use semantic/ layer instead.',
      },
    ],
  }],
}
```

#### Hex Color Lint Rule

Add a custom ESLint rule or use `eslint-plugin-no-hardcoded-colors` to flag hex literals in `sx` props and `styled()` calls within `src/components/`.

**Exceptions:** Test files, styleguide display components, and `src/theme/` internals.

#### CI Pre-merge Check

```bash
# Script: scripts/check-styling-standards.sh
# Fail if any hex color found in component files (excluding tests, styleguide)
grep -rn '#[0-9a-fA-F]\{3,8\}' src/components/ \
  --include='*.js' --include='*.jsx' --include='*.ts' --include='*.tsx' \
  --exclude-dir='__tests__' --exclude-dir='styleguide' --exclude-dir='sandbox' \
  && echo "FAIL: Raw hex colors found in components" && exit 1
```

### Phase 7: Developer Ergonomics

#### Style Helper Utilities

Add to `src/theme/utils/`:

```javascript
// src/theme/utils/responsive.js

/**
 * Creates responsive sx values using breakpoints.
 * Usage: responsiveValue({ xs: 1, md: 2, lg: 3 })
 */
export const responsiveValue = (values) => values;

/**
 * Composes multiple sx objects, later entries override earlier.
 * Usage: composeSx(baseStyles, variantStyles, conditionalStyles)
 */
export const composeSx = (...styles) =>
  styles.reduce((acc, style) => {
    if (!style) return acc;
    if (typeof style === 'function') {
      return (theme) => ({ ...resolveSx(acc, theme), ...style(theme) });
    }
    return { ...acc, ...style };
  }, {});

/**
 * Helper for common product card theming.
 * Usage: productCardSx(theme, 'tutorial')
 */
export const productCardSx = (theme, productType) => ({
  '& .card-header': {
    bgcolor: theme.palette.productCards[productType]?.header,
  },
  '& .card-actions': {
    bgcolor: theme.palette.productCards[productType]?.actions,
  },
  '& .card-badge': {
    bgcolor: theme.palette.productCards[productType]?.badge,
  },
});
```

#### Variant Documentation

Each custom MUI variant (e.g., `navAction`, `navPrimary`, `topNavAction`) should have a JSDoc comment in the component override file showing usage:

```javascript
/**
 * @variant navAction
 * @usage <Button variant="navAction">Menu Item</Button>
 * @description Text button for navigation menu items. White text, purple hover.
 */
```

### Phase 8: Accessibility Tokens

#### Focus & Disabled State Tokens

Add to `semantic/common.js`:

```javascript
export const a11y = {
  focusRing: `0 0 0 3px ${md3.primary}66`,       // 40% opacity focus ring
  focusRingError: `0 0 0 3px ${md3.error}66`,
  focusVisible: md3.primary,
  contrastBorder: md3.outline,                     // For low-contrast elements
};
```

#### WCAG Contrast Validation

Add a dev-only utility that checks semantic color pairs meet WCAG AA:

```javascript
// src/theme/utils/contrastCheck.js (dev-only)
const REQUIRED_PAIRS = [
  ['semantic.textPrimary', 'semantic.bgDefault'],     // Must be 4.5:1
  ['semantic.textSecondary', 'semantic.bgDefault'],    // Must be 4.5:1
  ['semantic.textOnPrimary', 'primary.main'],          // Must be 4.5:1
  ['productCards.tutorial.title', 'productCards.tutorial.header'], // Must be 4.5:1
];
```

#### Reduced Motion

Add to `theme/index.js` component defaults:

```javascript
components: {
  MuiCssBaseline: {
    styleOverrides: {
      '@media (prefers-reduced-motion: reduce)': {
        '*': {
          animationDuration: '0.001ms !important',
          transitionDuration: '0.001ms !important',
        },
      },
    },
  },
}
```

### Phase 9: Dark Mode Decision

**Current state:** Dark mode tokens exist in both CSS (`index.css` dark blocks) and JS (`darkMd3` export) but are unused. No MUI `colorSchemes` configuration exists.

**Options:**
1. **Delete dark mode artifacts** - Remove `darkMd3`, remove CSS dark blocks. Simplest.
2. **Implement properly** - Use MUI's `colorSchemes` with `darkMd3` values. Enables `useColorScheme()` hook.

**Recommendation:** Option 1 for now. Dark mode is not a product requirement. If needed later, `darkMd3` can be re-added with proper MUI integration. Delete dead code.

## Files to Delete

| File | Reason |
|------|--------|
| `src/theme/colors/semantic.js` | Superseded by `semantic/productCards.js` + `semantic/navigation.js` |
| `src/theme/colors/index.js` | Re-export layer, no longer needed |
| `src/misc/VATToggle.css` | Migrate to MUI or delete if unused |
| `src/misc/glass.css` | Migrate or delete |
| `src/stories/button.css` | Storybook should use theme |
| `src/stories/header.css` | Storybook should use theme |
| `src/stories/page.css` | Storybook should use theme |
| `src/components/sandbox/css/*.css` | Development sandbox, not production |

## Files to Heavily Modify

| File | Changes |
|------|---------|
| `src/index.css` | Reduce from ~675 lines to ~30 lines |
| `src/theme/index.js` | Remove all backward-compat wrappers, simplify to clean composition |
| `src/theme/tokens/colors.js` | Remove `legacyScales`, `createStringKeyScale`, `statusColors` |
| `src/App.scss` | Extract reCAPTCHA styles, delete unused App-* classes |
| `src/components/Ordering/CheckoutSteps/CheckoutSteps.css` | Migrate to MUI `sx`/`styled()` |

## Standardized Theme Shape (Post-Cleanup)

```javascript
const theme = createTheme({
  breakpoints: { values: { xs: 0, sm: 600, md: 960, lg: 1280, xl: 1920 } },

  typography: { /* h1-h6, body1-2, custom variants */ },

  palette: {
    // MUI standard roles (derived from md3)
    primary: { main, light, dark, contrastText },
    secondary: { main, contrastText },
    error: { main, contrastText },
    warning: { main, light, dark, contrastText },
    info: { main, light, dark, contrastText },
    success: { main, light, dark, contrastText },
    background: { default, paper },
    text: { primary, secondary },

    // Raw scales (for theme internals only, not components)
    scales: { purple, sky, mint, green, orange, pink, cobalt, granite, offwhite, yellow, red },

    // Semantic tokens (primary component interface)
    semantic: { textPrimary, textSecondary, bgDefault, bgPaper, borderDefault, statusError, ... },

    // Domain-specific semantics
    productCards: { tutorial, material, bundle, onlineClassroom, marking, markingVoucher },
    navigation: { text, border, background, button, mobile, megaMenu },
  },

  spacing: { xs3, xs2, xs, sm, md, lg, xl, xl15, xl2, xl3 },
  spacingTokens: { /* same as spacing, for direct access */ },

  components: { /* MUI component overrides with variants */ },
});
```

## Implementation Order

| Phase | Description | Dependencies |
|-------|-------------|-------------|
| 1 | Fix color value drift | None |
| 2a | Delete `colors/semantic.js`, migrate consumers | Phase 1 |
| 2b | Delete `legacyScales` | Phase 2a |
| 2c | Clean `theme/index.js` wrappers | Phase 2a, 2b |
| 2d | Delete `statusColors` | Phase 2c |
| 3 | Gut `index.css` | Phase 2d |
| 4 | Migrate remaining component hex literals | Phase 3 |
| 5 | Standardize access patterns | Phase 4 |
| 6 | Add ESLint rules and CI checks | Phase 5 |
| 7 | Add style helpers and variant docs | Phase 5 |
| 8 | Add accessibility tokens | Phase 5 |
| 9 | Delete dark mode artifacts | Phase 3 |

## Testing Strategy

- **Visual regression:** Manual comparison of navigation, product cards, checkout flow before/after each phase
- **Unit tests:** Theme structure snapshot test to catch accidental palette shape changes
- **Lint tests:** Verify ESLint rules catch forbidden patterns
- **Contrast tests:** Dev-only WCAG contrast checker for semantic color pairs
- **Smoke test:** Full application run after each phase to catch broken imports

## Non-Goals

- Dark mode implementation (deferred, dead code deleted)
- TypeScript migration of theme files (separate effort)
- Storybook visual testing setup (can be added later)
- CSS-in-JS migration of `CheckoutSteps.css` (small file, low priority)

## Success Criteria

| Metric | Before | Target |
|--------|--------|--------|
| `index.css` lines | 675 | < 40 |
| CSS custom properties | 430 | 16 (golden ratio only) |
| Color access patterns in components | 4 | 2 |
| Raw hex in `src/components/` (excl. tests/styleguide) | 26 | 0 |
| Semantic layer files | 2 (overlapping) | 1 canonical set |
| Backward-compat wrapper objects | 4 | 0 |
| Theme palette top-level color entries | 11 + bpp + liftkit | 0 (only standard MUI roles) |
