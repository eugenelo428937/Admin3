# Navigation Styling Refactoring Design

**Date:** 2025-01-13
**Scope:** Navigation components only (pilot)
**Goals:** Consistency, Reusability, Theming support

---

## Problem Analysis

### Current Issues

| Pattern | Occurrences | Files |
|---------|-------------|-------|
| `theme.palette.offwhite?.["000"] \|\| "inherit"` | 8+ times | NavigationMenu.js |
| `theme.palette.liftkit?.light?.background \|\| "text.primary"` | 4+ times | TopNavBar.js, TopNavActions.js |
| `borderBottom: "1px solid " + theme.palette.bpp.granite["020"]` | 3 times | NavigationMenu.js |
| `mx: { xl: 2 }` button margins | 5 times | NavigationMenu.js |
| `textTransform: "none", color: ..., p: 0` button reset | 6+ times | All navigation files |

### Inconsistencies Found

- `theme.palette.offwhite["000"]` vs `theme.palette.offwhite["001"]` used interchangeably
- Fallback patterns differ: `|| "inherit"` vs `|| "text.primary"`
- Same visual style defined differently across components

---

## Solution Architecture

### Two-Layer Approach

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 1: Semantic Tokens (theme/colors/semantic.js)        │
│  ─────────────────────────────────────────────────────────  │
│  • navigation.text.primary                                  │
│  • navigation.text.onDark                                   │
│  • navigation.border.subtle                                 │
│  • navigation.hover.background                              │
│  • navigation.button.color                                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Layer 2: MUI Variants (theme/components/navigation.js)     │
│  ─────────────────────────────────────────────────────────  │
│  • MuiButton variant="navPrimary"                           │
│  • MuiButton variant="navViewAll"                           │
│  • MuiButton variant="topNavAction"                         │
│  • MuiTypography variant="navHeading"                       │
│  • MuiTypography variant="navViewAllText"                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Components (inline only for layout)                        │
│  ─────────────────────────────────────────────────────────  │
│  • Box/Grid positioning, flex, responsive breakpoints       │
│  • Container padding, max-width                             │
│  • NO colors, borders, or typography inline                 │
└─────────────────────────────────────────────────────────────┘
```

### What Stays Inline in Components

- `display: flex`, `flexDirection`, `alignItems`, `justifyContent`
- `gap`, `padding`, `margin` for layout positioning
- Responsive breakpoints for layout changes (`xs`, `md`, `xl`)

### What Moves to Theme

- All colors and color fallbacks
- Border styles
- Typography variants
- Button visual styles (textTransform, hover states)

---

## Implementation Details

### File 1: `src/theme/colors/semantic.js`

Add navigation token group:

```javascript
navigation: {
  text: {
    primary: colorTheme.offwhite['000'],      // Main nav text
    secondary: colorTheme.offwhite['001'],    // Secondary nav text
    muted: colorTheme.bpp.granite['040'],     // Disabled/placeholder
  },
  border: {
    subtle: colorTheme.bpp.granite['020'],    // "View All" underlines
    divider: colorTheme.bpp.granite['030'],   // Menu dividers
  },
  background: {
    hover: colorTheme.bpp.granite['070'],     // Menu item hover
    active: colorTheme.bpp.granite['080'],    // Active/selected state
  },
  button: {
    color: colorTheme.offwhite['000'],        // Nav button text
    hoverColor: colorTheme.bpp.purple['110'], // Button hover accent
  },
}
```

### File 2: `src/theme/components/navigation.js`

Add MUI Button variants:

```javascript
// Add to MuiButton variants array
{
  props: { variant: 'navPrimary' },
  style: {
    color: semanticColors.navigation.button.color,
    textTransform: 'none',
    padding: 0,
    '&:hover': {
      backgroundColor: 'transparent',
      color: semanticColors.navigation.button.hoverColor,
    },
  },
},
{
  props: { variant: 'navViewAll' },
  style: {
    color: semanticColors.navigation.button.color,
    textTransform: 'none',
    paddingTop: 0,
    marginBottom: liftKitTheme.spacing.sm,
  },
},
{
  props: { variant: 'topNavAction' },
  style: {
    color: semanticColors.navigation.text.primary,
    textTransform: 'none',
    padding: 0,
    justifyContent: 'center',
  },
},
```

Add MUI Typography variants:

```javascript
// Add to MuiTypography variants array
{
  props: { variant: 'navViewAllText' },
  style: {
    borderBottom: `1px solid ${semanticColors.navigation.border.subtle}`,
  },
},
{
  props: { variant: 'navHeading' },
  style: {
    marginBottom: liftKitTheme.spacing.xs,
    fontWeight: 'bold',
    cursor: 'pointer',
  },
},
```

---

## Refactoring Examples

### Example 1: View All Products Button

**Before:**
```javascript
<Button
  variant="text"
  onClick={() => { ... }}
  sx={{
    mb: 1,
    color: theme.palette.offwhite?.["000"] || "inherit",
    textTransform: "none",
    pt: 0,
  }}
