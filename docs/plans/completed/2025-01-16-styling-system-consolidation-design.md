# Styling System Consolidation Design

**Date:** 2025-01-16
**Status:** Approved
**Branch:** 20260113-Styling-Clean-up

## Problem Statement

The frontend styling system has four disconnected layers causing duplication, inconsistency, and maintenance burden:

1. **MD3 CSS Variables** (`index.css`) - Material Design 3 tokens
2. **Legacy CSS Files** (`src/styles/`) - Component CSS with different naming conventions
3. **MUI Theme (JS)** (`src/theme/`) - Multiple overlapping color objects
4. **Inline sx styles** - Ad-hoc styles throughout components

The same colors are defined 3+ times with different values and naming conventions (`--md-sys-*`, `--mui-palette-*`, `theme.palette.*`).

## Goals (Priority Order)

1. **Consistency** - Single source of truth for all styling values
2. **Maintainability** - Easy for developers to find and use correct styles
3. **Performance** - Reduced CSS bundle size
4. **Theme switching** - Enable light/dark mode capability

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Source of truth | JS Theme First | Full TypeScript autocomplete, MUI-native |
| CSS migration | Full migration to MUI | Clean result, no dual systems |
| Color palettes | MD3 + BPP scales | MD3 for system colors, BPP for product theming |
| Semantic structure | Hybrid | Flat for common tokens, nested for domains |

## New Architecture

### File Structure

```
src/theme/
├── index.js                    # Entry point - composes final theme
├── tokens/
│   ├── colors.js               # SINGLE SOURCE: All raw color values
│   ├── typography.js           # Font families, sizes, weights
│   └── spacing.js              # Spacing scale
├── semantic/
│   ├── common.js               # Flat tokens: text, bg, borders, status
│   ├── productCards.js         # Nested: cards by product type
│   └── navigation.js           # Navigation-specific tokens
├── components/
│   ├── index.js                # Aggregates all overrides
│   ├── MuiAppBar.js            # Per-component override files
│   ├── MuiButton.js
│   ├── MuiCard.js
│   ├── MuiTextField.js
│   └── ...
└── variants/
    ├── cardVariants.js         # Custom card variants
    └── typographyVariants.js   # Custom text variants
```

### tokens/colors.js

Single source for all raw color values:

