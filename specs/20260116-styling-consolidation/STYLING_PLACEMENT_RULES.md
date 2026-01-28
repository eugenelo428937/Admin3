# Styling Placement Rules

This document defines the rules for where to place styling elements in the Admin3 frontend codebase. Following these rules ensures consistency, maintainability, and proper separation of concerns.

**Updated**: 2025-01-27
**Decision**: No backward compatibility. No legacy semantic layer. No CSS color variables.

## Architecture Overview

```text
┌─────────────────────────────────────────────────────────────────┐
│                    Component Layer                               │
│  (sx prop string paths or theme callbacks only)                 │
├─────────────────────────────────────────────────────────────────┤
│                 Component Overrides Layer                        │
│  src/theme/components/ (MUI styleOverrides, custom variants)    │
├─────────────────────────────────────────────────────────────────┤
│                    Semantic Layer                                │
│  src/theme/semantic/ (purpose-driven token mappings)            │
├─────────────────────────────────────────────────────────────────┤
│                     Token Layer                                  │
│  src/theme/tokens/ (raw primitive values)                       │
├─────────────────────────────────────────────────────────────────┤
│                    Global CSS Layer                              │
│  src/index.css (golden ratio vars, font smoothing, body reset)  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Layer 1: Token Layer (`src/theme/tokens/`)

### Purpose

Single source of truth for raw design primitive values.

### What Goes Here

- **Color scales** (`colors.js`): Raw hex values, MD3 system colors, BPP brand scales
- **Typography tokens** (`typography.js`): Font families, sizes, weights, line heights
- **Spacing tokens** (`spacing.js`): Spacing scale, gaps, padding, border radius

### Rules

1. **Never import tokens directly in components** - Use semantic tokens via `sx` prop
2. **All raw values live here** - No hardcoded hex values elsewhere
3. **Export both individual values and consolidated objects**
4. **No legacy exports** - No `legacyScales`, `statusColors`, or `darkMd3`

### Example

```javascript
// tokens/colors.js
export const scales = {
  purple: {
    10: '#f1eefc',
    20: '#dfd4f7',
    // ... numeric keys only
  }
};
```

---

## Layer 2: Semantic Layer (`src/theme/semantic/`)

### Purpose

Map purpose-driven names to raw token values. Provides meaning and context.

### What Goes Here

- **Common semantics** (`common.js`): Text, background, action, border, status, a11y colors
- **Product card semantics** (`productCards.js`): Per-product-type color mappings
- **Navigation semantics** (`navigation.js`): Navigation-specific color tokens

### Rules

1. **Always import from tokens layer** - Never define raw hex values here
2. **Use descriptive, purpose-driven names** - `textPrimary`, not `darkGray`
3. **Group by usage context** - text, background, action, border, status
4. **One file per domain/feature** - navigation.js, productCards.js, etc.

### Example

```javascript
// semantic/common.js
import { md3, scales } from '../tokens/colors';

export const text = {
  primary: md3.onSurface,
  secondary: md3.onSurfaceVariant,
  hint: scales.granite[50],
};
```

### Usage Pattern

```javascript
// In components via sx prop
sx={{ color: 'semantic.textPrimary' }}
sx={{ bgcolor: 'productCards.tutorial.header' }}
sx={{ color: 'navigation.text.primary' }}
```

---

## Layer 3: Component Overrides (`src/theme/components/`)

### Purpose

MUI component styleOverrides and custom variants that apply globally.

### What Goes Here

- **MUI component overrides** - Default styling for all MUI components
- **Custom variants** - New variant props for MUI components
- **Global component behavior** - Consistent look across the app

### Directory Structure

```text
theme/components/
├── index.js           # Aggregates all overrides
├── alerts.js          # MuiAlert overrides (uses status tokens from semantic)
├── buttons.js         # MuiButton overrides and variants
├── inputs.js          # MuiTextField, MuiInput overrides
├── navigation.js      # MuiAppBar, MuiTabs, MuiMenuItem variants
├── misc.js            # Other component overrides
└── cards/
    ├── index.js       # Card overrides aggregator
    ├── baseProductCard.js
    ├── tutorialCard.js
    ├── materialCard.js
    └── ...
```

### Rules

1. **Import from semantic or tokens layer** - Never use raw hex values
2. **One file per component category** - alerts.js, buttons.js, navigation.js
3. **Document variants with JSDoc** - `@variant`, `@usage`, `@description`
4. **Follow MUI override structure** - `styleOverrides` and `variants` keys

### Example

```javascript
// components/navigation.js
import { navigation } from '../semantic/navigation';

