# Quickstart: Navigation Styling Migration

**Feature**: 20260113-Styling-Clean-up
**Date**: 2026-01-13

## Overview

This guide walks developers through migrating navigation components from inline styles to semantic tokens and MUI variants.

## Prerequisites

- Familiarity with Material-UI theming
- Access to `src/theme/` directory
- Understanding of the existing `navmenu` variant pattern

## Step 1: Verify Token Availability

After tokens are added, verify they're accessible:

```javascript
import { useTheme } from '@mui/material';

const theme = useTheme();

// Access navigation tokens
console.log(theme.palette.semantic.navigation.text.primary);
console.log(theme.palette.semantic.navigation.border.subtle);
```

## Step 2: Use Button Variants

Replace inline button styles with variant props:

### navPrimary (Menu Triggers & Nav Links)

```javascript
// ❌ Before
<Button
  sx={{
    color: theme.palette.offwhite?.["000"] || "inherit",
    textTransform: "none",
  }}
>

// ✅ After
<Button variant="navPrimary">
```

### navViewAll ("View All" Buttons)

```javascript
// ❌ Before
<Button
  sx={{
    color: theme.palette.offwhite?.["000"] || "inherit",
    textTransform: "none",
    pt: 0,
    mb: 1,
  }}
>

// ✅ After
<Button variant="navViewAll" sx={{ mb: 1 }}>
```

### topNavAction (Top Nav Buttons)

```javascript
// ❌ Before
<Button
  sx={{
    color: theme.palette.liftkit?.light?.background || "text.primary",
    textTransform: "none",
    p: 0,
  }}
>

// ✅ After
<Button variant="topNavAction">
```

## Step 3: Use Typography Variants

### navViewAllText (Underlined Links)

```javascript
// ❌ Before
<Typography
  variant="navlink"
  sx={{ borderBottom: "1px solid " + theme.palette.granite["020"] }}
>
  View All Products
</Typography>

// ✅ After
<Typography variant="navViewAllText">View All Products</Typography>
```

### navHeading (Section Headers)

```javascript
// ❌ Before
<Typography
  variant="navlink"
  sx={{ mb: 1, fontWeight: "bold", cursor: "pointer" }}
>
  Location
</Typography>

// ✅ After
<Typography variant="navHeading">Location</Typography>
```

## Step 4: Keep Layout Inline

Layout properties should remain in sx props:

```javascript
// ✅ Correct - layout only
<Button
  variant="navPrimary"
  sx={{
    mx: { xl: 2 },           // ✅ margin
    display: { xs: "none" }, // ✅ responsive display
  }}
>
```

```javascript
// ❌ Wrong - color in sx
<Button
  variant="navPrimary"
  sx={{
    mx: { xl: 2 },
    color: theme.palette.offwhite["000"], // ❌ Should be in variant
  }}
>
```

## Step 5: Remove Unnecessary Fallbacks

Tokens are guaranteed to exist, so fallbacks are unnecessary:

```javascript
// ❌ Before (fallback needed)
color: theme.palette.offwhite?.["000"] || "inherit"

// ✅ After (no fallback needed)
// Token is always defined in semantic.js
```

## Checklist

For each navigation component file:

- [ ] Remove all `color:` from sx props (use variant)
- [ ] Remove all `textTransform: "none"` from sx props (use variant)
- [ ] Remove all `borderBottom:` for View All links (use navViewAllText)
- [ ] Replace section heading styles with navHeading variant
- [ ] Keep only layout properties in sx props
- [ ] Remove `|| "inherit"` and `|| "text.primary"` fallbacks
- [ ] Test visual appearance matches original

## Verification

After migration, run visual comparison:

1. Take screenshot of navigation before changes
2. Apply changes
3. Take screenshot after changes
4. Compare - should be pixel-identical

## Common Issues

### Variant Not Found

If you get "Unknown variant" error:
1. Verify `navigation.js` exports the variant
2. Check theme index.js includes the component overrides
3. Restart dev server to pick up theme changes

### Color Not Matching

If colors look different:
1. Check token value in semantic.js matches original color
2. Verify you're using the correct token (text vs button)
3. Check for CSS specificity conflicts

## Dark Mode Support

The token-based architecture enables future dark mode support by simply swapping token values.

### Current Token Definitions (Light Mode)

```javascript
navigation: {
  text: {
    primary: colorTheme.offwhite['000'],      // #fdfdfd
    secondary: colorTheme.offwhite['001'],    // #f0edf1
  },
  background: {
    hover: colorTheme.granite['070'],     // #525252
    active: colorTheme.granite['080'],    // #3b3b3a
  },
}
```

### Dark Mode Pattern (Future)

To enable dark mode, create a dark theme variant that swaps token values:

```javascript
// Dark mode token values (example)
navigation: {
  text: {
    primary: colorTheme.granite['010'],   // Invert: light text on dark
    secondary: colorTheme.granite['020'],
  },
  background: {
    hover: colorTheme.offwhite['002'],        // Invert: light hover on dark
    active: colorTheme.offwhite['003'],
  },
}
```

### No Component Changes Required

Because components use semantic tokens via variants, no component code changes are needed for dark mode. The theme provider switches the token definitions, and all navigation automatically updates.

## Files Reference

| File | Purpose |
|------|---------|
| `src/theme/colors/semantic.js` | Token definitions |
| `src/theme/components/navigation.js` | Variant definitions |
| `src/theme/index.js` | Theme composition |
