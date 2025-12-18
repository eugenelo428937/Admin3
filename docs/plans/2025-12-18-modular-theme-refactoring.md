# Modular Theme Refactoring Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor the 1,936-line theme.js monolith into focused, maintainable modules and establish patterns to move inline sx styling to the theme.

**Architecture:** Split theme into domain-specific modules (colors, typography, spacing, components). Each component category gets its own file. Create semantic style objects that components import instead of inline sx. Maintain backward compatibility during migration.

**Tech Stack:** MUI v5 theming, createTheme, deepmerge for theme composition

---

## Phase 1: Create Module Structure (Non-Breaking)

### Task 1.1: Create Theme Directory Structure

**Files:**
- Create: `frontend/react-Admin3/src/theme/colors/index.js`
- Create: `frontend/react-Admin3/src/theme/spacing/index.js`
- Create: `frontend/react-Admin3/src/theme/typography/index.js`
- Create: `frontend/react-Admin3/src/theme/components/index.js`
- Create: `frontend/react-Admin3/src/theme/components/cards/index.js`
- Create: `frontend/react-Admin3/src/theme/utils/index.js`

**Step 1: Create empty directory structure with placeholder index files**

Create `frontend/react-Admin3/src/theme/colors/index.js`:
```javascript
// Colors Module - Re-exports from colorTheme for now
// Will be expanded with semantic color mappings
import colorTheme from '../colorTheme';

export default colorTheme;
export { colorTheme };
```

Create `frontend/react-Admin3/src/theme/spacing/index.js`:
```javascript
// Spacing Module - Re-exports from liftKitTheme for now
import liftKitTheme from '../liftKitTheme';

export default liftKitTheme;
export { liftKitTheme };
```

Create `frontend/react-Admin3/src/theme/typography/index.js`:
```javascript
// Typography Module - Placeholder for typography extraction
// Currently defined inline in theme.js, will be extracted

export const typographyConfig = {
  // Will be populated in Task 2.3
};

export default typographyConfig;
```

Create `frontend/react-Admin3/src/theme/components/index.js`:
```javascript
// Components Module - Aggregates all component style overrides
// Will import from subdirectories

export const componentOverrides = {
  // Will be populated as we extract components
};

export default componentOverrides;
```

Create `frontend/react-Admin3/src/theme/components/cards/index.js`:
```javascript
// Card Components Module - All card variant styles
// Will contain productCard, tutorialCard, materialCard, etc.

export const cardOverrides = {
  // Will be populated in Phase 3
};

export default cardOverrides;
```

Create `frontend/react-Admin3/src/theme/utils/index.js`:
```javascript
// Theme Utilities - Gradient functions, style helpers
// Extracted from theme.js

export const createGradientStyle = (mousePosition, isHovered, colorScheme) => {
  const { x, y } = mousePosition;
  const intensity = isHovered ? 0.15 : 0.03;
  const gradientAngle = Math.atan2(y - 50, x - 50) * (180 / Math.PI);

  return {
    background: `linear-gradient(${gradientAngle}deg,
      rgba(${colorScheme.primary}, ${intensity}) 0%,
      rgba(${colorScheme.secondary}, ${intensity * 0.7}) 30%,
      rgba(255, 255, 255, 0) 60%,
      rgba(${colorScheme.accent}, ${intensity * 0.5}) 100%)`,
    transition: isHovered
      ? "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
      : "all 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
  };
};

export const gradientColorSchemes = {
  material: {
    primary: "140, 250, 250",
    secondary: "33, 150, 243",
    accent: "173, 63, 181",
  },
  tutorial: {
    primary: "156, 39, 176",
    secondary: "233, 30, 99",
    accent: "103, 58, 183",
  },
  online: {
    primary: "33, 150, 243",
    secondary: "3, 169, 244",
    accent: "63, 81, 181",
  },
  bundle: {
    primary: "76, 175, 80",
    secondary: "139, 195, 74",
    accent: "46, 125, 50",
  },
  assessment: {
    primary: "156, 39, 176",
    secondary: "233, 30, 99",
    accent: "103, 58, 183",
  },
  marking: {
    primary: "255, 152, 0",
    secondary: "255, 193, 7",
    accent: "255, 111, 0",
  },
};

export default { createGradientStyle, gradientColorSchemes };
```

**Step 2: Verify files are created correctly**

Run: `dir frontend\react-Admin3\src\theme /s /b`

Expected: All new directories and files listed

**Step 3: Commit**

```bash
git add frontend/react-Admin3/src/theme/
git commit -m "feat(theme): create modular theme directory structure

- Add colors/, spacing/, typography/, components/, utils/ modules
- Create placeholder index files for future extraction
- Extract gradient utilities to utils/index.js
- Non-breaking: existing theme.js unchanged"
```

---

## Phase 2: Extract Core Theme Modules

### Task 2.1: Extract and Enhance Colors Module

**Files:**
- Modify: `frontend/react-Admin3/src/theme/colors/index.js`
- Create: `frontend/react-Admin3/src/theme/colors/semantic.js`

**Step 1: Create semantic color mappings**

Create `frontend/react-Admin3/src/theme/colors/semantic.js`:
```javascript
// Semantic Color Mappings
// Maps design intent to actual colors for consistent usage across components

import colorTheme from '../colorTheme';

/**
 * Semantic colors map purpose/intent to actual color values.
 * Use these in components instead of raw palette colors.
 *
 * Example usage:
 *   sx={{ backgroundColor: theme.palette.semantic.cardHeader.tutorial }}
 */
export const semanticColors = {
  // Card header backgrounds by product type
  cardHeader: {
    tutorial: colorTheme.bpp.purple['020'],
    material: colorTheme.bpp.sky['020'],
    bundle: colorTheme.bpp.green['030'],
    onlineClassroom: colorTheme.bpp.cobalt['020'],
    marking: colorTheme.bpp.pink['020'],
    markingVoucher: colorTheme.bpp.orange['020'],
  },

  // Card action area backgrounds
  cardActions: {
    tutorial: colorTheme.bpp.purple['030'],
    material: colorTheme.bpp.sky['030'],
    bundle: colorTheme.bpp.green['040'],
    onlineClassroom: colorTheme.bpp.cobalt['030'],
    marking: colorTheme.bpp.pink['030'],
    markingVoucher: colorTheme.bpp.orange['030'],
  },

  // Badge backgrounds
  badge: {
    tutorial: colorTheme.bpp.purple['010'],
    material: colorTheme.bpp.sky['010'],
    bundle: colorTheme.bpp.green['010'],
    onlineClassroom: colorTheme.bpp.cobalt['010'],
    marking: colorTheme.bpp.pink['010'],
    default: 'rgba(255, 255, 255, 0.5)',
  },

  // Text colors by product type (dark variants for headers)
  cardText: {
    tutorial: {
      title: colorTheme.bpp.sky['100'],
      subtitle: colorTheme.bpp.sky['090'],
      price: colorTheme.bpp.purple['100'],
    },
    material: {
      title: colorTheme.bpp.sky['100'],
      subtitle: colorTheme.bpp.sky['090'],
      price: colorTheme.bpp.sky['100'],
    },
    bundle: {
      title: colorTheme.bpp.green['100'],
      subtitle: colorTheme.bpp.green['090'],
      price: colorTheme.bpp.green['100'],
    },
    onlineClassroom: {
      title: colorTheme.bpp.cobalt['100'],
      subtitle: colorTheme.bpp.cobalt['090'],
      price: colorTheme.bpp.cobalt['100'],
    },
    marking: {
      title: colorTheme.bpp.pink['100'],
      subtitle: colorTheme.bpp.pink['090'],
      price: colorTheme.bpp.granite['100'],
    },
  },

  // Button colors by product type
  addToCartButton: {
    tutorial: {
      background: colorTheme.bpp.purple['050'],
      hover: colorTheme.bpp.purple['070'],
    },
    material: {
      background: colorTheme.bpp.sky['060'],
      hover: colorTheme.bpp.sky['070'],
    },
    bundle: {
      background: colorTheme.bpp.green['060'],
      hover: colorTheme.bpp.green['080'],
    },
    onlineClassroom: {
      background: colorTheme.bpp.cobalt['055'],
      hover: colorTheme.bpp.cobalt['070'],
    },
    marking: {
      background: colorTheme.bpp.pink['060'],
      hover: colorTheme.bpp.pink['080'],
    },
  },

  // Avatar backgrounds
  avatar: {
    default: colorTheme.bpp.granite['020'],
  },

  // Icon colors by product type
  icon: {
    tutorial: colorTheme.bpp.purple['090'],
    material: colorTheme.bpp.sky['090'],
    bundle: colorTheme.bpp.green['090'],
    onlineClassroom: colorTheme.bpp.cobalt['090'],
    marking: colorTheme.bpp.pink['090'],
  },
};

export default semanticColors;
```

**Step 2: Update colors index to export semantic colors**

Modify `frontend/react-Admin3/src/theme/colors/index.js`:
```javascript
// Colors Module
// Exports raw color palette and semantic color mappings

import colorTheme from '../colorTheme';
import semanticColors from './semantic';

// Re-export everything from colorTheme
export * from '../colorTheme';
export { colorTheme };

// Export semantic mappings
export { semanticColors };

// Default export is the raw colorTheme for backward compatibility
export default colorTheme;
```

**Step 3: Commit**

```bash
git add frontend/react-Admin3/src/theme/colors/
git commit -m "feat(theme): add semantic color mappings for product types

- Create semantic.js with purpose-based color mappings
- Map card headers, actions, badges, text, buttons by product type
- Enables components to use semantic names instead of raw palette
- Example: theme.palette.semantic.cardHeader.tutorial"
```

---

### Task 2.2: Extract Spacing Module with Semantic Tokens

**Files:**
- Modify: `frontend/react-Admin3/src/theme/spacing/index.js`
- Create: `frontend/react-Admin3/src/theme/spacing/semantic.js`

**Step 1: Create semantic spacing tokens**

