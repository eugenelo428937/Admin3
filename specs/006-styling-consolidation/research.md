# Research: Frontend Styling System Consolidation

**Feature**: 006-styling-consolidation
**Date**: 2025-01-16

## Research Questions

### 1. MUI Theme Palette Extension Best Practices

**Question**: How should custom palette properties be structured in MUI v5 for optimal TypeScript support and sx prop access?

**Decision**: Use module augmentation pattern with flat + nested structure.

**Rationale**: MUI v5 supports custom palette properties that can be accessed via sx prop string paths (e.g., `bgcolor: 'semantic.bgPaper'`). The key is that nested objects work but require the path string syntax in sx props.

**Alternatives Considered**:

- CSS-in-JS libraries (Emotion standalone) - Rejected: MUI already uses Emotion internally
- CSS Modules - Rejected: Doesn't integrate with MUI's sx prop system
- Styled-components - Rejected: Would require migration from MUI's default Emotion

**Best Practice**:

```javascript
// Custom palette properties are accessed via string paths in sx
<Box sx={{ bgcolor: 'semantic.bgPaper' }} />

// Or via theme callback for dynamic access
<Box sx={(theme) => ({ bgcolor: theme.palette.productCards[type].header })} />
```

### 2. Color Token Naming Conventions

**Question**: What naming convention should be used for color tokens - string keys ('010') or numeric keys (10)?

**Decision**: Numeric keys for cleaner access syntax.

**Rationale**:

- `colors.scales.purple[20]` is cleaner than `colors.scales.purple['020']`
- No leading zeros needed for sorting (JS object key order is preserved for integer keys < 2^32)
- Matches common design token conventions (Tailwind, Radix)

**Alternatives Considered**:

- String keys with leading zeros ('010', '020') - Current approach, verbose
- Named levels ('lightest', 'light', 'base', 'dark') - Less precise, harder to extend

### 3. CSS to MUI Migration Strategy

**Question**: What's the best approach for migrating CSS files to MUI component overrides without visual regression?

**Decision**: Component-by-component migration with visual comparison checkpoints.

**Rationale**:

- Isolates changes to single components
- Enables incremental testing
- Allows rollback of individual migrations if issues found

**Migration Pattern**:

```javascript
// Before (CSS)
.navbar-container {
  background-color: var(--bs-navbar-container-bg-color);
  height: 6.6rem;
}

// After (MUI theme override)
export const MuiAppBar = {
  styleOverrides: {
    root: {
      backgroundColor: colors.scales.granite[80],
      height: '6.6rem',
    },
  },
};
```

### 4. Semantic Token Access Patterns

**Question**: How should components access semantic tokens - direct string paths or theme callbacks?

**Decision**: String paths for static values, theme callbacks for dynamic values.

**Rationale**:

- String paths (`'semantic.textPrimary'`) are concise for static styling
- Theme callbacks (`(theme) => theme.palette.productCards[type].header`) needed for dynamic product type

**Usage Pattern**:

```javascript
// Static - use string path
<Typography sx={{ color: 'semantic.textPrimary' }}>Static text</Typography>

// Dynamic - use theme callback
<Card sx={(theme) => ({
  bgcolor: theme.palette.productCards[productType].header,
})} />
```

### 5. Dark Mode Architecture

**Question**: How should the theme support future dark mode without implementing it now?

**Decision**: Export separate `darkColors` object with override values only.

**Rationale**:

- Doesn't add bundle size for unused feature
- Clear separation of what changes in dark mode
- Easy to implement later by merging `darkColors` over `colors.md3`

**Implementation Pattern**:

```javascript
// tokens/colors.js
export const colors = { md3: { ... }, scales: { ... } };
export const darkColors = { md3: { /* only overrides */ } };

// Future dark mode implementation
const activeColors = isDarkMode
  ? { ...colors, md3: { ...colors.md3, ...darkColors.md3 } }
  : colors;
```

## Findings Summary

| Topic | Decision | Confidence |
| ----- | -------- | ---------- |
| Palette extension | Flat + nested, string path access | High |
| Token naming | Numeric keys (10, 20, 30) | High |
| Migration strategy | Component-by-component | High |
| Semantic access | String paths + callbacks | High |
| Dark mode prep | Separate darkColors export | High |

## Unresolved Questions

None. All technical decisions have been made with high confidence based on MUI v5 documentation and existing codebase patterns.
