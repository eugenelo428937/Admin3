# Quickstart: Using the Theme System

**Feature**: 20260116-styling-consolidation
**Updated**: 2025-01-27

## Overview

All colors come from the MUI theme. No CSS files, no multiple color objects, no legacy wrappers. Two access patterns only.

## Pattern A: String Path (Static Values)

Use for known, compile-time values:

```jsx
import { Box, Typography } from '@mui/material';

function MyComponent() {
  return (
    <Box sx={{
      bgcolor: 'semantic.bgPaper',
      color: 'semantic.textPrimary',
      borderColor: 'semantic.borderDefault',
      border: 1,
      p: 2,
    }}>
      <Typography sx={{ color: 'semantic.textSecondary' }}>
        Secondary text here
      </Typography>
    </Box>
  );
}
```

## Pattern B: Theme Callback (Dynamic Values)

Use when values depend on props, state, or computed logic:

```jsx
function ProductCard({ productType }) {
  return (
    <Card sx={(theme) => ({
      '& .MuiCardHeader-root': {
        bgcolor: theme.palette.productCards[productType].header,
        color: theme.palette.productCards[productType].title,
      },
      '& .MuiButton-root': {
        bgcolor: theme.palette.productCards[productType].button,
        '&:hover': {
          bgcolor: theme.palette.productCards[productType].buttonHover,
        },
      },
    })} />
  );
}
```

## Available Flat Tokens

| Token | Purpose |
|-------|---------|
| `semantic.textPrimary` | Main text color |
| `semantic.textSecondary` | Muted text color |
| `semantic.textDisabled` | Disabled text |
| `semantic.textInverse` | Text on dark backgrounds |
| `semantic.textOnPrimary` | Text on primary color |
| `semantic.bgDefault` | Default background |
| `semantic.bgPaper` | Card/paper background |
| `semantic.bgElevated` | Elevated surface |
| `semantic.bgSubtle` | Subtle background |
| `semantic.borderDefault` | Standard borders |
| `semantic.borderStrong` | Emphasized borders |
| `semantic.borderSubtle` | Subtle borders |
| `semantic.statusError` | Error state |
| `semantic.statusWarning` | Warning state |
| `semantic.statusSuccess` | Success state |
| `semantic.statusInfo` | Info state |

## Product Card Theming

### Static Product Type

```jsx
<Card sx={{
  '& .MuiCardHeader-root': {
    bgcolor: 'productCards.tutorial.header',
    color: 'productCards.tutorial.title',
  }
}} />
```

### Product Types

| Type | Color Family |
|------|--------------|
| `tutorial` | Purple |
| `material` | Sky blue |
| `bundle` | Green |
| `onlineClassroom` | Cobalt |
| `marking` | Pink |
| `markingVoucher` | Orange |

### Product Card Token Structure

Each product type has: `header`, `actions`, `badge`, `title`, `subtitle`, `button`, `buttonHover`, `icon`.

## Navigation Theming

```jsx
<AppBar sx={{
  bgcolor: 'navigation.background.default',
  color: 'navigation.text.primary',
}}>
  <Tab sx={{
    color: 'navigation.text.secondary',
    '&:hover': {
      bgcolor: 'navigation.background.hover',
    },
  }} />
</AppBar>
```

## Accessibility Tokens

```jsx
// Focus ring
<Box sx={{ boxShadow: (theme) => theme.palette.semantic.a11y.focusRing }} />

// prefers-reduced-motion is handled globally via MuiCssBaseline
// No per-component work needed
```

## Forbidden Patterns

```jsx
// FORBIDDEN: Import raw tokens in components
import { scales } from '../theme/tokens/colors';  // ESLint error

// FORBIDDEN: Use deleted paths
theme.palette.granite['020']          // Deleted
theme.palette.bpp.purple['020']       // Deleted
theme.palette.liftkit.light.background // Deleted
theme.palette.md3.primary             // Deleted
theme.palette.semantic.cardHeader.tutorial // Old semantic, deleted

// FORBIDDEN: Raw hex colors
sx={{ color: '#755085' }}             // CI will fail

// FORBIDDEN: Direct scale access in components
sx={{ color: theme.palette.scales.purple[20] }}  // Use semantic token
```

## Migration Cheatsheet

| Old Pattern | New Pattern |
|-------------|-------------|
| `colorTheme.palette.purple['020']` | `'productCards.tutorial.header'` |
| `theme.palette.granite["090"]` | `'semantic.textPrimary'` |
| `theme.palette.granite["030"]` | `'semantic.borderDefault'` |
| `theme.palette.liftkit.light.background` | `'semantic.bgDefault'` |
| `theme.palette.liftkit.light.onSurface` | `'semantic.textPrimary'` |
| `theme.palette.semantic.navigation.text.primary` | `'navigation.text.primary'` |
| `theme.palette.semantic.cardHeader.tutorial` | `'productCards.tutorial.header'` |
| `statusColors.success.background` | `status.successContainer` (in overrides) |
| `statusColors.error.dark` | `status.onErrorContainer` (in overrides) |
| `'#dee2e6'` | `'semantic.borderDefault'` |
| `'#f8f9fa'` | `'semantic.bgSubtle'` |

## Style Helpers

```jsx
import { composeSx, productCardSx } from '../theme/utils/styleHelpers';

// Merge multiple sx objects
<Box sx={composeSx(baseStyles, variantStyles, conditionalStyles)} />

// Common product card theming
<Card sx={(theme) => productCardSx(theme, 'tutorial')} />
```

## File Locations

| What | Where |
|------|-------|
| Raw colors | `src/theme/tokens/colors.js` |
| Flat semantics | `src/theme/semantic/common.js` |
| Product cards | `src/theme/semantic/productCards.js` |
| Navigation | `src/theme/semantic/navigation.js` |
| Theme entry | `src/theme/index.js` |
| Style helpers | `src/theme/utils/styleHelpers.js` |

## Troubleshooting

### Token Not Found

1. Check spelling (case-sensitive)
2. Verify path exists in theme palette
3. Check token exists in the semantic layer

### Visual Mismatch

1. Clear browser cache
2. Restart dev server
3. Check for CSS overrides (remove old CSS imports)

### Import Errors

1. Ensure old files are deleted (`colors/semantic.js`, `colors/index.js`)
2. Check import paths are updated
3. Run `npm install` to clear cache