Create `frontend/react-Admin3/src/theme/spacing/semantic.js`:
```javascript
// Semantic Spacing Tokens
// Maps component-specific spacing to liftkit values

import liftKitTheme from '../liftKitTheme';

/**
 * Semantic spacing tokens for consistent component spacing.
 * Use these instead of raw spacing values in components.
 *
 * Example usage:
 *   sx={{ padding: theme.liftkit.semantic.card.padding }}
 */
export const semanticSpacing = {
  // Card spacing
  card: {
    padding: liftKitTheme.spacing.md,
    paddingLarge: liftKitTheme.spacing.lg,
    headerPadding: '1rem',
    contentPadding: liftKitTheme.spacing.md,
    actionsPadding: liftKitTheme.spacing.md,
    gap: liftKitTheme.spacing.sm,
  },

  // Badge spacing
  badge: {
    padding: liftKitTheme.spacing.sm,
    gap: liftKitTheme.spacing.xs2,
  },

  // Button spacing
  button: {
    padding: liftKitTheme.spacing.sm,
    iconSize: liftKitTheme.spacing.xl15,
    gap: liftKitTheme.spacing.xs,
  },

  // Form spacing
  form: {
    fieldGap: liftKitTheme.spacing.sm,
    sectionGap: liftKitTheme.spacing.lg,
    labelGap: liftKitTheme.spacing.xs2,
  },

  // Layout spacing
  layout: {
    containerPadding: liftKitTheme.spacing.lg,
    sectionGap: liftKitTheme.spacing.xl,
    itemGap: liftKitTheme.spacing.md,
  },

  // Navigation spacing
  navigation: {
    itemPadding: liftKitTheme.spacing.sm,
    menuGap: liftKitTheme.spacing.md,
  },
};

export default semanticSpacing;
```

**Step 2: Update spacing index**

Modify `frontend/react-Admin3/src/theme/spacing/index.js`:
```javascript
// Spacing Module
// Exports liftkit spacing system and semantic spacing tokens

import liftKitTheme from '../liftKitTheme';
import semanticSpacing from './semantic';

// Re-export liftkit theme
export { liftKitTheme };

// Export semantic spacing
export { semanticSpacing };

// Default export for backward compatibility
export default liftKitTheme;
```

**Step 3: Commit**

```bash
git add frontend/react-Admin3/src/theme/spacing/
git commit -m "feat(theme): add semantic spacing tokens

- Create semantic.js with purpose-based spacing mappings
- Define card, badge, button, form, layout, navigation spacing
- Enables consistent spacing via theme.liftkit.semantic.card.padding"
```

---

### Task 2.3: Extract Typography Module

**Files:**
- Modify: `frontend/react-Admin3/src/theme/typography/index.js`

**Step 1: Extract typography from theme.js into module**

Modify `frontend/react-Admin3/src/theme/typography/index.js`:
```javascript
// Typography Module
// All typography variants extracted from theme.js

import liftKitTheme from '../liftKitTheme';

/**
 * Typography configuration for MUI theme.
 * Includes standard MUI variants and custom variants (BPP, Acted, navlink, etc.)
 */
export const typographyConfig = {
  BPP: {
    fontFamily: "'Inter', sans-serif",
    fontWeight: 600,
    fontSize: "calc(1em * var(--wholestep) * var(--wholestep) * var(--wholestep)) !important",
    lineHeight: "var(--halfstep-dec) !important",
    letterSpacing: "-0.022em",
    fontOpticalSizing: "auto",
    fontStyle: "normal",
    fontVariationSettings: "'wght' 600",
  },
  Acted: {
    fontFamily: "'Inter', sans-serif",
    fontWeight: 200,
    fontSize: "calc(1em * var(--wholestep) * var(--wholestep)) !important",
    lineHeight: "var(--halfstep) !important",
    letterSpacing: "-0.022em !important",
    fontOpticalSizing: "auto",
    fontStyle: "normal",
    fontVariationSettings: "'wght' 200",
    marginTop: "calc( var(--2xs) / var(--halfstep) / var(--halfstep) / var(--eighthstep))",
  },
  h1: {
    fontFamily: "'Inter', sans-serif",
    fontWeight: 400,
    fontSize: "calc(1em * var(--wholestep) * var(--wholestep) * var(--wholestep)) !important",
    lineHeight: "var(--quarterstep) !important",
    letterSpacing: "-0.022em !important",
    textWrap: "balance",
  },
  h2: {
    fontFamily: "'Inter', sans-serif",
    fontWeight: 400,
    fontSize: "calc(1em * var(--wholestep) * var(--wholestep)) !important",
    lineHeight: "var(--halfstep) !important",
    letterSpacing: "-0.022em !important",
  },
  h3: {
    fontFamily: "'Inter', 'Poppins', sans-serif",
    fontWeight: 400,
    fontSize: "calc(1em * var(--wholestep) * var(--halfstep)) !important",
    lineHeight: "var(--halfstep) !important",
    letterSpacing: "-0.022em !important",
    textWrap: "balance",
  },
  price: {
    fontFamily: "'Inter', 'Poppins', sans-serif",
    fontWeight: 400,
    fontSize: "calc(1em * var(--wholestep) * var(--eighthstep)) !important",
    lineHeight: "var(--quarterstep) !important",
    letterSpacing: "-0.022em !important",
    textWrap: "balance",
  },
  h4: {
    fontFamily: "'Inter', 'Poppins', sans-serif",
    fontWeight: 400,
    fontSize: "calc(1em * var(--wholestep)) !important",
    lineHeight: "var(--halfstep) !important",
    letterSpacing: "-0.02em !important",
    textWrap: "balance",
  },
  productTitle: {
    fontFamily: "'Inter', 'Poppins', sans-serif",
    fontWeight: 500,
    fontSize: "calc(1em * var(--halfstep) * var(--quarterstep)) !important",
    lineHeight: "var(--halfstep) !important",
    letterSpacing: "-0.02em !important",
    textWrap: "balance",
  },
  h5: {
    fontFamily: "'Inter', 'Poppins', sans-serif",
    fontWeight: 500,
    fontSize: "calc(1em * var(--halfstep) * var(--eighthstep)) !important",
    lineHeight: "var(--halfstep) !important",
    letterSpacing: "-0.017em !important",
    textWrap: "balance",
  },
  navlink: {
    fontFamily: "'Inter', 'Poppins', sans-serif",
    fontWeight: 500,
    fontSize: "calc( 1em * var(--quarterstep) )!important",
    lineHeight: "var(--halfstep) !important",
    letterSpacing: "-0.004em !important",
    textTransform: "none",
    position: "static",
    top: "6.235em",
  },
  topnavlink: {
    fontFamily: "'Inter', 'Poppins', sans-serif",
    fontWeight: 300,
    fontSize: "calc(1em * var(--quarterstep)) !important",
    lineHeight: "var(--halfstep) !important",
    letterSpacing: "-0.017em !important",
    textWrap: "balance",
  },
  h6: {
    fontFamily: "'Inter', 'Poppins', sans-serif",
    fontWeight: 600,
    fontSize: "calc(1em * var(--quarterstep)) !important",
    lineHeight: "var(--halfstep) !important",
    letterSpacing: "-0.014em !important",
    textWrap: "balance",
  },
  subtitle1: {
    fontFamily: "'Inter', 'Poppins', sans-serif",
    fontWeight: 400,
    fontSize: "calc(1em / var(--quarterstep)) !important",
    lineHeight: "var(--halfstep) !important",
    letterSpacing: "-0.007em !important",
  },
  subtitle2: {
    fontFamily: "'Inter', 'Poppins', sans-serif",
    fontWeight: 400,
    fontSize: "calc(1em / var(--halfstep)) !important",
    lineHeight: "var(--halfstep) !important",
    letterSpacing: "-0.007em !important",
  },
  body1: {
    fontFamily: "'Inter', 'Poppins', sans-serif",
    fontWeight: 400,
    fontSize: "1em !important",
    lineHeight: "var(--wholestep) !important",
    letterSpacing: "-0.011em !important",
    textWrap: "pretty",
  },
  body2: {
    fontFamily: "'Inter', 'Poppins', sans-serif",
    fontWeight: 400,
    fontSize: "calc(1em / var(--quarterstep)) !important",
    lineHeight: "calc(var(--wholestep) / var(--quarterstep)) !important",
    letterSpacing: "-0.011em !important",
    textWrap: "balance",
  },
  button: {
    fontFamily: "'Inter', 'Poppins', sans-serif",
    fontWeight: 500,
    fontSize: "calc( 1em * var(--eighthstep) )!important",
    lineHeight: "var(--halfstep) !important",
    letterSpacing: "-0.004em !important",
    textTransform: "none",
    position: "static",
    top: "6.235em",
  },
  chip: {
    fontFamily: "'Inter', 'Poppins', sans-serif",
    fontWeight: 600,
    fontSize: "calc( 1em * var(--quarterstep) )!important",
    lineHeight: "var(--halfstep) !important",
    letterSpacing: "-0.004em !important",
    textTransform: "none",
    position: "static",
    top: "6.235em",
  },
  caption: {
    fontFamily: "'Inter', 'Poppins', sans-serif",
    fontWeight: 400,
    fontSize: "calc(1em / var(--halfstep)) !important",
    lineHeight: "var(--halfstep) !important",
    letterSpacing: "-0.007em !important",
  },
  captionBold: {
    fontFamily: "'Inter', 'Poppins', sans-serif",
    fontWeight: 600,
    fontSize: "calc(1em / var(--halfstep)) !important",
    lineHeight: "var(--halfstep) !important",
    letterSpacing: "-0.007em !important",
  },
  captionSemiBold: {
    fontFamily: "'Inter', 'Poppins', sans-serif",
    fontWeight: 500,
    fontSize: "calc(1em / var(--halfstep)) !important",
    lineHeight: "var(--halfstep) !important",
    letterSpacing: "-0.007em !important",
  },
  caption2: {
    fontFamily: "'Inter', 'Poppins', sans-serif",
    fontWeight: 400,
    fontSize: "calc(1em / var(--halfstep) / var(--quarterstep) ) !important",
    lineHeight: "var(--halfstep) !important",
    letterSpacing: "-0.007em !important",
  },
  overline: {
    fontFamily: "'Inter', 'Poppins', sans-serif",
    fontWeight: 400,
    fontSize: "calc(1em / var(--halfstep)) !important",
    lineHeight: "var(--halfstep) !important",
    letterSpacing: "0.0618em !important",
    textTransform: "uppercase",
  },
  fineprint: {
    fontFamily: "'Inter', 'Poppins', sans-serif",
    fontWeight: 200,
    fontSize: "calc(1em /  var(--halfstep)/  var(--quarterstep)) !important",
    lineHeight: "var(--halfstep) !important",
    letterSpacing: "-0.007em !important",
  },
};

/**
 * Responsive typography overrides.
 * Applied via breakpoints in the main theme.
 */
export const responsiveTypography = {
  BPP: {
    sm: {
      fontSize: "calc(1em * var(--wholestep) * var(--wholestep) * var(--halfstep)) !important",
      textAlign: "start",
      lineHeight: "calc(1em * var(--wholestep-dec) * var(--eighthstep)) !important",
    },
  },
  Acted: {
    sm: {
      fontSize: "calc(1em * var(--wholestep) * var(--halfstep)) !important",
      textAlign: "start",
      lineHeight: "calc(1em * var(--wholestep-dec) * var(--quarterstep) * var(--eighthstep) * var(--eighthstep)) !important",
      marginBottom: liftKitTheme.spacing.xs3,
    },
  },
  h3: {
    sm: {
      fontSize: "calc(1em * var(--wholestep) * var(--eighthstep)) !important",
    },
  },
  price: {
    sm: {
      fontSize: "calc(1em * var(--wholestep) * var(--eighthstep)) !important",
    },
  },
  navlink: {
    lg: {
      fontSize: "calc(1em * var(--quarterstep)) !important",
      fontWeight: 400,
    },
    md: {
      fontSize: "1em !important",
      fontWeight: 400,
    },
  },
  topnavlink: {
    lg: {
      fontSize: "calc(1em) !important",
      fontWeight: 400,
    },
  },
};

export default typographyConfig;
```