export const navigationOverrides = {
  MuiButton: {
    variants: [
      {
        props: { variant: 'navPrimary' },
        style: {
          color: navigation.button.color,
          '&:hover': {
            backgroundColor: navigation.button.hoverBackground,
          },
        },
      },
    ],
  },
};
```

---

## Layer 4: Global CSS (`src/index.css`)

### Purpose

Minimal global CSS for things that cannot be in MUI theme.

### What Goes Here (post-cleanup)

- **Golden ratio scale variables** - CSS custom properties for responsive typography
- **Font smoothing** - Anti-aliasing settings
- **Body reset** - `margin: 0`

### Rules

1. **No color variables** - All colors in JS tokens
2. **No dark mode blocks** - Deleted
3. **No Bootstrap/LiftKit variables** - Deleted
4. **Keep under 40 lines**

---

## Layer 5: Component-Level Styles

### Purpose

Styles specific to a single component or component group.

### What Goes Here

- **Constants** - Touch target sizes, breakpoint values
- **Component-local utilities** - Shared styles within a feature
- **Responsive configuration** - Grid spacing, layout breakpoints

### Rules

1. **Keep close to usage** - In component folder or adjacent file
2. **Export constants, not full style objects** - Let components compose
3. **Name files descriptively** - `tutorialStyles.js`, not `styles.js`
4. **No hex colors** - Use theme tokens via callback

### Example

```javascript
// components/Product/ProductCard/Tutorial/tutorialStyles.js
export const TOUCH_TARGET_SIZE = '3rem'; // 48px - WCAG 2.1 Level AAA

export const touchButtonStyle = {
  minHeight: TOUCH_TARGET_SIZE,
};
```

---

## Decision Matrix: Where Does This Style Go?

| Style Type | Location | Example |
|------------|----------|---------|
| Raw color value | `tokens/colors.js` | `#755085` |
| Purpose-driven color | `semantic/*.js` | `textPrimary`, `statusError` |
| MUI component default | `components/*.js` | AppBar background color |
| MUI component variant | `components/*.js` | `variant="navPrimary"` |
| Product-type theming | `semantic/productCards.js` | Tutorial header color |
| Navigation theming | `semantic/navigation.js` | Menu item hover |
| Component constant | `ComponentStyles.js` | Touch target size |
| One-off inline style | `sx` prop | Unique spacing adjustment |
| Keyframe animation | `.css` file | Cart expand/collapse |
| Golden ratio vars | `index.css` | `--scaleFactor`, `--md` |

---

## Two Access Patterns (Enforced)

### Pattern A: String Path

```javascript
sx={{ color: 'semantic.textPrimary' }}
sx={{ bgcolor: 'productCards.tutorial.header' }}
sx={{ borderColor: 'navigation.border.subtle' }}
```

### Pattern B: Theme Callback

```javascript
sx={(theme) => ({
  bgcolor: theme.palette.productCards[productType].header,
  color: theme.palette.productCards[productType].title,
  p: theme.spacingTokens.md,
})}
```

### Forbidden

```javascript
// FORBIDDEN - all of these trigger ESLint or CI errors:
import { scales } from '../theme/tokens/colors';       // ESLint: no-restricted-imports
sx={{ color: '#755085' }}                               // CI: hex-literal check
sx={{ bgcolor: theme.palette.granite['020'] }}           // Deleted path
sx={{ color: theme.palette.bpp.purple['020'] }}          // Deleted path
sx={{ color: theme.palette.liftkit.light.onSurface }}    // Deleted path
sx={{ bgcolor: theme.palette.semantic.cardHeader.tutorial }} // Old semantic, deleted
```

---

## Best Practices

### DO

- Use `sx={{ color: 'semantic.textPrimary' }}` for known values
- Use `sx={(theme) => ...}` for dynamic/computed values
- Import from the appropriate layer (tokens → semantic → components)
- Document new variants with JSDoc comments
- Keep styles close to where they're used when component-specific
- Use accessibility tokens for focus states

### DON'T

- Define raw hex values in components
- Create new CSS files for new features (use theme system)
- Duplicate styles across multiple files
- Use `!important` except in rare third-party override situations
- Import directly from `tokens/` in component files
- Use deleted paths (`palette.granite`, `palette.bpp`, `palette.liftkit`)

---

## Importing Patterns

```javascript
// In semantic files - import from tokens
import { md3, scales } from '../tokens/colors';

// In component overrides - import from semantic or tokens
import { navigation } from '../semantic/navigation';
import { status } from '../semantic/common';

// In components - use theme paths via sx prop ONLY
sx={{ color: 'semantic.textPrimary' }}
sx={{ bgcolor: 'navigation.background.default' }}
sx={(theme) => ({ color: theme.palette.productCards.tutorial.title })}

// In components - use theme hook for complex access
const theme = useTheme();
const headerColor = theme.palette.productCards[productType].header;
```

---

## File Naming Conventions

| Layer | Convention | Example |
|-------|------------|---------|
| Tokens | `{domain}.js` | `colors.js`, `spacing.js` |
| Semantic | `{feature}.js` | `navigation.js`, `productCards.js` |
| Components | `{category}.js` | `buttons.js`, `navigation.js` |
| Component-local | `{Component}Styles.js` | `tutorialStyles.js` |

---

## Changelog

| Date | Change |
|------|--------|
| 2026-01-21 | Initial documentation created |
| 2025-01-27 | Removed legacy semantic layer section. Removed CSS color variables. Added forbidden patterns. Updated to reflect no-backward-compat decision. |
