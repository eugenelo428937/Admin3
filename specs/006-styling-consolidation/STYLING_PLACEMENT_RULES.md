# Styling Placement Rules

This document defines the rules for where to place styling elements in the Admin3 frontend codebase. Following these rules ensures consistency, maintainability, and proper separation of concerns.

## Architecture Overview

The styling system follows a **layered architecture** with clear responsibilities:

```
┌─────────────────────────────────────────────────────────────────┐
│                    Component Layer                               │
│  (sx prop, component-local styles, inline styling)              │
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
│  src/styles/ (utility classes, CSS variables, legacy CSS)       │
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
1. **Never import tokens directly in components** - Use semantic tokens instead
2. **All raw values live here** - No hardcoded values elsewhere
3. **Export both individual values and consolidated objects**

### Example
```javascript
// tokens/colors.js
export const scales = {
  purple: {
    10: '#f1eefc',
    20: '#dfd4f7',
    // ...
  }
};
```

---

## Layer 2: Semantic Layer (`src/theme/semantic/`)

### Purpose
Map purpose-driven names to raw token values. Provides meaning and context.

### What Goes Here
- **Common semantics** (`common.js`): Text, background, action, border, status colors
- **Product card semantics** (`productCards.js`): Per-product-type color mappings
- **Navigation semantics** (`navigation.js`): Navigation-specific color tokens
- **Domain-specific semantics**: New domains as needed

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
  primary: md3.onSurface,      // Main text
  secondary: md3.onSurfaceVariant, // Muted text
  hint: scales.granite[50],    // Hint/placeholder text
};
```

### Usage Pattern
```javascript
// In theme/index.js - exposed on theme.palette
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
```
theme/components/
├── index.js           # Aggregates all overrides
├── alerts.js          # MuiAlert overrides
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
1. **Import from semantic layer** - Never use raw hex values
2. **One file per component category** - alerts.js, buttons.js, navigation.js
3. **Document variants with comments** - Explain when to use each variant
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

### When to Create a Variant
- Same component needs multiple distinct appearances
- Appearance tied to specific feature/context (navigation, product cards)
- More than 3 components use the same custom styling

---

## Layer 4: Global CSS (`src/styles/`)

### Purpose
Global CSS variables, utility classes, and legacy component CSS.

### Directory Structure
```
styles/
├── liftkit-css/           # Utility classes (flexbox, grid, spacing)
│   ├── globals.css        # CSS custom properties
│   ├── flexboxes.css      # Flex utilities
│   ├── gaps.css           # Gap utilities
│   └── ...
├── bpp-color-system.css   # Legacy color variables
├── navbar.css             # Legacy navbar CSS
├── product_card.css       # Legacy product card CSS
└── ...
```

### Rules
1. **Prefer MUI/theme over new CSS** - Only add CSS for gaps in MUI capability
2. **Utility classes are OK** - Flexbox helpers, spacing utilities
3. **Migrate legacy CSS to theme** - Move styles to component overrides when refactoring
4. **CSS variables in globals.css** - Centralize custom properties

### When to Use CSS Files
- Bootstrap/utility class patterns
- Complex animations/keyframes
- Third-party library overrides
- Legacy code not yet migrated

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
4. **Document accessibility requirements** - Touch targets, contrast ratios

### Example
```javascript
// components/Product/ProductCard/Tutorial/tutorialStyles.js
export const TOUCH_TARGET_SIZE = '3rem'; // 48px - WCAG 2.1 Level AAA

export const touchButtonStyle = {
  minHeight: TOUCH_TARGET_SIZE,
};

export const responsiveGridSpacing = {
  xs: 2,
  md: 3,
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
| Utility class | `styles/liftkit-css/` | `.d-flex`, `.gap-md` |
| Complex animation | `styles/*.css` | Keyframe animation |

---

## Best Practices

### DO
- Import from the appropriate layer (tokens → semantic → components)
- Use semantic token names that describe purpose, not appearance
- Document new variants with JSDoc comments
- Keep styles close to where they're used when component-specific
- Use MUI's `sx` prop for one-off styling

### DON'T
- Define raw hex values in components
- Create CSS files for new features (use theme system)
- Duplicate styles across multiple files
- Use `!important` except in rare legacy override situations
- Hardcode spacing/color values in JSX

---

## Migration Path for Legacy Styles

When refactoring legacy CSS:

1. **Identify the raw values** - Colors, spacing, fonts
2. **Add to tokens layer** - If not already present
3. **Create semantic mappings** - Purpose-driven names
4. **Create component overrides** - If global behavior needed
5. **Update components** - Use new theme paths
6. **Remove legacy CSS** - Once all usages migrated

---

## Quick Reference

### Importing Patterns

```javascript
// In semantic files - import from tokens
import { md3, scales } from '../tokens/colors';

// In component overrides - import from semantic
import { navigation } from '../semantic/navigation';
import { semantic } from '../semantic/common';

// In components - use theme paths via sx prop
sx={{ color: 'semantic.textPrimary' }}
sx={{ bgcolor: 'navigation.background.default' }}
sx={(theme) => ({ color: theme.palette.productCards.tutorial.title })}

// In components - use theme hook for complex access
const theme = useTheme();
const headerColor = theme.palette.productCards[productType].header;
```

### File Naming Conventions

| Layer | Convention | Example |
|-------|------------|---------|
| Tokens | `{domain}.js` | `colors.js`, `spacing.js` |
| Semantic | `{feature}.js` | `navigation.js`, `productCards.js` |
| Components | `{category}.js` | `buttons.js`, `navigation.js` |
| Component-local | `{Component}Styles.js` | `tutorialStyles.js` |

---

## Legacy vs. New Semantic Layer

The codebase currently has two semantic layer implementations during migration:

### Legacy Semantic Colors (`theme/colors/semantic.js`)
- **Status**: Transitioning to new layer
- **Structure**: Product-centric groupings (cardHeader, cardActions, cardText, etc.)
- **Access**: `theme.palette.semantic.cardHeader.tutorial`
- **Imports from**: `colorTheme` (legacy palette)

### New Semantic Layer (`theme/semantic/*.js`)
- **Status**: Preferred for new code
- **Structure**: Purpose-driven flat tokens + domain files
- **Access**: `theme.palette.semantic.textPrimary`, `theme.palette.productCards.tutorial.header`
- **Imports from**: `tokens/colors.js` (new token layer)

### Migration Strategy
1. New code should use `theme/semantic/*.js` files
2. Existing code using `colors/semantic.js` continues to work
3. When refactoring components, migrate to new semantic layer
4. The `theme/index.js` merges both for backward compatibility

### Which to Use?

| Scenario | Use |
|----------|-----|
| New feature | `theme/semantic/*.js` |
| Existing code maintenance | Keep current, no migration needed |
| Refactoring component | Migrate to `theme/semantic/*.js` |
| Adding new product type | Add to `theme/semantic/productCards.js` |
| Navigation styling | `theme/semantic/navigation.js` |

---

## Changelog

| Date | Change |
|------|--------|
| 2026-01-21 | Initial documentation created |
