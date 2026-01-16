# Data Model: Token Structure Definitions

**Feature**: 006-styling-consolidation
**Date**: 2025-01-16

## Overview

This document defines the structure of color tokens, semantic mappings, and theme composition. These are not database entities but JavaScript object structures that form the styling system's data model.

## Token Layer

### colors (tokens/colors.js)

The single source of truth for all raw color values.

```typescript
interface Colors {
  md3: MD3SystemColors;      // Material Design 3 system colors
  scales: BPPColorScales;    // BPP brand color scales
  static: StaticColors;      // Never-changing values
}

interface MD3SystemColors {
  // Primary
  primary: string;           // #755085
  onPrimary: string;         // #FFFFFF
  primaryContainer: string;  // #F7D8FF
  onPrimaryContainer: string;// #5C396C

  // Secondary
  secondary: string;
  onSecondary: string;
  secondaryContainer: string;
  onSecondaryContainer: string;

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
  onSurface: string;
  surfaceVariant: string;
  onSurfaceVariant: string;
  surfaceContainer: string;
  surfaceContainerLow: string;
  surfaceContainerHigh: string;
  surfaceContainerHighest: string;
  surfaceContainerLowest: string;

  // Outline
  outline: string;
  outlineVariant: string;

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

### darkColors (tokens/colors.js)

Override values for dark mode (subset of MD3SystemColors).

```typescript
interface DarkColors {
  md3: Partial<MD3SystemColors>;  // Only values that change
}
```

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

  // Status
  statusError: string;
  statusWarning: string;
  statusSuccess: string;
  statusInfo: string;
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

## Theme Composition

### Final Theme Palette Structure

```typescript
interface ThemePalette {
  // MUI standard roles
  primary: MUIPaletteColor;
  secondary: MUIPaletteColor;
  error: MUIPaletteColor;
  warning: MUIPaletteColor;
  info: MUIPaletteColor;
  success: MUIPaletteColor;
  background: { default: string; paper: string };
  text: { primary: string; secondary: string };

  // Custom extensions
  scales: BPPColorScales;           // Raw access
  semantic: CommonSemantics;        // Flat tokens
  productCards: ProductCardSemantics; // Product theming
  navigation: NavigationSemantics;  // Nav tokens
}
```

## Relationships

```text
┌─────────────────────────────────────────────────────────────┐
│                    tokens/colors.js                         │
│  ┌─────────┐  ┌──────────────┐  ┌────────────┐             │
│  │  md3    │  │   scales     │  │   static   │             │
│  └────┬────┘  └──────┬───────┘  └─────┬──────┘             │
└───────┼──────────────┼────────────────┼─────────────────────┘
        │              │                │
        ▼              ▼                ▼
┌─────────────────────────────────────────────────────────────┐
│                    semantic/*.js                            │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐    │
│  │   common    │  │ productCards │  │   navigation    │    │
│  │  (flat)     │  │  (nested)    │  │    (nested)     │    │
│  └──────┬──────┘  └──────┬───────┘  └────────┬────────┘    │
└─────────┼────────────────┼───────────────────┼──────────────┘
          │                │                   │
          ▼                ▼                   ▼
┌─────────────────────────────────────────────────────────────┐
│                    theme/index.js                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                  palette                              │  │
│  │  primary, secondary, error, ...  (MUI standard)      │  │
│  │  semantic: { ... }               (flat)               │  │
│  │  productCards: { ... }           (nested)             │  │
│  │  navigation: { ... }             (nested)             │  │
│  │  scales: { ... }                 (raw access)         │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Validation Rules

1. **Token uniqueness**: Each color value should be defined exactly once in `tokens/colors.js`
2. **Semantic references**: All semantic tokens must reference values from `tokens/colors.js`
3. **No circular imports**: Token layer cannot import from semantic layer
4. **Product type coverage**: All 6 product types must have complete `ProductCardColors` objects
5. **Dark mode subset**: `darkColors.md3` keys must be a subset of `colors.md3` keys
