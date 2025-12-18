# Theme Architecture

This directory contains the modular MUI theme for the Admin3 frontend.

## Directory Structure

```
theme/
├── index.js              # Main theme entry point
├── theme.js              # Backward compatibility (re-exports index.js)
├── colorTheme.js         # Raw color palette definitions
├── liftKitTheme.js       # Spacing and typography tokens
├── typographyTheme.js    # Legacy (use typography/index.js)
├── breakpointsTheme.js   # MUI breakpoints configuration
│
├── colors/
│   ├── index.js          # Color module entry
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
<Typography sx={{ color: theme.palette.bpp.purple['100'], fontWeight: 600 }}>
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
