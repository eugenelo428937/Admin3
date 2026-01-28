# Feature Specification: Styling System Cleanup

**Feature Branch**: `20260116-styling-consolidation`
**Created**: 2025-01-16
**Updated**: 2025-01-27
**Status**: In Progress
**Supersedes**: `docs/plans/2025-01-16-styling-system-consolidation-design.md`
**Decision**: No backward compatibility. Legacy patterns will be deleted, not maintained.

## Problem Statement

The styling consolidation (Jan 16) established the correct architecture (tokens → semantic → components), but the implementation accumulated backward-compatibility layers that were never removed:

- **~430 CSS custom properties** in `index.css`, of which ~310 (72%) duplicate JS tokens
- **Two semantic layers** running in parallel (`colors/semantic.js` + `semantic/common.js`)
- **Three ways to access the same color** (`palette.granite['020']`, `palette.scales.granite[20]`, `palette.bpp.granite['020']`)
- **Four distinct access patterns** in components (string paths, theme callbacks, direct palette, legacy semantic)
- **121 raw hex literals** scattered across 20 component files
- **Color value drift** between CSS vars and JS tokens (e.g., `secondary`: CSS `#765085` vs JS `#69596D`)

## Goals

| Priority | Goal | Measurable Target |
|----------|------|-------------------|
| 1 | Single source of truth | One color definition per value, in `tokens/colors.js` only |
| 2 | Zero raw hex in components | 0 hex literals in `src/components/` (enforced by lint) |
| 3 | Two access patterns max | String paths for static, theme callbacks for dynamic |
| 4 | Minimal CSS footprint | `index.css` < 40 lines (fonts, golden ratio vars, body reset) |
| 5 | Developer ergonomics | Autocomplete for all semantic tokens, helper utilities |
| 6 | Accessibility compliance | WCAG AA contrast for all semantic pairs, focus/disabled tokens |

## User Scenarios & Testing

### User Story 1 - Single Source Token Access (Priority: P1)

A developer styling a component accesses semantic tokens directly through the MUI theme's sx prop, finding the correct color or spacing value without searching through multiple files.

**Acceptance Scenarios**:

1. **Given** a developer is styling a new component, **When** they use `sx={{ bgcolor: 'semantic.bgPaper' }}`, **Then** the component renders with the correct background color from the theme.
2. **Given** a developer needs a product-specific color, **When** they use `sx={{ color: 'productCards.tutorial.header' }}`, **Then** the component renders with the correct tutorial purple color.
3. **Given** a developer uses IDE autocomplete in the sx prop, **When** they type `theme.palette.`, **Then** they see `semantic`, `productCards`, and `navigation` options only (no `bpp`, `liftkit`, `md3`, or top-level color names).

---

### User Story 2 - Single Source Product Card Theming (Priority: P1)

A developer updating product card colors changes values in one location (`tokens/colors.js`) and those changes propagate to all themed components automatically.

**Acceptance Scenarios**:

1. **Given** the tutorial header color is defined as `scales.purple[20]`, **When** a developer changes the value in `tokens/colors.js`, **Then** all tutorial card headers reflect the new color without modifying any other files.
2. **Given** semantic mappings reference color tokens, **When** a raw color value changes, **Then** no code changes are needed in component files or semantic layer files.

---

### User Story 3 - Clean Navigation Theming (Priority: P2)

A developer working on navigation components finds all navigation-related styling tokens in one place (`semantic/navigation.js`) with no legacy `semanticColors.navigation.*` paths.

**Acceptance Scenarios**:

1. **Given** a developer is styling a nav link, **When** they use `sx={{ color: 'navigation.text.primary' }}`, **Then** the link renders with the correct navigation text color.
2. **Given** `colors/semantic.js` has been deleted, **When** a developer inspects navigation components, **Then** no references to `semanticColors.*` remain.

---

### User Story 4 - Minimal CSS Footprint (Priority: P2)

After cleanup, `index.css` contains only golden ratio scale variables, font smoothing, and body reset. All color definitions live in JS tokens.

**Acceptance Scenarios**:

1. **Given** all color CSS variables have been deleted from `index.css`, **When** the application runs, **Then** all styling renders correctly from MUI theme values.
2. **Given** `index.css` has been reduced, **When** a developer counts lines, **Then** the file is under 40 lines.

---

### User Story 5 - Lint-Enforced Standards (Priority: P3)

ESLint rules prevent developers from importing raw tokens in components or using hex color literals in sx props.

**Acceptance Scenarios**:

1. **Given** a developer imports from `theme/tokens/colors`, **When** ESLint runs, **Then** a clear error message explains to use semantic tokens instead.
2. **Given** a developer uses a hex literal in an sx prop, **When** the CI check runs, **Then** the build fails with a clear message.

---

### User Story 6 - Accessibility Tokens (Priority: P3)

Semantic tokens include focus ring, disabled state, and contrast-validated color pairs. `prefers-reduced-motion` is handled globally.

**Acceptance Scenarios**:

1. **Given** focus/disabled tokens exist in `semantic/common.js`, **When** a developer applies focus styling, **Then** they use `a11y.focusRing` instead of ad-hoc box-shadow values.
2. **Given** `MuiCssBaseline` includes a `prefers-reduced-motion` override, **When** a user has reduced motion enabled, **Then** all animations and transitions are disabled.

---

### Edge Cases

- **Deleted import paths**: Build will fail with clear error messages indicating the import path no longer exists (e.g., `theme/colors/semantic.js`, `theme/colors/index.js`).
- **Missing product type**: Components using dynamic product type lookup should include fallback handling.
- **Third-party CSS variables**: Deletion of `--color-*` CSS vars does not affect third-party libraries (vars are app-specific).

## Requirements

### Functional Requirements

- **FR-001**: Theme MUST export all color values from a single source file (`tokens/colors.js`)
- **FR-002**: Theme MUST provide flat semantic tokens for common styling needs (text, background, borders, status)
- **FR-003**: Theme MUST provide nested semantic tokens for domain-specific styling (product cards, navigation)
- **FR-004**: Theme MUST support all six product card types with consistent token structure
- **FR-005**: `index.css` MUST contain fewer than 40 lines (golden ratio vars, font smoothing, body reset only)
- **FR-006**: Theme MUST maintain the existing visual appearance of all components after migration
- **FR-007**: Theme MUST provide raw color scales access via `theme.palette.scales` for theme internals only
- **FR-008**: All legacy backward-compatibility wrappers (`colorTheme`, `palettesTheme`, `bpp`, `liftkit`, top-level palette colors) MUST be deleted
- **FR-009**: `colors/semantic.js` and `colors/index.js` MUST be deleted (superseded by `semantic/*.js`)
- **FR-010**: `legacyScales`, `createStringKeyScale`, and `statusColors` MUST be deleted from `tokens/colors.js`
- **FR-011**: `darkMd3` MUST be deleted (dark mode not a product requirement)
- **FR-012**: ESLint MUST block components from importing raw tokens directly
- **FR-013**: CI MUST block raw hex color literals in component files
- **FR-014**: Semantic layer MUST include accessibility tokens (focus ring, disabled state)
- **FR-015**: Theme MUST include `prefers-reduced-motion` global override via `MuiCssBaseline`

### Key Entities

- **Color Token**: A raw hex color value with a numeric scale key (e.g., `purple[20]: '#dfd4f7'`)
- **Semantic Token**: A named reference mapping purpose to a color token (e.g., `textPrimary: md3.onSurface`)
- **Component Override**: MUI theme configuration that applies default styles to a component type
- **Product Card Semantic**: A nested object containing all color tokens for a specific product type

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

## Architecture: Three Clean Layers

```
Layer 1: Tokens (raw values, never imported by components)
  src/theme/tokens/colors.js      - All hex values
  src/theme/tokens/typography.js   - Font families, sizes, weights
  src/theme/tokens/spacing.js      - Spacing scale

Layer 2: Semantic (purpose-driven mappings, the primary component interface)
  src/theme/semantic/common.js        - text, bg, border, status, action, a11y tokens
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

## Assumptions

- The existing visual appearance of components is the correct reference - migration should preserve, not change, the look
- Numeric scale keys (10, 20, 30...) are preferred over string keys ('010', '020')
- MD3 color naming conventions are appropriate for system colors
- JS values in `tokens/colors.js` are the authoritative source (from Material Theme Builder)
- Dark mode is NOT a product requirement and all related dead code will be deleted
- Bootstrap may still be needed for checkout/forms - audit before deletion

## Dependencies

- MUI v7 (already in use)
- Existing theme infrastructure in `src/theme/`
- Current component implementations that will be updated to use new token paths

## Out of Scope

- Dark mode implementation (dead code deleted, re-add if needed later)
- TypeScript migration of theme files (separate effort)
- Storybook visual testing setup (can be added later)
- CSS-in-JS migration of `CheckoutSteps.css` keyframes (small file, low priority)

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
| `src/theme/tokens/colors.js` | Remove `legacyScales`, `createStringKeyScale`, `statusColors`, `darkMd3` |
| `src/App.scss` | Extract reCAPTCHA styles, delete unused App-* classes |