```javascript
export const colors = {
  // MD3 System Colors (light mode defaults)
  md3: {
    primary: '#755085',
    onPrimary: '#FFFFFF',
    primaryContainer: '#F7D8FF',
    onPrimaryContainer: '#5C396C',

    secondary: '#69596D',
    onSecondary: '#FFFFFF',
    secondaryContainer: '#F1DCF4',
    onSecondaryContainer: '#504255',

    tertiary: '#815251',
    onTertiary: '#FFFFFF',
    tertiaryContainer: '#FFDAD8',
    onTertiaryContainer: '#663B3A',

    error: '#904A43',
    onError: '#FFFFFF',
    errorContainer: '#FFDAD5',
    onErrorContainer: '#73342D',

    surface: '#FDF8FF',
    onSurface: '#1C1B20',
    surfaceVariant: '#E5E1EC',
    onSurfaceVariant: '#47464F',
    surfaceContainer: '#F1ECF4',
    surfaceContainerLow: '#F7F2FA',
    surfaceContainerHigh: '#EBE6EE',
    surfaceContainerHighest: '#E6E1E9',
    surfaceContainerLowest: '#FFFFFF',

    outline: '#787680',
    outlineVariant: '#C9C5D0',

    inverseSurface: '#312F36',
    inverseOnSurface: '#F4EFF7',
    inversePrimary: '#E3B7F3',

    shadow: '#000000',
    scrim: '#000000',
  },

  // BPP Brand Scales (product theming)
  scales: {
    purple: {
      10: '#f1eefc',
      20: '#dfd4f7',
      30: '#beb1ee',
      40: '#a592e5',
      50: '#8f72dc',
      60: '#7950d1',
      70: '#6332b9',
      80: '#4e0e9d',
      90: '#310075',
      100: '#140043',
      110: '#8953fd',
    },
    sky: {
      10: '#e5f9ff',
      20: '#8ae6ff',
      30: '#2bcbf8',
      40: '#00abd9',
      50: '#008ebb',
      60: '#006f99',
      70: '#005782',
      80: '#003d67',
      90: '#00264e',
      100: '#00141a',
      110: '#23cefd',
    },
    mint: {
      10: '#dcfefb',
      20: '#7eece3',
      30: '#00cfbf',
      40: '#00b2a4',
      50: '#009487',
      60: '#00776b',
      70: '#005d52',
      80: '#00423d',
      90: '#022c25',
      100: '#001500',
      110: '#1ff9e8',
    },
    green: {
      10: '#dbfaed',
      20: '#b4e4cf',
      30: '#7dcaa8',
      40: '#4eb186',
      50: '#2f9569',
      60: '#007a46',
      70: '#005f2d',
      80: '#004514',
      90: '#002e12',
      100: '#001600',
      110: '#00e582',
    },
    orange: {
      10: '#fff2eb',
      20: '#ffcfb8',
      30: '#ffa27a',
      40: '#ff7536',
      50: '#e85100',
      60: '#c83000',
      70: '#a90000',
      80: '#7d0000',
      90: '#550000',
      100: '#2d0000',
      110: '#ff6717',
    },
    pink: {
      10: '#fff0f7',
      20: '#ffccdd',
      30: '#ff9bbd',
      40: '#ff69a2',
      50: '#f33089',
      60: '#cf006c',
      70: '#a4004b',
      80: '#7b002d',
      90: '#540014',
      100: '#2d0002',
      110: '#fa388e',
    },
    cobalt: {
      10: '#e9f1ff',
      20: '#c7daff',
      30: '#94bcff',
      35: '#7dacfe',
      40: '#669dfd',
      45: '#568ded',
      50: '#4481ec',
      55: '#3774dd',
      60: '#2a65ce',
      70: '#0e4cb1',
      80: '#003195',
      90: '#00147b',
      100: '#09004a',
      110: '#518ffb',
    },
    granite: {
      0: '#ffffff',
      10: '#f1f1f1',
      20: '#d9d9d9',
      30: '#bababa',
      40: '#9e9e9e',
      50: '#848484',
      60: '#6a6a6a',
      70: '#525252',
      80: '#3b3b3a',
      90: '#272524',
      100: '#111110',
    },
  },

  // Static values (never change with theme)
  static: {
    white: '#FFFFFF',
    black: '#000000',
    transparent: 'transparent',
  },
};

// Dark mode overrides (only values that change)
export const darkColors = {
  md3: {
    primary: '#E3B7F3',
    onPrimary: '#442254',
    primaryContainer: '#5C396C',
    onPrimaryContainer: '#F7D8FF',

    secondary: '#D4C0D7',
    onSecondary: '#3D2E41',

    surface: '#161217',
    onSurface: '#EAE0E7',
    surfaceContainer: '#231E23',
    surfaceContainerLow: '#1F1A1F',
    surfaceContainerHigh: '#2D282E',

    inverseSurface: '#EAE0E7',
    inverseOnSurface: '#342F34',
    inversePrimary: '#755085',
  },
};
```

### semantic/common.js

Flat tokens for everyday use:

```javascript
import { colors } from '../tokens/colors';

export const commonSemantics = {
  // Text
  textPrimary: colors.md3.onSurface,
  textSecondary: colors.md3.onSurfaceVariant,
  textDisabled: colors.scales.granite[40],
  textInverse: colors.md3.inverseOnSurface,

  // Backgrounds
  bgDefault: colors.md3.surface,
  bgPaper: colors.md3.surfaceContainerLowest,
  bgElevated: colors.md3.surfaceContainerHigh,
  bgSubtle: colors.md3.surfaceContainer,

  // Interactive states
  actionHover: `${colors.md3.primary}14`,      // 8% opacity
  actionSelected: `${colors.md3.primary}1F`,   // 12% opacity
  actionDisabled: colors.scales.granite[30],

  // Borders
  borderDefault: colors.md3.outlineVariant,
  borderStrong: colors.md3.outline,

  // Status
  statusError: colors.md3.error,
  statusWarning: colors.scales.orange[50],
  statusSuccess: colors.scales.green[60],
  statusInfo: colors.scales.cobalt[60],
};
```

