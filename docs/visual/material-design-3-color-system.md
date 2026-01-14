# Material Design 3 Color System

> A comprehensive guide to understanding the MD3 color token naming system and how to apply it in Admin3.

**Last Updated:** January 2026
**Applies To:** Frontend theming, Material-UI customization

---

## Table of Contents

1. [Overview](#overview)
2. [The Five Key Colors](#the-five-key-colors)
3. [Understanding "On" Colors](#understanding-on-colors)
4. [Container Colors](#container-colors)
5. [On Container Colors](#on-container-colors)
6. [Scrim](#scrim)
7. [Complete Token Reference](#complete-token-reference)
8. [Black & White Theme Strategy](#black--white-theme-strategy)
9. [MUI Integration](#mui-integration)

---

## Overview

Material Design 3 (MD3) uses a **role-based color system** where each color serves a specific purpose in the UI. Instead of arbitrary color names, MD3 defines colors by their **function** in the interface.

### Why This Matters

- **Accessibility**: The system ensures proper contrast ratios automatically
- **Consistency**: All components use the same color relationships
- **Theming**: Change one token, update the entire app consistently
- **Dark Mode**: Light/dark themes are generated from the same source colors

---

## The Five Key Colors

MD3 builds its entire palette from five foundational colors:

```
┌─────────────────────────────────────────────────────────────────┐
│                     FIVE KEY COLORS                             │
├─────────────┬───────────────────────────────────────────────────┤
│  PRIMARY    │  Main brand color - buttons, FABs, key actions    │
├─────────────┼───────────────────────────────────────────────────┤
│  SECONDARY  │  Supporting accents - chips, switches, filters    │
├─────────────┼───────────────────────────────────────────────────┤
│  TERTIARY   │  Additional variety - badges, highlights          │
├─────────────┼───────────────────────────────────────────────────┤
│  ERROR      │  Problems/warnings - error states, destructive    │
├─────────────┼───────────────────────────────────────────────────┤
│  NEUTRAL    │  Backgrounds/surfaces - cards, dialogs, app bg    │
└─────────────┴───────────────────────────────────────────────────┘
```

### Visual Example

```
Primary:   ████████████  Used for: Main CTA buttons, active states
Secondary: ████████████  Used for: Filter chips, toggles
Tertiary:  ████████████  Used for: Badges, accent highlights
Error:     ████████████  Used for: Error messages, delete buttons
Neutral:   ░░░░░░░░░░░░  Used for: Page background, cards
```

---

## Understanding "On" Colors

### What Does "On" Mean?

The **"on-"** prefix answers: *"What color should content be when placed ON this background?"*

This ensures text and icons are always readable against their background.

### Visual Explanation

```
┌─────────────────────────────────────────────┐
│                                             │
│    "Subscribe Now"   ← on-primary (white)   │
│    ████████████████                         │
│    ↑ primary background (dark blue)         │
│                                             │
└─────────────────────────────────────────────┘

The button background IS the "primary" color.
The button TEXT uses the "on-primary" color.
```

### The Relationship

| Background Token | Content Token | Why |
|------------------|---------------|-----|
| `primary` (dark) | `on-primary` (light) | Light text readable on dark bg |
| `primary` (light) | `on-primary` (dark) | Dark text readable on light bg |
| `secondary` | `on-secondary` | Same principle |
| `tertiary` | `on-tertiary` | Same principle |
| `error` | `on-error` | Same principle |
| `surface` | `on-surface` | Same principle |

### Code Example

```css
/* CSS Custom Properties */
:root {
  --md-sys-color-primary: #1A1A1A;        /* Button background */
  --md-sys-color-on-primary: #FFFFFF;      /* Button text */
}

/* Usage */
.button-primary {
  background-color: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
}
```

---

## Container Colors

### What Are Containers?

**Containers** are softer, lower-emphasis versions of the key colors. They're used for larger surface areas where the full-strength color would be overwhelming.

### When to Use Each

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   PRIMARY                        PRIMARY-CONTAINER              │
│   ┌───────────────┐              ┌─────────────────────────┐    │
│   │  CTA Button   │              │                         │    │
│   │  "Buy Now"    │              │   Selected Card         │    │
│   │               │              │   Info Banner           │    │
│   │  Bold, small  │              │   Chip background       │    │
│   │  High emphasis│              │                         │    │
│   └───────────────┘              │   Subtle, large area    │    │
│                                  │   Low emphasis          │    │
│                                  └─────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Visual Comparison

```
primary:            ████████████████  #1A1A1A  (near black - bold)
primary-container:  ░░░░░░░░░░░░░░░░  #E0E0E0  (light gray - subtle)

secondary:          ████████████████  #5C5C5C  (dark gray - medium)
secondary-container:░░░░░░░░░░░░░░░░  #F5F5F5  (very light - subtle)
```

### Use Cases

| Token | Use Case | Example |
|-------|----------|---------|
| `primary` | High-emphasis actions | Main CTA buttons |
| `primary-container` | Selected/active states | Selected card, active tab background |
| `secondary` | Medium-emphasis actions | Secondary buttons |
| `secondary-container` | Supporting UI | Filter chips, toggles |
| `tertiary` | Accent elements | Badges, highlights |
| `tertiary-container` | Accent backgrounds | Notification backgrounds |

---

## On Container Colors

### The Same Principle, Applied to Containers

Just like `on-primary` provides readable content for `primary`, **`on-primary-container`** provides readable content for `primary-container`.

### Visual Explanation

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   PRIMARY BUTTON                 PRIMARY-CONTAINER CARD         │
│   ┌───────────────┐              ┌─────────────────────────┐    │
│   │ Button Text   │ ← on-primary │ Card Title              │    │
│   │ (white)       │   (light)    │ (dark)                  │    │
│   │               │              │           ↑              │    │
│   │ ████████████  │              │  on-primary-container   │    │
│   │ ↑ primary     │              │                         │    │
│   │   (dark)      │              │ ░░░░░░░░░░░░░░░░░░░░░░  │    │
│   └───────────────┘              │ ↑ primary-container     │    │
│                                  │   (light)               │    │
│                                  └─────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### The Logic

| Background | Content Color | Reason |
|------------|---------------|--------|
| `primary` (dark) | `on-primary` (light) | Light on dark |
| `primary-container` (light) | `on-primary-container` (dark) | Dark on light |

### Complete Token Family

For **each key color**, you get 4 tokens:

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRIMARY TOKEN FAMILY                         │
├─────────────────────────┬───────────────────────────────────────┤
│  primary                │  Main buttons, key UI elements        │
│  #1A1A1A (dark)         │  High emphasis backgrounds            │
├─────────────────────────┼───────────────────────────────────────┤
│  on-primary             │  Text/icons ON primary backgrounds    │
│  #FFFFFF (light)        │  Ensures readability                  │
├─────────────────────────┼───────────────────────────────────────┤
│  primary-container      │  Cards, chips, subtle backgrounds     │
│  #E0E0E0 (light)        │  Lower emphasis surfaces              │
├─────────────────────────┼───────────────────────────────────────┤
│  on-primary-container   │  Text/icons ON container backgrounds  │
│  #1A1A1A (dark)         │  Ensures readability                  │
└─────────────────────────┴───────────────────────────────────────┘
```

This pattern repeats for: **primary**, **secondary**, **tertiary**, **error**

---

## Scrim

### What Is Scrim?

**Scrim** is a semi-transparent overlay that dims background content when a modal, drawer, or dialog appears. It focuses user attention on the foreground element.

### Visual Explanation

```
┌─────────────────────────────────────────────────────────────────┐
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│  ░░░░░░░░░░░░░┌───────────────────────────┐░░░░░░░░░░░░░░░░░  │
│  ░░░░░░░░░░░░░│                           │░░░░░░░░░░░░░░░░░  │
│  ░░░░░░░░░░░░░│      Modal Dialog         │░░░░░░░░░░░░░░░░░  │
│  ░░░░░░░░░░░░░│                           │░░░░░░░░░░░░░░░░░  │
│  ░░░░░░░░░░░░░│   [Cancel]    [Confirm]   │░░░░░░░░░░░░░░░░░  │
│  ░░░░░░░░░░░░░│                           │░░░░░░░░░░░░░░░░░  │
│  ░░░░░░░░░░░░░└───────────────────────────┘░░░░░░░░░░░░░░░░░  │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│               ↑                                                 │
│            SCRIM                                                │
│   (semi-transparent overlay dimming background)                 │
└─────────────────────────────────────────────────────────────────┘
```

### Typical Values

```css
:root {
  /* Standard scrim - 32% opacity black */
  --md-sys-color-scrim: rgba(0, 0, 0, 0.32);

  /* Darker scrim for high-contrast modals */
  --md-sys-color-scrim-dark: rgba(0, 0, 0, 0.5);
}
```

### MUI Implementation

```javascript
// In theme configuration
MuiBackdrop: {
  styleOverrides: {
    root: {
      backgroundColor: 'rgba(0, 0, 0, 0.5)',  // scrim
    }
  }
}
```

---

## Complete Token Reference

### Full Token List

```
┌─────────────────────────────────────────────────────────────────┐
│                    MD3 COLOR TOKENS                             │
├─────────────────────────────────────────────────────────────────┤
│  PRIMARY FAMILY                                                 │
│  ├── primary                    Main brand color                │
│  ├── on-primary                 Content on primary              │
│  ├── primary-container          Softer primary surfaces         │
│  └── on-primary-container       Content on container            │
├─────────────────────────────────────────────────────────────────┤
│  SECONDARY FAMILY                                               │
│  ├── secondary                  Supporting accent               │
│  ├── on-secondary               Content on secondary            │
│  ├── secondary-container        Softer secondary surfaces       │
│  └── on-secondary-container     Content on container            │
├─────────────────────────────────────────────────────────────────┤
│  TERTIARY FAMILY                                                │
│  ├── tertiary                   Additional accent               │
│  ├── on-tertiary                Content on tertiary             │
│  ├── tertiary-container         Softer tertiary surfaces        │
│  └── on-tertiary-container      Content on container            │
├─────────────────────────────────────────────────────────────────┤
│  ERROR FAMILY                                                   │
│  ├── error                      Error/warning states            │
│  ├── on-error                   Content on error                │
│  ├── error-container            Softer error surfaces           │
│  └── on-error-container         Content on container            │
├─────────────────────────────────────────────────────────────────┤
│  SURFACE/NEUTRAL FAMILY                                         │
│  ├── surface                    Card/dialog backgrounds         │
│  ├── on-surface                 Primary text color              │
│  ├── surface-variant            Alternative surfaces            │
│  ├── on-surface-variant         Secondary text color            │
│  ├── background                 App background                  │
│  ├── on-background              Text on background              │
│  ├── outline                    Borders, dividers               │
│  └── outline-variant            Subtle borders                  │
├─────────────────────────────────────────────────────────────────┤
│  UTILITY                                                        │
│  └── scrim                      Modal/drawer overlay            │
└─────────────────────────────────────────────────────────────────┘
```

### Token Naming Pattern

```
{role}                      →  Background color
on-{role}                   →  Content ON that background
{role}-container            →  Softer background variant
on-{role}-container         →  Content ON the container
```

---

## Black & White Theme Strategy

For Admin3's primarily black and white aesthetic, here are recommended approaches:

### Option 1: Monochromatic with Value Hierarchy

Differentiate by **lightness** rather than hue:

```css
:root {
  /* PRIMARY: Black - highest priority */
  --md-sys-color-primary: #1A1A1A;
  --md-sys-color-on-primary: #FFFFFF;
  --md-sys-color-primary-container: #E0E0E0;
  --md-sys-color-on-primary-container: #1A1A1A;

  /* SECONDARY: Dark gray - medium priority */
  --md-sys-color-secondary: #5C5C5C;
  --md-sys-color-on-secondary: #FFFFFF;
  --md-sys-color-secondary-container: #F5F5F5;
  --md-sys-color-on-secondary-container: #1A1A1A;

  /* TERTIARY: Medium gray - low priority */
  --md-sys-color-tertiary: #757575;
  --md-sys-color-on-tertiary: #FFFFFF;
  --md-sys-color-tertiary-container: #FAFAFA;
  --md-sys-color-on-tertiary-container: #424242;
}
```

### Option 2: Pure Grayscale Values

```
Emphasis Level        Color Value      Use Case
─────────────────────────────────────────────────
Highest (Primary)     #000000          Main CTA buttons
High (Secondary)      #424242          Secondary buttons
Medium (Tertiary)     #757575          Tertiary actions
Low                   #9E9E9E          Disabled states
Minimal               #E0E0E0          Borders, dividers
```

### Visual Hierarchy Without Color

When you can't use color to differentiate, use:

| Technique | Example |
|-----------|---------|
| **Value contrast** | Primary: #000, Secondary: #424242, Tertiary: #757575 |
| **Size/weight** | Primary buttons larger and bolder |
| **Elevation** | Primary actions have more shadow |
| **Border treatment** | Filled vs outlined variants |
| **Spacing** | More prominent elements have more whitespace |

---

## MUI Integration

### Mapping MD3 Tokens to MUI Theme

```javascript
// src/theme/colorTheme.js

const palette = {
  // PRIMARY → MUI primary
  primary: {
    main: '#1A1A1A',           // primary
    light: '#484848',          // primary (lighter variant)
    dark: '#000000',           // primary (darker variant)
    contrastText: '#FFFFFF',   // on-primary
  },

  // SECONDARY → MUI secondary
  secondary: {
    main: '#5C5C5C',           // secondary
    light: '#8A8A8A',
    dark: '#333333',
    contrastText: '#FFFFFF',   // on-secondary
  },

  // SURFACE/NEUTRAL → MUI background
  background: {
    default: '#FAFAFA',        // background
    paper: '#FFFFFF',          // surface
  },

  // ERROR → MUI error
  error: {
    main: '#D32F2F',           // error
    contrastText: '#FFFFFF',   // on-error
  },

  // Additional MD3 tokens as custom palette
  primaryContainer: {
    main: '#E0E0E0',           // primary-container
    contrastText: '#1A1A1A',   // on-primary-container
  },

  secondaryContainer: {
    main: '#F5F5F5',           // secondary-container
    contrastText: '#1A1A1A',   // on-secondary-container
  },
};
```

### Using Custom Tokens in Components

```javascript
// Access in sx prop
<Box
  sx={{
    bgcolor: 'primaryContainer.main',
    color: 'primaryContainer.contrastText',
  }}
>
  Selected Card Content
</Box>

// Or via theme
<Box
  sx={(theme) => ({
    bgcolor: theme.palette.primaryContainer.main,
    color: theme.palette.primaryContainer.contrastText,
  })}
>
  Selected Card Content
</Box>
```

---

## Summary Cheat Sheet

```
┌─────────────────────────────────────────────────────────────────┐
│                    QUICK REFERENCE                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  TOKEN PATTERN          MEANING                                 │
│  ─────────────────────────────────────────────────────────────  │
│  {color}                Background/fill color                   │
│  on-{color}             Content (text/icons) ON that color      │
│  {color}-container      Softer variant for larger areas         │
│  on-{color}-container   Content ON the container                │
│  scrim                  Modal/drawer backdrop overlay           │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  WHEN TO USE            TOKEN                                   │
│  ─────────────────────────────────────────────────────────────  │
│  Main CTA button bg     primary                                 │
│  Main CTA button text   on-primary                              │
│  Selected card bg       primary-container                       │
│  Selected card text     on-primary-container                    │
│  Modal overlay          scrim                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Related Documentation

- [Material Design 3 Color Documentation](https://m3.material.io/styles/color/overview)
- [Material Web Color Theming](https://github.com/material-components/material-web/blob/main/docs/theming/color.md)
- [MUI Theme Customization](https://mui.com/material-ui/customization/theming/)

---

## References

- Source: [Material Web - Color Theming](https://github.com/material-components/material-web/blob/main/docs/theming/color.md)
- Material Theme Builder: [Figma Plugin](https://www.figma.com/community/plugin/1034969338659738588/material-theme-builder)