**Step 2: Commit**

```bash
git add frontend/react-Admin3/src/theme/typography/
git commit -m "feat(theme): extract typography configuration to module

- Move all typography variants from theme.js to typography/index.js
- Add responsiveTypography for breakpoint-specific overrides
- Include custom variants: BPP, Acted, navlink, price, productTitle"
```

---

## Phase 3: Extract Component Overrides

### Task 3.1: Extract Alert Component Styles

**Files:**
- Create: `frontend/react-Admin3/src/theme/components/alerts.js`

**Step 1: Create alerts component override**

Create `frontend/react-Admin3/src/theme/components/alerts.js`:
```javascript
// Alert Component Overrides
import colorTheme from '../colorTheme';
import liftKitTheme from '../liftKitTheme';

export const alertOverrides = {
  MuiAlert: {
    styleOverrides: {
      root: {
        maxWidth: "20rem",
        "& .MuiAlert-message": {
          textAlign: "start",
          whiteSpace: "pre-line",
        },
      },
      standardSuccess: {
        backgroundColor: colorTheme.success.background,
        color: colorTheme.success.main,
        marginBottom: liftKitTheme.spacing.xs3,
        "& .MuiAlertTitle-root": {
          color: colorTheme.success.dark,
          marginBottom: liftKitTheme.spacing.xs3,
        },
        "& .MuiTypography-root": {
          color: colorTheme.success.dark,
        },
      },
      standardError: {
        backgroundColor: colorTheme.error.background,
        color: colorTheme.error.dark,
        "& .MuiAlertTitle-root": {
          color: colorTheme.error.dark,
          marginBottom: liftKitTheme.spacing.xs3,
        },
        "& .MuiTypography-root": {
          color: colorTheme.error.dark,
        },
      },
      standardWarning: {
        backgroundColor: colorTheme.warning.background,
        color: colorTheme.warning.dark,
        "& .MuiAlertTitle-root": {
          color: colorTheme.warning.dark,
          marginBottom: liftKitTheme.spacing.xs3,
        },
        "& .MuiTypography-root": {
          color: colorTheme.warning.dark,
        },
      },
      standardInfo: {
        backgroundColor: colorTheme.info.background,
        color: colorTheme.info.dark,
        "& .MuiAlertTitle-root": {
          color: colorTheme.info.dark,
          marginBottom: liftKitTheme.spacing.xs3,
        },
        "& .MuiTypography-root": {
          color: colorTheme.info.dark,
        },
      },
    },
  },
};

export default alertOverrides;
```

**Step 2: Commit**

```bash
git add frontend/react-Admin3/src/theme/components/alerts.js
git commit -m "feat(theme): extract MuiAlert overrides to alerts.js"
```

---

### Task 3.2: Extract Button Component Styles

**Files:**
- Create: `frontend/react-Admin3/src/theme/components/buttons.js`

**Step 1: Create buttons component override**

Create `frontend/react-Admin3/src/theme/components/buttons.js`:
```javascript
// Button Component Overrides
import liftKitTheme from '../liftKitTheme';

export const buttonOverrides = {
  MuiButton: {
    styleOverrides: {
      root: {},
    },
    variants: [
      {
        props: { variant: "transparent-background" },
        style: {
          fontFamily: "'Inter', 'Poppins', sans-serif",
          fontWeight: 500,
          textTransform: "none",
          borderRadius: 6,
          width: "auto",
          height: liftKitTheme.typography.title1.fontSize,
          alignItems: "center",
          justifyContent: "center",
          "& .MuiButton-startIcon": {
            fontSize: liftKitTheme.typography.heading.fontSize,
            "& .MuiSvgIcon-root": {
              fontSize: liftKitTheme.typography.title3.fontSize,
            },
          },
          "&:hover": {
            boxShadow: "var(--Paper-shadow)",
            backdropFilter: "brightness(1.26)",
          },
          backgroundColor: "transparent",
          boxShadow: "none",
        },
      },
    ],
  },
};

export default buttonOverrides;
```

**Step 2: Commit**

```bash
git add frontend/react-Admin3/src/theme/components/buttons.js
git commit -m "feat(theme): extract MuiButton overrides to buttons.js"
```

---

### Task 3.3: Extract Input Component Styles

**Files:**
- Create: `frontend/react-Admin3/src/theme/components/inputs.js`

**Step 1: Create inputs component override**

Create `frontend/react-Admin3/src/theme/components/inputs.js`:
```javascript
// Input Component Overrides (TextField, InputBase, etc.)
import colorTheme from '../colorTheme';
import liftKitTheme from '../liftKitTheme';

export const inputOverrides = {
  MuiTextField: {
    styleOverrides: {
      root: {
        marginBottom: liftKitTheme.spacing.sm,
        "& .MuiInputBase-input": {
          color: colorTheme.liftkit.light.onSurface,
        },
      },
    },
    variants: [
      {
        props: { variant: "filled" },
        style: {},
      },
    ],
  },
  MuiInputBase: {
    styleOverrides: {
      root: {
        fontFamily: "'Inter', 'Poppins', sans-serif",
      },
    },
  },
  MuiFormHelperText: {
    styleOverrides: {
      root: {
        marginTop: liftKitTheme.spacing.xs2,
      },
    },
  },
};

export default inputOverrides;
```

**Step 2: Commit**

```bash
git add frontend/react-Admin3/src/theme/components/inputs.js
git commit -m "feat(theme): extract input component overrides to inputs.js"
```

---

### Task 3.4: Extract Navigation Component Styles

**Files:**
- Create: `frontend/react-Admin3/src/theme/components/navigation.js`

**Step 1: Create navigation component override**

Create `frontend/react-Admin3/src/theme/components/navigation.js`:
```javascript
// Navigation Component Overrides (AppBar, Tabs, Menu)
import colorTheme from '../colorTheme';

export const navigationOverrides = {
  MuiAppBar: {
    styleOverrides: {
      root: {
        backgroundColor: colorTheme.bpp.granite["080"],
      },
    },
  },
  MuiTabs: {
    styleOverrides: {
      root: {
        fontFamily: "'Inter', 'Poppins', sans-serif",
        minHeight: "48px",
        "& .MuiTabs-flexContainer": {
          display: "flex !important",
          alignItems: "center !important",
        },
        "& .MuiTabs-indicator": {
          backgroundColor: "#1976d2 !important",
          height: "3px !important",
          display: "block !important",
        },
      },
    },
  },
  MuiTab: {
    styleOverrides: {
      root: {
        fontFamily: "'Inter', 'Poppins', sans-serif",
        display: "flex !important",
        alignItems: "center !important",
        justifyContent: "center !important",
        minHeight: "48px !important",
        height: "48px !important",
        padding: "12px 16px !important",
        color: "#666666 !important",
        fontSize: "14px !important",
        fontWeight: "500 !important",
        textTransform: "none !important",
        border: "none !important",
        background: "transparent !important",
        cursor: "pointer !important",
        transition: "all 0.2s ease !important",
        boxSizing: "border-box !important",
        visibility: "visible !important",
        opacity: "1 !important",
        position: "relative !important",
        "&.Mui-selected": {
          color: "#1976d2 !important",
          fontWeight: "600 !important",
          backgroundColor: "transparent !important",
        },
        "&:hover": {
          color: "#1976d2 !important",
          backgroundColor: "rgba(25, 118, 210, 0.04) !important",
        },
      },
    },
  },
  MuiMenuItem: {
    styleOverrides: {
      root: {
        fontFamily: "'Inter', 'Poppins', sans-serif",
      },
    },
  },
};

export default navigationOverrides;
```

**Step 2: Commit**

```bash
git add frontend/react-Admin3/src/theme/components/navigation.js
git commit -m "feat(theme): extract navigation component overrides"
```

---

### Task 3.5: Extract Miscellaneous Component Styles

**Files:**
- Create: `frontend/react-Admin3/src/theme/components/misc.js`

**Step 1: Create misc component override**