### semantic/productCards.js

Nested tokens for product-specific theming:

```javascript
import { colors } from '../tokens/colors';

export const productCardSemantics = {
  tutorial: {
    header: colors.scales.purple[20],
    actions: colors.scales.purple[30],
    badge: colors.scales.purple[10],
    title: colors.scales.purple[100],
    subtitle: colors.scales.purple[90],
    button: colors.scales.purple[50],
    buttonHover: colors.scales.purple[70],
    icon: colors.scales.purple[90],
  },
  material: {
    header: colors.scales.sky[20],
    actions: colors.scales.sky[30],
    badge: colors.scales.sky[10],
    title: colors.scales.sky[100],
    subtitle: colors.scales.sky[90],
    button: colors.scales.sky[60],
    buttonHover: colors.scales.sky[70],
    icon: colors.scales.sky[90],
  },
  bundle: {
    header: colors.scales.green[30],
    actions: colors.scales.green[40],
    badge: colors.scales.green[10],
    title: colors.scales.green[100],
    subtitle: colors.scales.green[90],
    button: colors.scales.green[60],
    buttonHover: colors.scales.green[80],
    icon: colors.scales.green[90],
  },
  onlineClassroom: {
    header: colors.scales.cobalt[20],
    actions: colors.scales.cobalt[30],
    badge: colors.scales.cobalt[10],
    title: colors.scales.cobalt[100],
    subtitle: colors.scales.cobalt[90],
    button: colors.scales.cobalt[55],
    buttonHover: colors.scales.cobalt[70],
    icon: colors.scales.cobalt[90],
  },
  marking: {
    header: colors.scales.pink[20],
    actions: colors.scales.pink[30],
    badge: colors.scales.pink[10],
    title: colors.scales.pink[100],
    subtitle: colors.scales.pink[90],
    button: colors.scales.pink[60],
    buttonHover: colors.scales.pink[80],
    icon: colors.scales.pink[90],
  },
  markingVoucher: {
    header: colors.scales.orange[20],
    actions: colors.scales.orange[30],
    badge: colors.scales.orange[10],
    title: colors.scales.orange[100],
    subtitle: colors.scales.orange[90],
    button: colors.scales.orange[50],
    buttonHover: colors.scales.orange[70],
    icon: colors.scales.orange[90],
  },
};
```

### semantic/navigation.js

Navigation-specific tokens:

```javascript
import { colors } from '../tokens/colors';

export const navigationSemantics = {
  text: {
    primary: colors.scales.granite[0],
    secondary: colors.scales.granite[10],
    muted: colors.scales.granite[40],
  },
  border: {
    subtle: colors.scales.granite[20],
    divider: colors.scales.granite[30],
  },
  background: {
    default: colors.scales.granite[80],
    hover: colors.scales.granite[70],
    active: colors.scales.granite[90],
  },
  button: {
    color: colors.scales.granite[10],
    hoverColor: colors.scales.purple[110],
  },
  mobile: {
    icon: colors.scales.granite[0],
    border: 'rgba(255, 255, 255, 0.12)',
    title: colors.scales.granite[0],
    background: colors.scales.granite[80],
  },
};
```

### theme/index.js

Final composition:

```javascript
import { createTheme } from '@mui/material/styles';

// Tokens
import { colors, darkColors } from './tokens/colors';
import { typography } from './tokens/typography';
import { spacing } from './tokens/spacing';

// Semantic layers
import { commonSemantics } from './semantic/common';
import { productCardSemantics } from './semantic/productCards';
import { navigationSemantics } from './semantic/navigation';

// Component overrides (aggregated)
import components from './components';

const theme = createTheme({
  palette: {
    // MUI standard roles
    primary: {
      main: colors.md3.primary,
      light: colors.md3.primaryContainer,
      dark: colors.md3.onPrimaryContainer,
      contrastText: colors.md3.onPrimary,
    },
    secondary: {
      main: colors.md3.secondary,
      contrastText: colors.md3.onSecondary,
    },
    error: {
      main: colors.md3.error,
      contrastText: colors.md3.onError,
    },
    background: {
      default: colors.md3.surface,
      paper: colors.md3.surfaceContainerLowest,
    },
    text: {
      primary: colors.md3.onSurface,
      secondary: colors.md3.onSurfaceVariant,
    },

    // Raw scales (for edge cases)
    scales: colors.scales,

    // Flat semantic tokens
    semantic: commonSemantics,

    // Domain-specific semantics
    productCards: productCardSemantics,
    navigation: navigationSemantics,
  },

  typography,

  spacing: (factor) => `${0.5 * factor}rem`,

  components,
});

export default theme;
```

## CSS Migration Mapping

| CSS File | Target MUI Component(s) |
|----------|------------------------|
| `navbar.css` | `MuiAppBar`, `MuiTab`, `MuiToolbar` |
| `product_card.css` | `MuiCard` + card variants |
| `search_box.css` | `MuiTextField`, `MuiAutocomplete` |
| `cart_panel.css` | `MuiDrawer` + custom variant |
| `product_list.css` | `MuiGrid`, `MuiContainer` |
| `search_results.css` | `MuiList`, `MuiListItem` |
| `bpp-color-system.css` | Deleted (absorbed into tokens) |
| `custom-bootstrap.css` | Deleted (migrate to MUI) |
| `liftkit-css/*` | `MuiTypography`, spacing tokens |

## Files to Delete

After migration:

- `src/theme/colorTheme.js` (absorbed into tokens/colors.js)
- `src/theme/colors/palettesTheme.js` (duplicate)
- `src/theme/liftKitTheme.js` (absorbed into tokens + semantic)
- `src/styles/*.css` (all CSS files)
- `src/styles/liftkit-css/*` (entire folder)
- Most of `src/index.css` (keep only font imports)

## Usage Patterns

### Flat semantic tokens (common usage)

```javascript
<Box sx={{
  color: 'semantic.textPrimary',
  bgcolor: 'semantic.bgPaper',
  borderColor: 'semantic.borderDefault',
}} />
```

### Nested semantic tokens (product cards)

```javascript
<Card sx={{
  '& .MuiCardHeader-root': {
    bgcolor: 'productCards.tutorial.header',
  }
}} />
```

### Dynamic product type

```javascript
<Box sx={(theme) => ({
  bgcolor: theme.palette.productCards[productType].header,
  color: theme.palette.productCards[productType].title,
})} />
```

### Raw scale access (rare)

```javascript
<Box sx={{ color: 'scales.purple.70' }} />
```

## Implementation Order

1. **Phase 1: Token Foundation**
   - Create `tokens/colors.js`
   - Create `tokens/typography.js`
   - Create `tokens/spacing.js`

2. **Phase 2: Semantic Layer**
   - Create `semantic/common.js`
   - Create `semantic/productCards.js`
   - Create `semantic/navigation.js`

3. **Phase 3: Component Overrides**
   - Migrate `navbar.css` → MuiAppBar, MuiTab
   - Migrate `product_card.css` → MuiCard
   - Migrate remaining CSS files

4. **Phase 4: Theme Composition**
   - Rewrite `theme/index.js`
   - Update component imports

5. **Phase 5: Component Updates**
   - Find/replace old theme paths
   - Update `sx` props to use semantic tokens

6. **Phase 6: Cleanup**
   - Delete old files
   - Remove unused CSS imports
   - Clean `index.css`

## Testing Strategy

- Visual regression tests on product cards
- Snapshot tests for theme object structure
- Manual verification of all product types
- Dark mode toggle verification (if implemented)