>
  <Typography
    variant="navlink"
    sx={{ borderBottom: "1px solid " + theme.palette.bpp.granite["020"] }}
  >
    View All Products
  </Typography>
  <NavigateNextIcon />
</Button>
```

**After:**
```javascript
<Button
  variant="navViewAll"
  onClick={() => { ... }}
  sx={{ mb: 1 }}  // Layout only
>
  <Typography variant="navViewAllText">View All Products</Typography>
  <NavigateNextIcon />
</Button>
```

### Example 2: Conditional Nav Buttons

**Before:**
```javascript
<Button
  component={NavLink}
  to="/apprenticeships"
  sx={{
    color: theme.palette.offwhite?.["000"] || "inherit",
    textTransform: "none",
    mx: { xl: 2 },
  }}
>
  <Typography variant="navlink">Apprenticeships</Typography>
</Button>
```

**After:**
```javascript
<Button
  variant="navPrimary"
  component={NavLink}
  to="/apprenticeships"
  sx={{ mx: { xl: 2 } }}  // Layout only
>
  <Typography variant="navlink">Apprenticeships</Typography>
</Button>
```

### Example 3: MegaMenuPopover buttonProps

**Before:**
```javascript
<MegaMenuPopover
  buttonProps={{
    sx: { mx: { xl: 2 } },
  }}
>
```

**After:**
```javascript
<MegaMenuPopover
  buttonProps={{
    variant: "navPrimary",
    sx: { mx: { xl: 2 } },  // Layout spacing still inline
  }}
>
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/theme/colors/semantic.js` | Add `navigation` token group |
| `src/theme/components/navigation.js` | Add 5 MUI variants |
| `src/components/Navigation/NavigationMenu.js` | Replace inline styles with variants |
| `src/components/Navigation/TopNavBar.js` | Replace inline styles with variants |
| `src/components/Navigation/TopNavActions.js` | Replace inline styles with variants |
| `src/components/Navigation/MegaMenuPopover.js` | Use semantic tokens for colors |

---

## Implementation Order

1. **Add semantic tokens** - No breaking changes, additive only
2. **Add MUI variants** - Variants available but unused
3. **Refactor NavigationMenu.js** - Largest file, most patterns
4. **Refactor remaining files** - TopNavBar, TopNavActions, MegaMenuPopover
5. **Test theming** - Verify dark mode readiness

---

## New Variants Summary

| Variant | Component | Purpose |
|---------|-----------|---------|
| `navPrimary` | Button | Base nav button (no color/transform) |
| `navViewAll` | Button | "View All X" action buttons |
| `topNavAction` | Button | Top nav icon buttons |
| `navViewAllText` | Typography | Underlined "View All" text |
| `navHeading` | Typography | Menu section headings |

---

## Theming Benefit

Once complete, supporting dark mode becomes trivial:

```javascript
// semantic.js - just swap token values based on mode
navigation: {
  text: {
    primary: isDark ? colorTheme.granite['010'] : colorTheme.offwhite['000'],
  },
  background: {
    hover: isDark ? colorTheme.bpp.granite['020'] : colorTheme.bpp.granite['070'],
  },
  // ...
}
```

All components automatically pick up the new values without code changes.

---

## Success Criteria

- [ ] No hardcoded colors in Navigation components
- [ ] No repeated style objects across files
- [ ] All visual styles use semantic tokens or MUI variants
- [ ] Only layout properties (flex, margin, padding) remain inline
- [ ] Dark mode can be enabled by changing semantic.js only