Create `frontend/react-Admin3/src/theme/components/misc.js`:
```javascript
// Miscellaneous Component Overrides
import colorTheme from '../colorTheme';
import liftKitTheme from '../liftKitTheme';

export const miscOverrides = {
  MuiDivider: {
    styleOverrides: {
      root: {
        borderColor: colorTheme.bpp.granite["050"],
        opacity: 0.5,
      },
    },
  },
  MuiTypography: {
    styleOverrides: {
      root: {
        fontFamily: "'Inter', 'Poppins', sans-serif",
      },
    },
  },
  MuiSpeedDial: {
    styleOverrides: {
      root: {
        "& .MuiFab-root": {
          minWidth: liftKitTheme.spacing.xl15,
          minHeight: liftKitTheme.spacing.xl15,
          width: liftKitTheme.spacing.xl15,
          height: liftKitTheme.spacing.xl15,
        },
      },
      variants: [
        {
          props: { variant: "product-card-speeddial" },
          style: {},
        },
      ],
    },
  },
  MuiBackdrop: {
    styleOverrides: {
      root: {
        backgroundColor: "rgba(0, 0, 0, 0.75)",
      },
    },
  },
};

export default miscOverrides;
```

**Step 2: Commit**

```bash
git add frontend/react-Admin3/src/theme/components/misc.js
git commit -m "feat(theme): extract misc component overrides (Divider, Typography, SpeedDial, Backdrop)"
```

---

## Phase 4: Extract Card Variants (Largest Extraction)

### Task 4.1: Extract Base Product Card Styles

**Files:**
- Create: `frontend/react-Admin3/src/theme/components/cards/baseProductCard.js`

**Step 1: Create base product card styles**

Create `frontend/react-Admin3/src/theme/components/cards/baseProductCard.js`:
```javascript
// Base Product Card Styles
// Common styles shared by all product card variants
import colorTheme from '../../colorTheme';
import liftKitTheme from '../../liftKitTheme';

/**
 * Base product card variant styles.
 * All product-specific variants extend these base styles.
 */
export const baseProductCardStyles = {
  minWidth: "18rem",
  maxWidth: "18rem",
  height: "28.4rem !important",
  overflow: "visible",
  aspectRatio: "5/7",
  boxShadow: "var(--Paper-shadow)",
  justifyContent: "space-between",
  position: "relative",

  // Floating badges container
  "& .floating-badges-container": {
    position: "absolute",
    top: "calc(var(--product-card-header-height) - var(--badge-height) / 1.618)",
    right: liftKitTheme.spacing.sm,
    zIndex: 10,
    display: "flex",
    gap: liftKitTheme.spacing.xs2,
    pointerEvents: "none",
    "& .subject-badge": {
      padding: liftKitTheme.spacing.sm,
      alignItems: "center",
      justifyContent: "center",
      alignContent: "center",
      flexWrap: "wrap",
      fontWeight: 600,
      backgroundColor: "rgba(255, 255, 255, 0.5)",
      borderRadius: "16px",
      boxShadow: "0 1px 12px rgba(0,0,0,0.25)",
      border: "1px solid rgba(255, 255, 255, 0.3)",
      backdropFilter: "blur(20px)",
      color: colorTheme.bpp.granite["100"],
    },
    "& .session-badge": {
      padding: liftKitTheme.spacing.sm,
      alignItems: "center",
      justifyContent: "center",
      alignContent: "center",
      flexWrap: "wrap",
      fontWeight: 600,
      backgroundColor: "rgba(255, 255, 255, 0.5)",
      borderRadius: "16px",
      boxShadow: "0 1px 12px rgba(0,0,0,0.25)",
      border: "1px solid rgba(255, 255, 255, 0.3)",
      backdropFilter: "blur(20px)",
      color: colorTheme.bpp.granite["100"],
    },
  },

  // Product Header
  "& .product-header": {
    height: "7.43rem",
    width: "100%",
    padding: "1rem",
    boxShadow: "var(--shadow-sm)",
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    flex: "0 0 auto",
    "& .MuiCardHeader-content": {
      order: 1,
      flex: "1",
      textAlign: "left",
      "& .product-title": {
        width: "90%",
        textAlign: "left",
      },
      "& .product-subtitle": {},
    },
    "& .MuiCardHeader-avatar": {
      order: 2,
      marginLeft: "auto",
      marginRight: "0",
      "& .product-avatar": {
        boxShadow: "var(--Paper-shadow)",
        "& .product-avatar-icon": {
          fontSize: "1.5rem",
        },
      },
    },
  },

  // Content styling
  "& .MuiCardContent-root": {
    overflowY: 'auto',
    '&::-webkit-scrollbar': {
      width: '8px',
    },
    '&::-webkit-scrollbar-track': {
      backgroundColor: 'rgba(0, 0, 0, 0.05)',
      borderRadius: '4px',
    },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: 'rgba(0, 0, 0, 0.2)',
      borderRadius: '4px',
      '&:hover': {
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
      },
    },
    padding: liftKitTheme.spacing.md,
    flex: 1,
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-start",
    alignSelf: "flex-start",
    width: "100%",
  },

  // Actions styling
  "& .MuiCardActions-root": {
    height: "9.4em !important",
    boxShadow: "var(--shadow-lg)",
    paddingTop: liftKitTheme.spacing.md,
    paddingLeft: liftKitTheme.spacing.md,
    paddingRight: liftKitTheme.spacing.md,
    flexDirection: "column",
    alignItems: "stretch",
    justifyContent: "space-between",
    display: "flex",
    width: "100%",
    "& .price-container": {
      display: "flex",
      flexDirection: "row",
      justifyContent: "end",
      "& .discount-options": {
        display: "flex",
        flex: 1,
        alignSelf: "flex-start",
        flexDirection: "column",
        alignItems: "start",
        justifyContent: "start",
        textAlign: "left",
        maxWidth: "7.5rem",
        paddingRight: liftKitTheme.spacing.xs2,
        "& .discount-title": {
          textAlign: "left",
        },
        "& .discount-radio-group": {
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "flex-start",
          marginLeft: liftKitTheme.spacing.sm,
          maxWidth: "7.5rem",
          "& .discount-radio-option": {
            padding: liftKitTheme.spacing.xs3,
            paddingBottom: 0,
            width: "100%",
            transition: "all 0.2s ease-in-out",
            "&:hover": {
              boxShadow: "var(--Paper-shadow)",
              backdropFilter: "saturate(2.4)",
            },
            "& .MuiRadio-root": {
              width: liftKitTheme.spacing.md,
              height: liftKitTheme.spacing.md,
              alignItems: "center",
              justifyContent: "center",
              "& .MuiSvgIcon-root": {
                fontSize: liftKitTheme.spacing.md,
              },
            },
            "& .discount-label": {
              paddingLeft: liftKitTheme.spacing.xs,
            },
          },
        },
      },
      "& .price-action-section": {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        "& .price-info-row": {
          display: "flex",
          alignItems: "baseline",
          alignSelf: "flex-end",
          "& .price-display": {
            lineHeight: 1,
          },
          "& .info-button": {
            minWidth: "auto",
            borderRadius: "50%",
            paddingBottom: 0,
            "&:hover": {
              backdropFilter: "saturate(2.4)",
              boxShadow: "var(--Paper-shadow)",
              transform: "translateY(-1px)",
            },
            "& .MuiSvgIcon-root": {
              fontSize: "1.2rem",
            },
          },
        },
        "& .price-details-row": {
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          "& .price-level-text": {
            display: "block",
            textAlign: "right",
          },
          "& .vat-status-text": {
            display: "block",
            textAlign: "right",
          },
        },
        "& .add-to-cart-button": {
          alignSelf: "flex-end",
          borderRadius: "50%",
          minWidth: liftKitTheme.spacing.xl15,
          minHeight: liftKitTheme.spacing.xl15,
          width: liftKitTheme.spacing.xl15,
          height: liftKitTheme.spacing.xl15,
          padding: liftKitTheme.spacing.sm,
          marginTop: liftKitTheme.spacing.sm,
          boxShadow: "var(--Paper-shadow)",
          transition: "all 0.15s ease-in-out",
          "&:hover": {
            boxShadow: "var(--Paper-shadow)",
            transform: "scale(1.05)",
            filter: "saturate(2)",
          },
          "& .MuiSvgIcon-root": {
            fontSize: "1.6rem",
          },
        },
      },
    },
  },
};

export default baseProductCardStyles;
```

**Step 2: Commit**

```bash
git add frontend/react-Admin3/src/theme/components/cards/baseProductCard.js
git commit -m "feat(theme): extract base product card styles to separate module"
```

---

### Task 4.2: Extract Tutorial Card Variant

**Files:**
- Create: `frontend/react-Admin3/src/theme/components/cards/tutorialCard.js`

**Step 1: Create tutorial card variant**

