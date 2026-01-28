# Theme Architecture

This directory contains the modular MUI theme for the Admin3 frontend.

## Directory Structure

```
theme/
├── index.js              # Main theme entry point
├── theme.js              # Backward compatibility (re-exports index.js)
├── colorTheme.js         # DEPRECATED: Use tokens/colors.js
├── liftKitTheme.js       # DEPRECATED: Use tokens/spacing.js, tokens/typography.js
├── typographyTheme.js    # Legacy (use typography/index.js)
├── breakpointsTheme.js   # MUI breakpoints configuration
│
├── tokens/               # NEW: Single source of truth for primitive values
│   ├── index.js          # Tokens module entry
│   ├── colors.js         # md3, scales, staticColors
│   ├── typography.js     # fonts, sizes, weights, lineHeights
│   └── spacing.js        # scale, multipliers, gaps, padding, borderRadius
│
├── semantic/             # NEW: Purpose-driven token mappings
│   ├── index.js          # Semantic module entry
│   ├── common.js         # text, background, action, border, status
│   ├── productCards.js   # tutorial, material, bundle, marking, etc.
│   └── navigation.js     # text, border, background, button, mobile
│
├── variants/             # NEW: Component variant definitions
│   └── (future variants)
│
├── colors/
│   ├── index.js          # Color module entry (exports tokens + deprecated)
│   ├── palettesTheme.js  # DEPRECATED: Use tokens/colors.js md3
│   └── semantic.js       # Semantic color mappings by purpose
│
├── spacing/
│   ├── index.js          # Spacing module entry
│   └── semantic.js       # Semantic spacing tokens
│
├── typography/
│   └── index.js          # Typography variants and responsive config
│
├── components/
│   ├── index.js          # Aggregates all component overrides
│   ├── alerts.js         # MuiAlert overrides
│   ├── buttons.js        # MuiButton overrides
│   ├── inputs.js         # MuiTextField, MuiInputBase overrides
│   ├── navigation.js     # MuiAppBar, MuiTabs, MuiTab overrides
│   ├── misc.js           # MuiDivider, MuiTypography, etc.
│   └── cards/
│       ├── index.js              # Card variants aggregator
│       ├── baseProductCard.js    # Base product card styles
│       ├── tutorialCard.js       # Tutorial variant (purple)
│       ├── materialCard.js       # Material variant (sky blue)
│       ├── bundleCard.js         # Bundle variant (green)
│       ├── onlineClassroomCard.js # Online classroom variant (cobalt)
│       ├── markingCard.js        # Marking variant (pink)
│       └── markingVoucherCard.js # Marking voucher variant (orange)
│
├── utils/
│   └── index.js          # Gradient utilities
│
└── styles/
    ├── index.js          # Reusable style objects
    ├── containers.js     # Container style patterns
    └── cards.js          # Card style patterns
```

## Usage

### Importing the Theme

```javascript
// Recommended: Import from index
import theme from './theme';

// Or with specific exports
import theme, { semanticColors, semanticSpacing } from './theme';
```

### Using Semantic Colors

```javascript
import { useTheme } from '@mui/material/styles';

const MyComponent = () => {
  const theme = useTheme();

  return (
    <Box sx={{
      backgroundColor: theme.palette.semantic.cardHeader.tutorial,
      color: theme.palette.semantic.cardText.tutorial.title,
    }}>
      ...
    </Box>
  );
};
```

### Using Semantic Spacing

```javascript
import { useTheme } from '@mui/material/styles';

const MyComponent = () => {
  const theme = useTheme();

  return (
    <Box sx={{
      padding: theme.liftkit.semantic.card.padding,
      gap: theme.liftkit.semantic.card.gap,
    }}>
      ...
    </Box>
  );
};
```

### Using Style Objects

