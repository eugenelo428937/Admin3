# Data Model: Navigation Styling Tokens & Variants

**Feature**: 20260113-Styling-Clean-up
**Date**: 2026-01-13

## Layer 1: Semantic Tokens

### Token Structure

Add to `src/theme/colors/semantic.js`:

```javascript
navigation: {
  text: {
    primary: colorTheme.offwhite['000'],      // Main nav text
    secondary: colorTheme.offwhite['001'],    // Secondary nav text
    muted: colorTheme.granite['040'],     // Disabled/placeholder text
  },
  border: {
    subtle: colorTheme.granite['020'],    // "View All" underlines
    divider: colorTheme.granite['030'],   // Menu dividers
  },
  background: {
    hover: colorTheme.granite['070'],     // Menu item hover
    active: colorTheme.granite['080'],    // Active/selected state
  },
  button: {
    color: colorTheme.offwhite['000'],        // Nav button text
    hoverColor: colorTheme.purple['110'], // Button hover accent
  },
}
```

### Token Mapping Table

| Token Path | Current Usage | Replacement |
|------------|---------------|-------------|
| `navigation.text.primary` | `theme.palette.offwhite?.["000"]` | Consistent fallback-free access |
| `navigation.text.secondary` | `theme.palette.offwhite["001"]` | Explicit secondary text |
| `navigation.border.subtle` | `theme.palette.granite["020"]` | View All underlines |
| `navigation.background.hover` | `theme.palette.granite['070']` | Menu item hover |
| `navigation.button.color` | `theme.palette.offwhite?.["000"] \|\| "inherit"` | No fallback needed |

## Layer 2: MUI Component Variants

### Button Variants

Add to `src/theme/components/navigation.js` under `MuiButton.variants`:

#### navPrimary

Base navigation button style for menu triggers and nav links.

```javascript
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
}
```

**Usage**: Main nav buttons, MegaMenu triggers, conditional nav links (Apprenticeships, Study Plus, Admin)

#### navViewAll

"View All X" action buttons with bottom margin.

```javascript
{
  props: { variant: 'navViewAll' },
  style: {
    color: semanticColors.navigation.button.color,
    textTransform: 'none',
    paddingTop: 0,
    marginBottom: liftKitTheme.spacing.sm,
  },
}
```

**Usage**: "View All Products", "View All Distance Learning", "View All Tutorials" buttons

#### topNavAction

Top navigation action buttons (search, cart, account).

```javascript
{
  props: { variant: 'topNavAction' },
  style: {
    color: semanticColors.navigation.text.primary,
    textTransform: 'none',
    padding: 0,
    justifyContent: 'center',
  },
}
```

**Usage**: TopNavBar action buttons

### Typography Variants

Add to `src/theme/components/navigation.js` under `MuiTypography.variants`:

#### navViewAllText

Underlined text for "View All" links.

```javascript
{
  props: { variant: 'navViewAllText' },
  style: {
    borderBottom: `1px solid ${semanticColors.navigation.border.subtle}`,
  },
}
```

**Usage**: Text inside "View All" buttons

#### navHeading

Menu section headings (e.g., "Core Principles", "Location").

```javascript
{
  props: { variant: 'navHeading' },
  style: {
    marginBottom: liftKitTheme.spacing.xs,
    fontWeight: 'bold',
    cursor: 'pointer',
  },
}
```

**Usage**: Section headers in mega menus

## Migration Reference

### Before → After Examples

#### Example 1: View All Button

```javascript
// BEFORE
<Button
  variant="text"
  sx={{
    mb: 1,
    color: theme.palette.offwhite?.["000"] || "inherit",
    textTransform: "none",
    pt: 0,
  }}
>
  <Typography
    variant="navlink"
    sx={{ borderBottom: "1px solid " + theme.palette.granite["020"] }}
  >
    View All Products
  </Typography>
</Button>

// AFTER
<Button variant="navViewAll" sx={{ mb: 1 }}>
  <Typography variant="navViewAllText">View All Products</Typography>
</Button>
```

#### Example 2: Nav Link Button

```javascript
// BEFORE
<Button
  component={NavLink}
  to="/apprenticeships"
  sx={{
    color: theme.palette.offwhite?.["000"] || "inherit",
    textTransform: "none",
    mx: { xl: 2 },
  }}
>

// AFTER
<Button
  variant="navPrimary"
  component={NavLink}
  to="/apprenticeships"
  sx={{ mx: { xl: 2 } }}
>
```

## Validation Rules

1. **No hardcoded colors**: All `theme.palette.*` references in navigation components must be replaced with semantic tokens or variants
2. **Layout-only inline**: Only `margin`, `padding`, `flex`, `display`, `position` allowed in sx props
3. **Consistent fallbacks**: Tokens eliminate need for `|| "inherit"` fallbacks
