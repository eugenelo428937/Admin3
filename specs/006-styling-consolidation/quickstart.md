# Quickstart: Using the New Theme System

**Feature**: 006-styling-consolidation
**Date**: 2025-01-16

## Overview

This guide explains how to use the consolidated styling system. All colors now come from the MUI theme - no more CSS files or multiple color objects.

## Basic Usage

### Flat Semantic Tokens (Most Common)

Use string paths for common styling needs:

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

### Available Flat Tokens

| Token | Purpose |
| ----- | ------- |
| `semantic.textPrimary` | Main text color |
| `semantic.textSecondary` | Muted text color |
| `semantic.textDisabled` | Disabled text |
| `semantic.textInverse` | Text on dark backgrounds |
| `semantic.bgDefault` | Default background |
| `semantic.bgPaper` | Card/paper background |
| `semantic.bgElevated` | Elevated surface |
| `semantic.bgSubtle` | Subtle background |
| `semantic.borderDefault` | Standard borders |
| `semantic.borderStrong` | Emphasized borders |
| `semantic.statusError` | Error state |
| `semantic.statusWarning` | Warning state |
| `semantic.statusSuccess` | Success state |
| `semantic.statusInfo` | Info state |

## Product Card Theming

### Static Product Type

When product type is known at compile time:

```jsx
<Card sx={{
  '& .MuiCardHeader-root': {
    bgcolor: 'productCards.tutorial.header',
    color: 'productCards.tutorial.title',
  }
}} />
```

### Dynamic Product Type

When product type comes from props/state:

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

### Product Types

| Type | Color Family |
| ---- | ------------ |
| `tutorial` | Purple |
| `material` | Sky blue |
| `bundle` | Green |
| `onlineClassroom` | Cobalt |
| `marking` | Pink |
| `markingVoucher` | Orange |

### Product Card Token Structure

Each product type has these tokens:

- `header` - Card header background
- `actions` - Action area background
- `badge` - Badge background
- `title` - Title text color
- `subtitle` - Subtitle text color
- `button` - Button background
- `buttonHover` - Button hover state
- `icon` - Icon color

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

## Raw Scale Access (Rare)

For edge cases not covered by semantic tokens:

```jsx
// Use theme callback for raw access
<Box sx={(theme) => ({
  bgcolor: theme.palette.scales.purple[20],
  borderColor: theme.palette.scales.granite[30],
})} />
```

**Note**: Prefer semantic tokens when possible. Raw scale access should be rare.

## Migration Cheatsheet

### Before (Old Patterns)

```jsx
// DON'T: Import colorTheme directly
import colorTheme from '../theme/colorTheme';
<Box sx={{ color: colorTheme.palette.purple['020'] }} />

// DON'T: Use CSS class
<div className="product-tutorial">

// DON'T: Hardcode colors
<Box sx={{ bgcolor: '#dfd4f7' }} />
```

### After (New Patterns)

```jsx
// DO: Use semantic token path
<Box sx={{ color: 'productCards.tutorial.header' }} />

// DO: Use sx prop with theme
<Box sx={{ bgcolor: 'semantic.bgPaper' }} />

// DO: Use theme callback for dynamic values
<Box sx={(theme) => ({
  bgcolor: theme.palette.productCards[type].header,
})} />
```

## TypeScript Support (Future)

Type definitions will be added in a future update. For now, use JSDoc comments:

```jsx
/**
 * @param {Object} props
 * @param {'tutorial'|'material'|'bundle'|'onlineClassroom'|'marking'|'markingVoucher'} props.productType
 */
function ProductCard({ productType }) {
  // ...
}
```

## Troubleshooting

### Token Not Found

If a string path doesn't work, check:

1. Spelling (case-sensitive)
2. Path structure matches theme palette
3. Token exists in the semantic layer

### Visual Mismatch

If colors don't match expected values:

1. Clear browser cache
2. Restart dev server
3. Check for CSS overrides (remove old CSS imports)

### Import Errors

If you see "Cannot find module" errors:

1. Ensure old files are deleted
2. Check import paths are updated
3. Run `npm install` to clear cache

## File Locations

| What | Where |
| ---- | ----- |
| Raw colors | `src/theme/tokens/colors.js` |
| Flat semantics | `src/theme/semantic/common.js` |
| Product cards | `src/theme/semantic/productCards.js` |
| Navigation | `src/theme/semantic/navigation.js` |
| Theme entry | `src/theme/index.js` |