```javascript
import { heroContainerStyles, noResultsCardStyles } from './theme/styles';

const MyComponent = () => (
  <>
    <Container sx={heroContainerStyles}>...</Container>
    <Card sx={noResultsCardStyles}>...</Card>
  </>
);
```

### Product Card Variants

Cards automatically apply styles based on variant and producttype props:

```javascript
<Card variant="product" producttype="tutorial">   {/* Purple theme */}
<Card variant="product" producttype="material">   {/* Sky blue theme */}
<Card variant="product" producttype="bundle">     {/* Green theme */}
<Card variant="product" producttype="online-classroom"> {/* Cobalt theme */}
<Card variant="product" producttype="marking">    {/* Pink theme */}
<Card variant="product" producttype="marking-voucher"> {/* Orange theme */}
```

## Migration Guide

### Moving Inline Styles to Theme

**Before (inline sx):**
```javascript
<Typography sx={{ color: theme.palette.purple['100'], fontWeight: 600 }}>
```

**After (semantic + variant):**
```javascript
<Typography
  variant="productTitle"
  sx={{ color: theme.palette.semantic.cardText.tutorial.title }}
>
```

### Adding New Component Styles

1. Create file in appropriate directory (e.g., `components/myComponent.js`)
2. Export style overrides following MUI pattern
3. Import and spread in `components/index.js`
4. Theme automatically includes new styles

## Best Practices

1. **Prefer semantic colors** over raw palette values
2. **Use theme spacing** instead of hardcoded values
3. **Create style objects** for repeated patterns
4. **Keep inline sx** for layout-only props (display, align, justify)
5. **Move colors/padding/margins** to theme or style objects

## New Token Layer Architecture

The theme now uses a layered architecture:

```
tokens/           → Raw primitive values (colors, typography, spacing)
  └── colors.js      (md3, scales, staticColors)
  └── typography.js  (fonts, sizes, weights)
  └── spacing.js     (scale, gaps, padding, borderRadius)

semantic/         → Purpose-driven mappings
  └── common.js      (text, background, action, border, status)
  └── productCards.js (tutorial, material, bundle, etc.)
  └── navigation.js  (text, border, background, button, mobile, megaMenu)
```

### Import from Semantic Layer

```javascript
// In components - use theme string paths
sx={{ color: 'semantic.textPrimary' }}
sx={{ bgcolor: 'productCards.tutorial.header' }}
sx={{ color: 'navigation.text.primary' }}

// In component overrides - import semantic modules
import { navigation } from '../semantic/navigation';
import { semantic } from '../semantic/common';
```

## Deprecated Files

The following files are deprecated and will be removed in a future release:

### colorTheme.js

**Status**: Deprecated
**Replacement**: `tokens/colors.js`

```javascript
// OLD (deprecated)
import colorTheme from './theme/colorTheme';
const color = colorTheme.palette.purple["020"];

// NEW (preferred)
import { scales } from './theme/tokens/colors';
const color = scales.purple[20]; // Note: numeric keys, not string
```

### palettesTheme.js

**Status**: Deprecated
**Replacement**: `tokens/colors.js` (md3 export)

```javascript
// OLD (deprecated)
import palettes from './theme/colors/palettesTheme';
const primary = palettes.light.primary;

// NEW (preferred)
import { md3 } from './theme/tokens/colors';
const primary = md3.primary;
```

### liftKitTheme.js

**Status**: Deprecated
**Replacement**: `tokens/spacing.js`, `tokens/typography.js`

```javascript
// OLD (deprecated)
import liftKitTheme from './theme/liftKitTheme';
const spacing = spacing.lg;

// NEW (preferred)
import { spacing } from './theme/tokens/spacing';
const lg = spacing.lg;
```

### Migration Timeline

1. **Phase 1** (Complete): Token and semantic layers created
2. **Phase 2** (Complete): External components migrated to use sx callback pattern
3. **Phase 3** (Pending): Internal theme files refactored to use tokens
4. **Phase 4** (Pending): Legacy files deleted after all references removed