Create `frontend/react-Admin3/src/theme/components/cards/tutorialCard.js`:
```javascript
// Tutorial Product Card Variant Styles
import colorTheme from '../../colorTheme';
import liftKitTheme from '../../liftKitTheme';

/**
 * Tutorial card variant - Purple theme
 * Extends base product card with tutorial-specific styling
 */
export const tutorialCardStyles = {
  // Floating badges
  "& .floating-badges-container": {
    "& .availability-badge": {
      color: colorTheme.md3.error,
      paddingLeft: liftKitTheme.spacing.sm,
      paddingRight: liftKitTheme.spacing.sm,
      alignItems: "center",
      justifyContent: "center",
      alignContent: "center",
      flexWrap: "wrap",
      fontWeight: 600,
      borderRadius: "16px",
      boxShadow: "0 1px 12px rgba(0,0,0,0.25)",
      border: "1px solid rgba(255, 255, 255, 0.3)",
      backdropFilter: "blur(20px)",
      backgroundColor: colorTheme.md3.errorContainer,
      "& .MuiBox-root": {
        alignItems: "center",
        justifyContent: "center",
        alignContent: "center",
        "& .MuiTypography-root": {
          color: colorTheme.md3.error,
        },
        "& .MuiSvgIcon-root": {
          color: colorTheme.md3.error,
          fontSize: "1.2rem",
        },
      },
    },
    "& .subject-badge": {
      backgroundColor: colorTheme.bpp.purple["010"],
      color: colorTheme.bpp.granite["100"],
    },
    "& .session-badge": {
      backgroundColor: colorTheme.bpp.purple["010"],
      color: colorTheme.bpp.granite["100"],
    },
  },

  // Product Header
  "& .product-header": {
    backgroundColor: colorTheme.bpp.purple["020"],
    color: "#ffffff",
    height: "7.43rem",
    padding: "1rem",
    boxShadow: "var(--shadow-sm)",
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    flex: "0 0 auto",
    "& .MuiCardHeader-content": {
      order: 1,
      flex: "1",
      "& .product-title": {
        width: "90%",
        textAlign: "left",
        color: colorTheme.bpp.sky["100"],
      },
      "& .product-subtitle": {
        color: colorTheme.bpp.sky["090"],
      },
    },
    "& .MuiCardHeader-avatar": {
      order: 2,
      marginLeft: "auto",
      marginRight: "0",
      "& .product-avatar": {
        backgroundColor: colorTheme.bpp.granite["020"],
        boxShadow: "var(--Paper-shadow)",
        "& .product-avatar-icon": {
          fontSize: "1.5rem",
          color: colorTheme.bpp.purple["090"],
        },
      },
    },
  },

  // Content styling
  "& .MuiCardContent-root": {
    padding: liftKitTheme.spacing.md,
    paddingTop: liftKitTheme.spacing.lg,
    "& .product-chips": {
      display: "flex",
      gap: liftKitTheme.spacing.sm,
      marginBottom: liftKitTheme.spacing.md,
      "& .MuiChip-root": {
        boxShadow: "var(--Paper-shadow)",
        "& .MuiChip-label": {
          fontWeight: liftKitTheme.typography.overline.fontWeight,
          paddingX: liftKitTheme.spacing.md,
          paddingY: liftKitTheme.spacing.xs,
        },
      },
    },
    "& .tutorial-info-section": {
      display: "flex",
      flexDirection: "column",
      textAlign: "left",
      marginLeft: liftKitTheme.spacing.sm,
      marginRight: liftKitTheme.spacing.sm,
      "& .info-row": {
        display: "flex",
        marginBottom: liftKitTheme.spacing.sm,
        alignItems: "flex-start",
        textAlign: "left",
        "& .info-title": {
          marginBottom: liftKitTheme.spacing.xs2,
        },
        "& .info-icon": {
          fontSize: "16px",
          color: colorTheme.bpp.purple["090"],
          marginRight: liftKitTheme.spacing.xs2,
        },
        "& .info-text": {
          color: colorTheme.bpp.purple["100"],
          fontWeight: "600",
        },
      },
      "& .info-sub-text": {
        color: colorTheme.bpp.purple["090"],
        marginLeft: liftKitTheme.spacing.md,
        fontWeight: "500",
      },
    },
  },

  // Actions styling
  "& .MuiCardActions-root": {
    backgroundColor: colorTheme.bpp.purple["030"],
    "& .price-container": {
      "& .discount-options": {
        "& .discount-title": {
          color: colorTheme.bpp.purple["100"],
        },
        "& .discount-radio-group": {
          "& .discount-radio-option": {
            color: colorTheme.bpp.purple["100"],
            "& .MuiRadio-root": {
              color: colorTheme.bpp.purple["090"],
            },
            "& .discount-label": {
              color: colorTheme.bpp.purple["100"],
            },
          },
        },
      },
      "& .price-action-section": {
        "& .price-info-row": {
          "& .price-display": {
            color: colorTheme.bpp.purple["100"],
          },
        },
        "& .add-to-cart-button": {
          color: "white",
          backgroundColor: colorTheme.bpp.purple["050"],
          "&:hover": {
            backgroundColor: colorTheme.bpp.purple["070"],
          },
        },
      },
    },
  },
};

export default tutorialCardStyles;
```

**Step 2: Commit**

```bash
git add frontend/react-Admin3/src/theme/components/cards/tutorialCard.js
git commit -m "feat(theme): extract tutorial card variant styles"
```

---

### Task 4.3: Extract Material Card Variant

**Files:**
- Create: `frontend/react-Admin3/src/theme/components/cards/materialCard.js`

**Step 1: Create material card variant**

Create `frontend/react-Admin3/src/theme/components/cards/materialCard.js`:
```javascript
// Material Product Card Variant Styles
import colorTheme from '../../colorTheme';
import liftKitTheme from '../../liftKitTheme';

/**
 * Material card variant - Sky/Blue theme
 * For printed materials and eBooks
 */
export const materialCardStyles = {
  // Floating badges
  "& .floating-badges-container": {
    "& .subject-badge": {
      backgroundColor: colorTheme.bpp.sky["010"],
      color: colorTheme.bpp.granite["100"],
    },
    "& .session-badge": {
      backgroundColor: colorTheme.bpp.sky["010"],
      color: colorTheme.bpp.granite["100"],
    },
  },

  // Product Header
  "& .product-header": {
    backgroundColor: colorTheme.bpp.sky["020"],
    color: "#ffffff",
    "& .MuiCardHeader-content": {
      "& .product-title": {
        color: colorTheme.bpp.sky["100"],
      },
      "& .product-subtitle": {
        color: colorTheme.bpp.sky["090"],
      },
    },
    "& .MuiCardHeader-avatar": {
      "& .product-avatar": {
        backgroundColor: colorTheme.bpp.granite["020"],
        "& .product-avatar-icon": {
          color: colorTheme.bpp.sky["090"],
        },
      },
    },
  },

  // Content styling
  "& .MuiCardContent-root": {
    padding: liftKitTheme.spacing.md,
    "& .product-variations": {
      display: "flex",
      flexDirection: "column",
      alignItems: "start",
      justifyContent: "start",
      textAlign: "left",
      "& .variations-title": {
        marginBottom: liftKitTheme.spacing.md,
        textAlign: "left",
        color: colorTheme.bpp.sky["100"],
        fontWeight: 600,
      },
      "& .variations-group": {
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "flex-start",
        width: "100%",
        "& .MuiStack-root": {
          width: "100%",
          "& .variation-option": {
            border: "1px solid",
            borderColor: "divider",
            borderRadius: liftKitTheme.spacing.xs,
            padding: liftKitTheme.spacing.xs,
            width: "100%",
            color: colorTheme.bpp.sky["100"],
            transition: "all 0.2s ease-in-out",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            "& .MuiRadio-root": {
              padding: liftKitTheme.spacing.sm,
              width: liftKitTheme.spacing.md,
              height: liftKitTheme.spacing.md,
              color: colorTheme.bpp.sky["090"],
              alignItems: "center",
              justifyContent: "center",
            },
            "& .MuiSvgIcon-root": {
              fontSize: liftKitTheme.spacing.md,
            },
            "&:hover": {
              boxShadow: "var(--Paper-shadow)",
              backdropFilter: "saturate(2.4)",
            },
            "& .variation-control": {
              margin: 0,
              flex: 1,
            },
            "& .variation-label": {
              marginLeft: liftKitTheme.spacing.xs,
            },
            "& .variation-price": {
              paddingRight: liftKitTheme.spacing.md,
            },
          },
        },
      },
    },
  },

  // Actions styling
  "& .MuiCardActions-root": {
    backgroundColor: colorTheme.bpp.sky["030"],
    "& .price-container": {
      "& .discount-options": {
        "& .discount-title": {
          color: colorTheme.bpp.sky["100"],
        },
        "& .discount-radio-group": {
          "& .discount-radio-option": {
            color: colorTheme.bpp.sky["100"],
            paddingRight: 0,
            marginRight: 0,
            "& .MuiRadio-root": {
              color: colorTheme.bpp.sky["090"],
            },
            "& .discount-label": {
              color: colorTheme.bpp.sky["100"],
            },
          },
        },
      },
      "& .price-action-section": {
        "& .price-info-row": {
          "& .price-display": {
            color: colorTheme.bpp.sky["100"],
            lineHeight: 1,
          },
        },
        "& .add-to-cart-button": {
          color: "white",
          backgroundColor: colorTheme.bpp.sky["060"],
          "&:hover": {
            backgroundColor: colorTheme.bpp.sky["070"],
          },
          "& .MuiSvgIcon-root": {
            color: "white",
          },
        },
      },
    },
  },
};

export default materialCardStyles;
```

**Step 2: Commit**

```bash
git add frontend/react-Admin3/src/theme/components/cards/materialCard.js
git commit -m "feat(theme): extract material card variant styles"
```

---

### Task 4.4: Create Remaining Card Variants

**Files:**
- Create: `frontend/react-Admin3/src/theme/components/cards/bundleCard.js`
- Create: `frontend/react-Admin3/src/theme/components/cards/onlineClassroomCard.js`
- Create: `frontend/react-Admin3/src/theme/components/cards/markingCard.js`
- Create: `frontend/react-Admin3/src/theme/components/cards/markingVoucherCard.js`

**Step 1: Create bundle card variant**

