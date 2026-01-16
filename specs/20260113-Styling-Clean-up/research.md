# Research: Navigation Styling Consolidation

**Feature**: 20260113-Styling-Clean-up
**Date**: 2026-01-13

## Overview

Research phase is minimal for this feature. The design was completed collaboratively via brainstorming session and documented in [docs/plans/2025-01-13-navigation-styling-design.md](../../docs/plans/2025-01-13-navigation-styling-design.md).

## Decision 1: Styling Architecture Approach

**Decision**: Two-layer hybrid approach (Semantic Tokens + MUI Variants)

**Rationale**: Combines the strengths of both approaches:

- Layer 1 (Semantic Tokens): Single source of truth for color values, enables theme switching
- Layer 2 (MUI Variants): Reusable component configurations, declarative usage in JSX

**Alternatives Considered**:

| Option | Description | Why Rejected |
|--------|-------------|--------------|
| Style objects file only | Create navigationStyles.js with sx objects | Doesn't leverage MUI's variant system |
| Theme variants only | Extend MUI component overrides | Tokens still scattered, harder to enable dark mode |
| Semantic tokens only | Expand semantic.js without variants | Components still need repeated sx props |
| CSS-in-JS library | Use styled-components or Emotion | Adds dependency, MUI already has theming |

## Decision 2: Scope Boundary

**Decision**: Navigation components only (pilot)

**Rationale**: Validate patterns before rolling out application-wide. Reduces risk of breaking changes.

**Files in Scope**:

- `src/theme/colors/semantic.js` (add tokens)
- `src/theme/components/navigation.js` (add variants)
- `src/components/Navigation/NavigationMenu.js` (migrate)
- `src/components/Navigation/TopNavBar.js` (migrate)
- `src/components/Navigation/TopNavActions.js` (migrate)
- `src/components/Navigation/MegaMenuPopover.js` (migrate)

**Files Out of Scope**: All other components (future iterations)

## Decision 3: Inline Style Policy

**Decision**: Allow inline styles ONLY for layout properties

**Rationale**: Visual properties (colors, borders, typography) need centralization for theming. Layout properties (flex, margin, padding) are component-specific and don't benefit from centralization.

**Allowed Inline Properties**:

- `display`, `flexDirection`, `alignItems`, `justifyContent`
- `gap`, `margin`, `padding`, `position`
- Responsive breakpoints for layout (`xs`, `md`, `xl`)

**Prohibited Inline Properties**:

- `color`, `backgroundColor`
- `border`, `borderColor`
- `fontSize`, `fontWeight`, `textTransform`

## Existing Patterns Validated

### Semantic Token Pattern (from semantic.js)

```javascript
// Existing pattern - confirmed compatible
cardHeader: {
  tutorial: colorTheme.purple['020'],
  material: colorTheme.sky['020'],
  // ...
}
```

### MUI Variant Pattern (from navigation.js)

```javascript
// Existing pattern - confirmed compatible
MuiMenuItem: {
  variants: [
    {
      props: { variant: 'navmenu' },
      style: { /* ... */ },
    },
  ],
}
```

## Current Inline Style Inventory

| Pattern | Count | Files |
|---------|-------|-------|
| `theme.palette.offwhite?.["000"]` | 8+ | NavigationMenu.js |
| `theme.palette.liftkit?.light?.background` | 4+ | TopNavBar.js, TopNavActions.js |
| `borderBottom: "1px solid " + theme.palette.granite["020"]` | 3 | NavigationMenu.js |
| `textTransform: "none", color: ...` | 6+ | All navigation files |

## Conclusion

No additional research needed. Proceed to Phase 1 (Design & Contracts) using the established patterns.
