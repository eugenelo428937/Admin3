# Data Model: Token Structure Definitions

**Feature**: 20260116-styling-consolidation
**Updated**: 2025-01-27
**Decision**: No backward compatibility. No `legacyScales`, `statusColors`, `darkMd3`, or wrapper objects.

## Overview

This document defines the structure of color tokens, semantic mappings, and theme composition. These are JavaScript object structures that form the styling system's data model.

## Token Layer

### colors (tokens/colors.js)

The single source of truth for all raw color values.

```typescript
interface Colors {
  md3: MD3SystemColors;      // Material Design 3 system colors
  scales: BPPColorScales;    // BPP brand color scales
  staticColors: StaticColors; // Never-changing values
}

interface MD3SystemColors {
  // Primary
  primary: string;           // #755085
  onPrimary: string;         // #FFFFFF
  primaryContainer: string;  // #F7D8FF
  onPrimaryContainer: string;// #5C396C

  // Secondary
  secondary: string;         // #69596D
  onSecondary: string;
  secondaryContainer: string;// #F1DCF4
  onSecondaryContainer: string;// #504255

  // Tertiary
  tertiary: string;
  onTertiary: string;
  tertiaryContainer: string;
  onTertiaryContainer: string;

  // Error
  error: string;
  onError: string;
  errorContainer: string;
  onErrorContainer: string;

  // Surface
  surface: string;
  onSurface: string;         // #1C1B20
  surfaceVariant: string;    // #E5E1EC
  onSurfaceVariant: string;  // #47464F
  surfaceContainer: string;
  surfaceContainerLow: string;
  surfaceContainerHigh: string;
  surfaceContainerHighest: string;
  surfaceContainerLowest: string;

  // Outline
  outline: string;           // #787680
  outlineVariant: string;    // #C9C5D0

  // Inverse
  inverseSurface: string;
  inverseOnSurface: string;
  inversePrimary: string;

  // Utility
  shadow: string;
  scrim: string;
}

interface BPPColorScales {
  purple: ColorScale;
  sky: ColorScale;
  mint: ColorScale;
  green: ColorScale;
  orange: ColorScale;
  pink: ColorScale;
  cobalt: ColorScale;
  granite: ColorScale;
  offwhite: ColorScale;
  yellow: ColorScale;
  red: ColorScale;
}

interface ColorScale {
  10: string;   // Lightest
  20: string;
  30: string;
  40: string;
  50: string;   // Base
  60: string;
  70: string;
  80: string;
  90: string;
  100: string;  // Darkest
  110?: string; // Accent (optional)
}

interface StaticColors {
  white: '#FFFFFF';
  black: '#000000';
  transparent: 'transparent';
}
```

### Deleted Exports (No Longer in tokens/colors.js)

| Export | Reason for Deletion |
|--------|---------------------|
| `legacyScales` | String-keyed duplicate of `scales`. Use `scales` with numeric keys. |
| `createStringKeyScale()` | Only existed to create `legacyScales`. |
| `statusColors` | Misnamed LiftKit palette with different hex values from `md3`. MUI palette roles now derive directly from `md3`/`scales`. |
| `darkMd3` | Dark mode is not a product requirement. Dead code. |

## Semantic Layer

### commonSemantics (semantic/common.js)

Flat tokens for everyday styling needs.

```typescript
interface CommonSemantics {
  // Text
  textPrimary: string;
  textSecondary: string;
  textDisabled: string;
  textInverse: string;
  textOnPrimary: string;
  textHint: string;

  // Backgrounds
  bgDefault: string;
  bgPaper: string;
  bgElevated: string;
  bgSubtle: string;

  // Interactive
  actionHover: string;
  actionSelected: string;
  actionDisabled: string;

  // Borders
  borderDefault: string;
  borderStrong: string;
  borderSubtle: string;

  // Status
  statusError: string;
  statusWarning: string;
  statusSuccess: string;
  statusInfo: string;
  statusWarningBg: string;

  // Accessibility
  a11y: {
    focusRing: string;        // Box-shadow value with 40% opacity
    focusRingError: string;
    focusVisible: string;
    contrastBorder: string;
  };
}
```

### Status Tokens (semantic/common.js)

Used by component overrides (alerts, etc.) to replace the deleted `statusColors`.

```typescript
interface StatusTokens {
  error: string;
  errorContainer: string;
  onErrorContainer: string;
  warning: string;
  warningContainer: string;
  onWarningContainer: string;
  success: string;
  successContainer: string;
  onSuccessContainer: string;
  info: string;
  infoContainer: string;
  onInfoContainer: string;
}
```