Create `frontend/react-Admin3/src/theme/components/cards/bundleCard.js`:
```javascript
// Bundle Product Card Variant Styles
import colorTheme from '../../colorTheme';
import liftKitTheme from '../../liftKitTheme';

/**
 * Bundle card variant - Green theme
 */
export const bundleCardStyles = {
  "& .floating-badges-container": {
    "& .subject-badge": {
      backgroundColor: colorTheme.bpp.green["010"],
      color: colorTheme.bpp.granite["100"],
    },
    "& .session-badge": {
      backgroundColor: colorTheme.bpp.green["010"],
      color: colorTheme.bpp.granite["100"],
    },
  },
  "& .product-header": {
    backgroundColor: colorTheme.bpp.green["030"],
    color: "#ffffff",
    "& .MuiCardHeader-content": {
      "& .product-title": {
        color: colorTheme.bpp.green["100"],
        "& .title-info-button": {
          color: colorTheme.bpp.green["080"],
          minWidth: "1.2rem",
          "& .MuiSvgIcon-root": {
            fontSize: "1.2rem",
          },
        },
      },
      "& .product-subtitle-container": {
        "& .product-subtitle": {
          color: colorTheme.bpp.green["090"],
        },
        "& .subtitle-info-button": {
          color: colorTheme.bpp.green["050"],
          "&:hover": {
            backgroundColor: "rgba(255, 255, 255, 0.1)",
          },
          "& .MuiSvgIcon-root": {
            fontSize: "1rem",
          },
        },
      },
    },
    "& .MuiCardHeader-avatar": {
      "& .product-avatar": {
        backgroundColor: colorTheme.bpp.granite["020"],
        "& .product-avatar-icon": {
          color: colorTheme.bpp.green["090"],
        },
      },
    },
  },
  "& .MuiCardContent-root": {
    "& .bundle-details-title": {
      color: colorTheme.bpp.green["100"],
      textAlign: "left",
      marginBottom: liftKitTheme.spacing.xs3,
    },
    "& .MuiList-root": {
      paddingTop: 0,
      paddingBottom: 0,
      "& .MuiListItem-root": {
        padding: 0,
        margin: 0,
        "& .MuiListItemIcon-root": {
          minWidth: "1.2rem",
          "& .MuiSvgIcon-root": {
            fontSize: "1.2rem",
            color: colorTheme.bpp.green["080"],
          },
          marginRight: liftKitTheme.spacing.sm,
        },
        "& .MuiListItemText-root": {
          marginBottom: 0,
          "& .MuiListItemText-primary": {
            color: colorTheme.bpp.green["100"],
          },
        },
      },
    },
  },
  "& .MuiCardActions-root": {
    backgroundColor: colorTheme.bpp.green["040"],
    "& .price-container": {
      "& .discount-options": {
        "& .discount-title": {
          color: colorTheme.bpp.green["100"],
        },
        "& .discount-radio-group": {
          "& .discount-radio-option": {
            color: colorTheme.bpp.green["100"],
            "& .MuiRadio-root": {
              color: colorTheme.bpp.green["090"],
            },
            "& .discount-label": {
              color: colorTheme.bpp.green["100"],
            },
          },
        },
      },
      "& .price-action-section": {
        "& .price-info-row": {
          "& .price-display": {
            color: colorTheme.bpp.green["100"],
            lineHeight: 1,
          },
          "& .info-button": {
            color: colorTheme.bpp.green["080"],
          },
        },
        "& .add-to-cart-button": {
          color: "white",
          backgroundColor: colorTheme.bpp.green["060"],
          "&:hover": {
            backgroundColor: colorTheme.bpp.green["080"],
          },
          "& .MuiSvgIcon-root": {
            color: "white",
          },
        },
      },
    },
  },
};

export default bundleCardStyles;
```

**Step 2: Create online classroom card variant**

Create `frontend/react-Admin3/src/theme/components/cards/onlineClassroomCard.js`:
```javascript
// Online Classroom Product Card Variant Styles
import colorTheme from '../../colorTheme';
import liftKitTheme from '../../liftKitTheme';

/**
 * Online Classroom card variant - Cobalt/Blue theme
 */
export const onlineClassroomCardStyles = {
  "& .floating-badges-container": {
    "& .subject-badge": {
      backgroundColor: colorTheme.bpp.cobalt["010"],
      color: colorTheme.bpp.granite["100"],
    },
    "& .session-badge": {
      backgroundColor: colorTheme.bpp.cobalt["010"],
      color: colorTheme.bpp.granite["100"],
    },
  },
  "& .product-header": {
    backgroundColor: colorTheme.bpp.cobalt["020"],
    color: "#ffffff",
    height: "7.43rem",
    padding: "1rem",
    boxShadow: "var(--shadow-sm)",
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    flex: "0 0 auto",
    "& .MuiCardHeader-content": {
      order: 1,
      flex: "1",
      "& .product-title": {
        width: "90%",
        textAlign: "left",
        color: colorTheme.bpp.cobalt["100"],
      },
      "& .product-subtitle": {
        color: colorTheme.bpp.cobalt["090"],
      },
    },
    "& .MuiCardHeader-avatar": {
      order: 2,
      marginLeft: "auto",
      marginRight: "0",
      "& .product-avatar": {
        backgroundColor: colorTheme.bpp.granite["020"],
        boxShadow: "var(--Paper-shadow)",
        "& .product-avatar-icon": {
          fontSize: "1.5rem",
          color: colorTheme.bpp.cobalt["090"],
        },
      },
    },
  },
  "& .MuiCardContent-root": {
    padding: liftKitTheme.spacing.md,
    "& .product-variations": {
      display: "flex",
      flexDirection: "column",
      alignItems: "start",
      justifyContent: "start",
      textAlign: "left",
      "& .variations-title": {
        marginBottom: liftKitTheme.spacing.md,
        textAlign: "left",
        color: colorTheme.bpp.cobalt["100"],
        fontWeight: 600,
      },
      "& .variations-group": {
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "flex-start",
        width: "100%",
        "& .MuiStack-root": {
          width: "100%",
          "& .variation-option": {
            border: "1px solid",
            borderColor: "divider",
            borderRadius: liftKitTheme.spacing.xs,
            padding: liftKitTheme.spacing.xs,
            width: "100%",
            color: colorTheme.bpp.cobalt["100"],
            transition: "all 0.2s ease-in-out",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            "& .MuiRadio-root": {
              padding: liftKitTheme.spacing.sm,
              width: liftKitTheme.spacing.md,
              height: liftKitTheme.spacing.md,
              color: colorTheme.bpp.cobalt["090"],
              alignItems: "center",
              justifyContent: "center",
            },
            "& .MuiSvgIcon-root": {
              fontSize: liftKitTheme.spacing.md,
            },
            "&:hover": {
              boxShadow: "var(--Paper-shadow)",
              backdropFilter: "saturate(2.4)",
            },
            "& .variation-control": {
              margin: 0,
              flex: 1,
            },
            "& .variation-label": {
              marginLeft: liftKitTheme.spacing.xs,
            },
            "& .variation-price": {
              paddingRight: liftKitTheme.spacing.md,
            },
          },
        },
      },
    },
  },
  "& .MuiCardActions-root": {
    backgroundColor: colorTheme.bpp.cobalt["030"],
    "& .price-container": {
      "& .discount-options": {
        "& .discount-title": {
          color: colorTheme.bpp.cobalt["100"],
        },
        "& .discount-radio-group": {
          "& .discount-radio-option": {
            color: colorTheme.bpp.cobalt["100"],
            "& .MuiRadio-root": {
              color: colorTheme.bpp.cobalt["090"],
            },
            "& .discount-label": {
              color: colorTheme.bpp.cobalt["100"],
            },
          },
        },
      },
      "& .price-action-section": {
        "& .price-info-row": {
          "& .price-display": {
            color: colorTheme.bpp.cobalt["100"],
          },
        },
        "& .add-to-cart-button": {
          color: "white",
          backgroundColor: colorTheme.bpp.cobalt["055"],
          "&:hover": {
            backgroundColor: colorTheme.bpp.cobalt["070"],
          },
          "& .MuiSvgIcon-root": {
            color: "white",
          },
        },
      },
    },
  },
};

export default onlineClassroomCardStyles;
```

**Step 3: Create marking card variant**

Create `frontend/react-Admin3/src/theme/components/cards/markingCard.js`:
```javascript
// Marking Product Card Variant Styles
import colorTheme from '../../colorTheme';
import liftKitTheme from '../../liftKitTheme';

/**
 * Marking card variant - Pink theme
 */
export const markingCardStyles = {
  "& .floating-badges-container": {
    "& .subject-badge": {
      backgroundColor: colorTheme.bpp.pink["010"],
      color: colorTheme.bpp.granite["100"],
    },
    "& .session-badge": {
      backgroundColor: colorTheme.bpp.pink["010"],
      color: colorTheme.bpp.granite["100"],
    },
  },
  "& .product-header": {
    backgroundColor: colorTheme.bpp.pink["020"],
    color: "#ffffff",
    "& .MuiCardHeader-content": {
      "& .product-title": {
        color: colorTheme.bpp.pink["100"],
      },
      "& .product-subtitle": {
        color: colorTheme.bpp.pink["090"],
      },
    },
    "& .MuiCardHeader-avatar": {
      "& .product-avatar": {
        backgroundColor: colorTheme.bpp.granite["020"],
        "& .product-avatar-icon": {
          color: colorTheme.bpp.pink["090"],
        },
      },
    },
  },
  "& .MuiCardContent-root": {
    padding: liftKitTheme.spacing.md,
    "& .submissions-info-row": {
      marginBottom: liftKitTheme.spacing.xs2,
    },
    "& .submissions-info-icon": {
      fontSize: "1rem",
      color: colorTheme.bpp.pink["090"],
    },
    "& .submissions-info-count": {
      marginLeft: liftKitTheme.spacing.lg,
    },
    "& .marking-deadline-message": {
      borderRadius: 1,
      border: 1,
      textAlign: "left",
    },
    "& .marking-pagination-container": {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
    },
    "& .pagination-dot-button": {
      padding: "0.3rem",
    },
    "& .pagination-dot.active": {
      fontSize: "0.5rem",
      color: "primary.main",
      cursor: "pointer",
    },
    "& .pagination-dot.inactive": {
      fontSize: "0.5rem",
      color: "grey.300",
      cursor: "pointer",
    },
    "& .MuiBox-root": {
      display: "flex",
      justifyContent: "center",
      width: "100%",
      "& .submission-deadlines-button": {
        marginTop: liftKitTheme.spacing.sm,
        alignSelf: "flex-start",
        textTransform: "none",
        border: "none",
        fontSize: liftKitTheme.typography.body.fontSize,
        color: colorTheme.bpp.pink["090"],
        backgroundColor: colorTheme.bpp.pink["020"],
        padding: liftKitTheme.spacing.sm,
        "&:hover": {
          backgroundColor: colorTheme.bpp.pink["030"],
          borderColor: colorTheme.bpp.pink["060"],
          color: colorTheme.bpp.pink["100"],
        },
      },
    },
  },
  "& .MuiCardActions-root": {
    backgroundColor: colorTheme.bpp.pink["030"],
    "& .price-container": {
      "& .discount-options": {
        "& .discount-title": {
          color: colorTheme.bpp.cobalt["100"],
        },
        "& .discount-radio-group": {
          "& .discount-radio-option": {
            color: colorTheme.bpp.granite["100"],
            "& .MuiRadio-root": {
              color: colorTheme.bpp.granite["090"],
            },
            "& .discount-label": {
              color: colorTheme.bpp.granite["100"],
            },
          },
        },
      },
      "& .price-action-section": {
        "& .price-info-row": {
          "& .price-display": {
            color: colorTheme.bpp.granite["100"],
            lineHeight: 1,
          },
        },
        "& .add-to-cart-button": {
          color: "white",
          backgroundColor: colorTheme.bpp.pink["060"],
          "&:hover": {
            backgroundColor: colorTheme.bpp.pink["080"],
          },
          "& .MuiSvgIcon-root": {
            color: "white",
          },
        },
      },
    },
  },
};

export default markingCardStyles;
```

**Step 4: Create marking voucher card variant**

Create `frontend/react-Admin3/src/theme/components/cards/markingVoucherCard.js`:
```javascript
// Marking Voucher Product Card Variant Styles
import colorTheme from '../../colorTheme';
import liftKitTheme from '../../liftKitTheme';

/**
 * Marking Voucher card variant - Orange theme
 */
export const markingVoucherCardStyles = {
  "& .product-header": {
    backgroundColor: colorTheme.bpp.orange["020"],
    color: "#ffffff",
    "& .MuiCardHeader-content": {
      "& .product-title": {
        color: colorTheme.bpp.orange["100"],
      },
      "& .product-subtitle": {
        color: colorTheme.bpp.orange["090"],
      },
    },
    "& .MuiCardHeader-avatar": {
      "& .product-avatar": {
        backgroundColor: colorTheme.bpp.granite["020"],
        "& .product-avatar-icon": {
          color: colorTheme.bpp.orange["090"],
        },
      },
    },
  },
  "& .floating-badges-container": {
    "& .expiry-badge": {
      backgroundColor: colorTheme.bpp.orange["060"],
      color: colorTheme.bpp.granite["100"],
      fontSize: liftKitTheme.typography.bodyBold.fontSize,
      paddingLeft: liftKitTheme.spacing.sm,
      paddingRight: liftKitTheme.spacing.sm,
      paddingTop: liftKitTheme.spacing.sm,
      paddingBottom: liftKitTheme.spacing.sm,
      alignItems: "center",
      justifyContent: "center",
      alignContent: "center",
      flexWrap: "wrap",
      fontWeight: 600,
      backgroundColor: "rgba(255, 255, 255, 0.5)",
      borderRadius: "16px",
      boxShadow: "0 1px 12px rgba(0,0,0,0.25)",
      border: "1px solid rgba(255, 255, 255, 0.3)",
      backdropFilter: "blur(20px)",
    },
  },
  "& .MuiCardContent-root": {
    "& .product-chips": {
      display: "flex",
      gap: liftKitTheme.spacing.sm,
      marginBottom: liftKitTheme.spacing.md,
      "& .MuiChip-root": {
        boxShadow: "var(--Paper-shadow)",
      },
    },
    "& .product-description": {
      marginBottom: liftKitTheme.spacing.sm,
      textAlign: "left",
    },
    "& .voucher-info-alert": {
      marginBottom: liftKitTheme.spacing.sm,
      textAlign: "left",
    },
    "& .voucher-validity-info": {
      marginBottom: liftKitTheme.spacing.sm,
    },
    "& .validity-info-row": {
      marginBottom: liftKitTheme.spacing.sm,
    },
    "& .validity-info-icon": {
      fontSize: "1rem",
      color: "text.secondary",
    },
    "& .voucher-quantity-section": {
      display: "flex",
      alignItems: "center",
      marginTop: liftKitTheme.spacing.sm,
      flexDirection: "row",
    },
  },
  "& .MuiCardActions-root": {
    height: "10.2rem !important",
    backgroundColor: colorTheme.bpp.orange["030"],
    boxShadow: "var(--shadow-lg)",
    paddingTop: liftKitTheme.spacing.md,
    paddingLeft: liftKitTheme.spacing.md,
    paddingRight: liftKitTheme.spacing.md,
    flexDirection: "column",
    alignItems: "stretch",
    justifyContent: "space-between",
    "& .price-container": {
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "end",
      "& .price-action-section": {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        "& .price-info-row": {
          display: "flex",
          alignItems: "baseline",
          alignSelf: "flex-end",
          justifyContent: "flex-end",
          "& .price-display": {
            color: colorTheme.bpp.orange["100"],
          },
          "& .info-button": {
            minWidth: "auto",
            borderRadius: "50%",
            paddingBottom: 0,
            "&:hover": {
              backdropFilter: "saturate(2.4)",
              boxShadow: "var(--Paper-shadow)",
              transform: "translateY(-1px)",
            },
            "& .MuiSvgIcon-root": {
              fontSize: "1.2rem",
            },
          },
        },
        "& .price-details-row": {
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          "& .price-level-text": {
            display: "block",
            textAlign: "right",
          },
          "& .vat-status-text": {
            display: "block",
            textAlign: "right",
          },
        },
        "& .add-to-cart-button": {
          color: colorTheme.bpp.orange["100"],
          alignSelf: "flex-end",
          borderRadius: "50%",
          minWidth: liftKitTheme.spacing.xl15,
          minHeight: liftKitTheme.spacing.xl15,
          width: liftKitTheme.spacing.xl15,
          height: liftKitTheme.spacing.xl15,
          padding: liftKitTheme.spacing.sm,
          marginLeft: liftKitTheme.spacing.md,
          marginRight: liftKitTheme.spacing.md,
          marginTop: liftKitTheme.spacing.md,
          boxShadow: "var(--Paper-shadow)",
          backgroundColor: colorTheme.bpp.orange["020"],
          transition: "all 0.15s ease-in-out",
          "&:hover": {
            boxShadow: "var(--Paper-shadow)",
            transform: "scale(1.05)",
            filter: "saturate(2)",
          },
          "& .MuiSvgIcon-root": {
            fontSize: "1.6rem",
          },
        },
      },
    },
  },
};

export default markingVoucherCardStyles;
```

**Step 5: Commit**

```bash
git add frontend/react-Admin3/src/theme/components/cards/
git commit -m "feat(theme): extract all card variant styles to separate modules

- bundleCard.js - Green theme
- onlineClassroomCard.js - Cobalt theme
- markingCard.js - Pink theme
- markingVoucherCard.js - Orange theme"
```

---

### Task 4.5: Update Cards Index to Compose Variants

**Files:**
- Modify: `frontend/react-Admin3/src/theme/components/cards/index.js`

**Step 1: Update cards index to export all variants**

Modify `frontend/react-Admin3/src/theme/components/cards/index.js`:
```javascript
// Card Components Module
// Aggregates all card variant styles and exports MuiCard overrides

import colorTheme from '../../colorTheme';
import baseProductCardStyles from './baseProductCard';
import tutorialCardStyles from './tutorialCard';
import materialCardStyles from './materialCard';
import bundleCardStyles from './bundleCard';
import onlineClassroomCardStyles from './onlineClassroomCard';
import markingCardStyles from './markingCard';
import markingVoucherCardStyles from './markingVoucherCard';

/**
 * MuiCard component overrides with all product card variants.
 *
 * Usage in components:
 *   <Card variant="product" producttype="tutorial">
 *   <Card variant="product" producttype="material">
 *   <Card variant="product" producttype="bundle">
 *   <Card variant="product" producttype="online-classroom">
 *   <Card variant="product" producttype="marking">
 *   <Card variant="product" producttype="marking-voucher">
 */
export const cardOverrides = {
  MuiCard: {
    styleOverrides: {
      root: {
        backgroundColor: "var(--md-sys-color-surface-container-lowest_lkv)",
      },
    },
    variants: [
      // Base product card variant
      {
        props: { variant: "product" },
        style: baseProductCardStyles,
      },
      // Tutorial Product Card Variant
      {
        props: { variant: "product", producttype: "tutorial" },
        style: tutorialCardStyles,
      },
      // Material Product Card Variant
      {
        props: { variant: "product", producttype: "material" },
        style: materialCardStyles,
      },
      // Bundle Product Card Variant
      {
        props: { variant: "product", producttype: "bundle" },
        style: bundleCardStyles,
      },
      // Online Classroom Product Card Variant
      {
        props: { variant: "product", producttype: "online-classroom" },
        style: onlineClassroomCardStyles,
      },
      // Marking Product Card Variant
      {
        props: { variant: "product", producttype: "marking" },
        style: markingCardStyles,
      },
      // Marking Voucher Product Card Variant
      {
        props: { variant: "product", producttype: "marking-voucher" },
        style: markingVoucherCardStyles,
      },
    ],
  },
};

// Export individual card styles for direct use if needed
export {
  baseProductCardStyles,
  tutorialCardStyles,
  materialCardStyles,
  bundleCardStyles,
  onlineClassroomCardStyles,
  markingCardStyles,
  markingVoucherCardStyles,
};

export default cardOverrides;
```

**Step 2: Commit**

```bash
git add frontend/react-Admin3/src/theme/components/cards/index.js
git commit -m "feat(theme): compose all card variants in cards/index.js"
```

---

## Phase 5: Compose Final Theme

### Task 5.1: Update Components Index

**Files:**
- Modify: `frontend/react-Admin3/src/theme/components/index.js`

**Step 1: Update components index to aggregate all component overrides**