### productCardSemantics (semantic/productCards.js)

Nested tokens for product card theming.

```typescript
type ProductType =
  | 'tutorial'
  | 'material'
  | 'bundle'
  | 'onlineClassroom'
  | 'marking'
  | 'markingVoucher';

interface ProductCardColors {
  header: string;       // Card header background
  actions: string;      // Action area background
  badge: string;        // Badge background
  title: string;        // Title text color
  subtitle: string;     // Subtitle text color
  button: string;       // Button background
  buttonHover: string;  // Button hover background
  icon: string;         // Icon color
}

type ProductCardSemantics = Record<ProductType, ProductCardColors>;
```

### navigationSemantics (semantic/navigation.js)

Tokens for navigation components.

```typescript
interface NavigationSemantics {
  text: {
    primary: string;
    secondary: string;
    muted: string;
  };
  border: {
    subtle: string;
    divider: string;
  };
  background: {
    default: string;
    hover: string;
    active: string;
  };
  button: {
    color: string;
    hoverColor: string;
  };
  mobile: {
    icon: string;
    border: string;
    title: string;
    background: string;
  };
}
```

## Theme Composition (Post-Cleanup)

### Final Theme Palette Structure

```typescript
interface ThemePalette {
  // MUI standard roles (derived directly from md3 and scales)
  primary: { main: string; light: string; dark: string; contrastText: string };
  secondary: { main: string; contrastText: string };
  error: { main: string; contrastText: string };
  warning: { main: string; light: string; dark: string; contrastText: string };
  info: { main: string; light: string; dark: string; contrastText: string };
  success: { main: string; light: string; dark: string; contrastText: string };
  background: { default: string; paper: string };
  text: { primary: string; secondary: string };

  // Raw scales (for theme internals only, NOT for components)
  scales: BPPColorScales;

  // Semantic tokens (primary component interface)
  semantic: CommonSemantics;

  // Domain-specific semantics
  productCards: ProductCardSemantics;
  navigation: NavigationSemantics;
}
```

### Deleted Palette Entries

| Old Path | Replacement |
|----------|-------------|
| `palette.bpp.*` | Use `palette.scales.*` (theme internals) or semantic tokens (components) |
| `palette.liftkit.*` | Use `palette.semantic.*` |
| `palette.md3.*` | Use standard MUI roles (`palette.primary`, etc.) |
| `palette.offwhite` (top-level) | Use `palette.scales.offwhite` (theme internals only) |
| `palette.granite` (top-level) | Use `palette.scales.granite` (theme internals only) |
| `palette.purple` (top-level) | Use `palette.scales.purple` (theme internals only) |
| `palette.semantic.cardHeader.*` | Use `palette.productCards.*.header` |
| `palette.semantic.navigation.*` | Use `palette.navigation.*` |

## Relationships

```text
┌─────────────────────────────────────────────────────────────┐
│                    tokens/colors.js                          │
│  ┌─────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │   md3   │  │    scales    │  │ staticColors │           │
│  └────┬────┘  └──────┬───────┘  └──────┬───────┘           │
└───────┼──────────────┼─────────────────┼────────────────────┘
        │              │                 │
        ▼              ▼                 ▼
┌─────────────────────────────────────────────────────────────┐
│                    semantic/*.js                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   common     │  │ productCards │  │   navigation     │  │
│  │ (flat+a11y)  │  │  (nested)    │  │    (nested)      │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
└─────────┼─────────────────┼───────────────────┼─────────────┘
          │                 │                   │
          ▼                 ▼                   ▼
┌─────────────────────────────────────────────────────────────┐
│                    theme/index.js                            │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                  palette                               │  │
│  │  primary, secondary, error, ...  (MUI standard)       │  │
│  │  semantic: { ... }               (flat + a11y)        │  │
│  │  productCards: { ... }           (nested)             │  │
│  │  navigation: { ... }             (nested)             │  │
│  │  scales: { ... }                 (theme internals)    │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Validation Rules

1. **Token uniqueness**: Each color value defined exactly once in `tokens/colors.js`
2. **Semantic references**: All semantic tokens must reference values from `tokens/colors.js`
3. **No circular imports**: Token layer cannot import from semantic layer
4. **Product type coverage**: All 6 product types must have complete `ProductCardColors` objects
5. **No legacy exports**: `legacyScales`, `statusColors`, `darkMd3` must not exist
6. **No backward-compat wrappers**: `colorTheme`, `palettesTheme`, `bpp`, `liftkit` must not exist in palette
7. **Component isolation**: Components must not import from `tokens/` or `colors/` directories