Modify `frontend/react-Admin3/src/theme/components/index.js`:
```javascript
// Components Module
// Aggregates all component style overrides into single export

import { cardOverrides } from './cards';
import alertOverrides from './alerts';
import buttonOverrides from './buttons';
import inputOverrides from './inputs';
import navigationOverrides from './navigation';
import miscOverrides from './misc';

/**
 * All MUI component overrides combined.
 * Used in createTheme({ components: componentOverrides })
 */
export const componentOverrides = {
  ...cardOverrides,
  ...alertOverrides,
  ...buttonOverrides,
  ...inputOverrides,
  ...navigationOverrides,
  ...miscOverrides,
};

// Export individual overrides for selective use
export {
  cardOverrides,
  alertOverrides,
  buttonOverrides,
  inputOverrides,
  navigationOverrides,
  miscOverrides,
};

export default componentOverrides;
```

**Step 2: Commit**

```bash
git add frontend/react-Admin3/src/theme/components/index.js
git commit -m "feat(theme): aggregate all component overrides in components/index.js"
```

---

### Task 5.2: Create New Modular Theme Entry Point

**Files:**
- Create: `frontend/react-Admin3/src/theme/index.js`

**Step 1: Create new theme index that composes all modules**

Create `frontend/react-Admin3/src/theme/index.js`:
```javascript
// Theme Entry Point
// Composes all theme modules into final MUI theme

import { createTheme } from "@mui/material/styles";
import "../styles/liftkit-css/globals.css";

// Import modules
import colorTheme from './colorTheme';
import liftKitTheme from './liftKitTheme';
import { typographyConfig, responsiveTypography } from './typography';
import componentOverrides from './components';
import { createGradientStyle, gradientColorSchemes } from './utils';
import { semanticColors } from './colors/semantic';
import { semanticSpacing } from './spacing/semantic';

// Base theme with breakpoints
const baseTheme = createTheme({
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 900,
      lg: 1200,
      xl: 1536,
    },
  },
});

// Apply responsive typography overrides
const applyResponsiveTypography = (typography) => {
  const result = { ...typography };

  // Apply breakpoint-specific overrides
  Object.entries(responsiveTypography).forEach(([variant, breakpoints]) => {
    if (result[variant]) {
      Object.entries(breakpoints).forEach(([breakpoint, styles]) => {
        result[variant] = {
          ...result[variant],
          [baseTheme.breakpoints.down(breakpoint)]: styles,
        };
      });
    }
  });

  // Add navlink color from colorTheme
  if (result.navlink) {
    result.navlink.color = colorTheme.offwhite["001"];
  }

  return result;
};

/**
 * Main application theme.
 *
 * Structure:
 * - typography: All text styles (h1-h6, body, custom variants)
 * - palette: Colors (primary, secondary, bpp, md3, liftkit, semantic)
 * - components: MUI component overrides
 * - liftkit: Spacing and typography tokens
 * - gradients: Gradient utilities
 */
const theme = createTheme({
  ...baseTheme,

  // Typography with responsive overrides
  typography: applyResponsiveTypography(typographyConfig),

  // Enhanced palette with all color systems
  palette: {
    primary: colorTheme.primary,
    secondary: colorTheme.secondary,
    tertiary: colorTheme.tertiary,
    error: colorTheme.error,
    warning: colorTheme.warning,
    info: colorTheme.info,
    success: colorTheme.success,
    background: colorTheme.background,
    surface: colorTheme.surface,
    text: colorTheme.text,
    offwhite: colorTheme.offwhite,
    bpp: colorTheme.bpp,
    md3: colorTheme.md3,
    liftkit: colorTheme.liftkit,
    // Semantic colors for easy access
    semantic: semanticColors,
  },

  // Component overrides from modules
  components: componentOverrides,

  // Liftkit spacing and typography system
  liftkit: {
    spacing: liftKitTheme.spacing,
    typography: liftKitTheme.typography,
    semantic: semanticSpacing,
  },

  // Custom gradient utilities
  gradients: {
    createGradientStyle,
    colorSchemes: gradientColorSchemes,
  },
});

// Re-export everything for backward compatibility
export default theme;
export { liftKitTheme, colorTheme };
export { typographyConfig as typographyTheme };
export { semanticColors, semanticSpacing };
export { createGradientStyle, gradientColorSchemes };
```

**Step 2: Commit**

```bash
git add frontend/react-Admin3/src/theme/index.js
git commit -m "feat(theme): create modular theme entry point

- Composes all theme modules into final MUI theme
- Applies responsive typography overrides
- Exports semantic colors and spacing for component use
- Maintains backward compatibility with existing exports"
```

---

### Task 5.3: Update Main theme.js to Use Modular Approach

**Files:**
- Modify: `frontend/react-Admin3/src/theme/theme.js`

**Step 1: Update theme.js to re-export from new modular index**

Modify `frontend/react-Admin3/src/theme/theme.js`:
```javascript
// theme.js - Backward Compatibility Layer
//
// This file re-exports from the new modular theme structure.
// New code should import from './theme/index.js' directly.
//
// MIGRATION: This file can be removed once all imports are updated.

export {
  default,
  liftKitTheme,
  colorTheme,
  typographyTheme,
  semanticColors,
  semanticSpacing,
  createGradientStyle,
  gradientColorSchemes,
} from './index';
```

**Step 2: Verify existing imports still work**

Run: `cd frontend/react-Admin3 && npm run build`

Expected: Build succeeds with no import errors

**Step 3: Commit**

```bash
git add frontend/react-Admin3/src/theme/theme.js
git commit -m "refactor(theme): update theme.js to re-export from modular index

- theme.js now serves as backward compatibility layer
- All existing imports continue to work
- New code should import from theme/index.js directly"
```

---

## Phase 6: Create Style Objects for Common Inline Patterns

### Task 6.1: Create Common Style Objects

**Files:**
- Create: `frontend/react-Admin3/src/theme/styles/index.js`
- Create: `frontend/react-Admin3/src/theme/styles/containers.js`
- Create: `frontend/react-Admin3/src/theme/styles/cards.js`

**Step 1: Create container style objects**

Create `frontend/react-Admin3/src/theme/styles/containers.js`:
```javascript
// Container Style Objects
// Reusable styles for common container patterns

/**
 * Hero section container styles.
 * Usage: <Container sx={heroContainerStyles}>
 */
export const heroContainerStyles = {
  position: "relative",
  zIndex: 3,
  display: "flex",
  flexDirection: "column",
};

/**
 * Search results container styles.
 */
export const searchResultsContainerStyles = {
  mt: 2,
  mb: 3,
  justifyContent: "center",
  alignItems: "center",
};

/**
 * Centered content container.
 */
export const centeredContainerStyles = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
};

/**
 * Full-width overlay container.
 */
export const overlayContainerStyles = {
  position: "absolute",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
};

export default {
  heroContainerStyles,
  searchResultsContainerStyles,
  centeredContainerStyles,
  overlayContainerStyles,
};
```

**Step 2: Create card style objects**

Create `frontend/react-Admin3/src/theme/styles/cards.js`:
```javascript
// Card Style Objects
// Reusable styles for card-related patterns

/**
 * Top products card wrapper.
 */
export const topProductsCardStyles = {
  // Card styles handled by theme variant
};

/**
 * No results card styles.
 */
export const noResultsCardStyles = {
  textAlign: "center",
  py: 5,
};

/**
 * Search icon styles for empty state.
 */
export const emptyStateIconStyles = {
  fontSize: 48,
  color: "text.secondary",
  mb: 3,
};

export default {
  topProductsCardStyles,
  noResultsCardStyles,
  emptyStateIconStyles,
};
```

**Step 3: Create styles index**

Create `frontend/react-Admin3/src/theme/styles/index.js`:
```javascript
// Style Objects Index
// Centralized exports for all reusable style objects

export * from './containers';
export * from './cards';

// Example usage in components:
//
// import { heroContainerStyles, noResultsCardStyles } from '../theme/styles';
//
// <Container sx={heroContainerStyles}>
// <Card sx={noResultsCardStyles}>
```

**Step 4: Commit**

```bash
git add frontend/react-Admin3/src/theme/styles/
git commit -m "feat(theme): add reusable style objects for common patterns

- containers.js: hero, search results, centered, overlay
- cards.js: top products, no results, empty state
- Provides consistent styles without inline sx clutter"
```

---

## Phase 7: Documentation and Cleanup

### Task 7.1: Create Theme Architecture Documentation

**Files:**
- Create: `frontend/react-Admin3/src/theme/README.md`

**Step 1: Create theme documentation**

Create `frontend/react-Admin3/src/theme/README.md`:
```markdown
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
```

**Step 2: Commit**

```bash
git add frontend/react-Admin3/src/theme/README.md
git commit -m "docs(theme): add comprehensive theme architecture documentation"
```

---

### Task 7.2: Delete Duplicate typographyTheme.js

**Files:**
- Delete: `frontend/react-Admin3/src/theme/typographyTheme.js`

**Step 1: Verify no direct imports of typographyTheme.js**

Run: `grep -r "from.*typographyTheme" frontend/react-Admin3/src/`

Expected: Only theme.js should import it (now handled by index.js)

**Step 2: Remove the duplicate file**

Run: `rm frontend/react-Admin3/src/theme/typographyTheme.js`

**Step 3: Commit**

```bash
git add -A
git commit -m "refactor(theme): remove duplicate typographyTheme.js

Typography is now defined in typography/index.js"
```

---

## Summary

This plan creates a modular theme architecture with:

1. **6 main directories**: colors, spacing, typography, components, utils, styles
2. **7 card variant files**: reducing theme.js by ~1000 lines
3. **Semantic mappings**: colors and spacing by purpose/intent
4. **Reusable style objects**: for common patterns
5. **Full backward compatibility**: existing imports continue to work
6. **Comprehensive documentation**: README.md with usage examples

**Total tasks**: 17 tasks across 7 phases
**Estimated commits**: 15 focused commits
**Lines moved from theme.js**: ~1,500 lines

---

## Next Steps After This Plan

1. **Gradually migrate components** to use semantic colors/spacing
2. **Create component-specific style objects** as patterns emerge
3. **Add tests** for theme composition
4. **Consider TypeScript** for theme type safety
