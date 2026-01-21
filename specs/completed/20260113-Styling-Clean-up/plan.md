# Implementation Plan: Navigation Styling Consolidation

**Branch**: `20260113-Styling-Clean-up` | **Date**: 2026-01-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/20260113-Styling-Clean-up/spec.md`
**Design Reference**: [docs/plans/2025-01-13-navigation-styling-design.md](../../docs/plans/2025-01-13-navigation-styling-design.md)

## Summary

Refactor navigation component styling to eliminate inline color/typography styles by:
1. Adding semantic color tokens for navigation-specific values
2. Creating MUI component variants for reusable button/typography styles
3. Migrating navigation components to use tokens and variants (layout-only inline styles)

This enables consistent styling, easier maintenance, and future theme support (dark mode).

## Technical Context

**Language/Version**: JavaScript (ES6+), React 18
**Primary Dependencies**: Material-UI v5 (MUI), React Router
**Storage**: N/A (styling refactoring - no data changes)
**Testing**: Jest, React Testing Library, Visual regression (screenshot comparison)
**Target Platform**: Web browser (Chrome, Firefox, Safari, Edge)
**Project Type**: Web application (frontend only)
**Performance Goals**: N/A (styling changes have negligible performance impact)
**Constraints**: Visual appearance must remain pixel-identical after refactoring
**Scale/Scope**: 4 navigation components, 2 theme files, ~20 inline style replacements

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution template not configured for this project. Proceeding with standard best practices:
- TDD approach: Visual regression tests before/after
- YAGNI: Only migrate navigation components (pilot scope)
- Single source of truth: All navigation colors in semantic tokens

**Status**: PASS (no violations)

## Project Structure

### Documentation (this feature)

```text
specs/20260113-Styling-Clean-up/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output (minimal - design already complete)
├── data-model.md        # Phase 1 output (token/variant definitions)
├── quickstart.md        # Phase 1 output (developer guide)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
frontend/react-Admin3/
├── src/
│   ├── theme/
│   │   ├── colors/
│   │   │   └── semantic.js          # ADD: navigation token group
│   │   └── components/
│   │       └── navigation.js        # ADD: MUI variants
│   └── components/
│       └── Navigation/
│           ├── NavigationMenu.js    # MODIFY: use variants
│           ├── TopNavBar.js         # MODIFY: use variants
│           ├── TopNavActions.js     # MODIFY: use variants
│           └── MegaMenuPopover.js   # MODIFY: use semantic tokens
└── tests/
    └── visual/                      # ADD: screenshot comparisons (optional)
```

**Structure Decision**: Frontend-only changes in existing React application. Theme system already established - extending with navigation-specific tokens and variants.

## Complexity Tracking

No violations to justify - this is a straightforward refactoring within existing patterns.

## Implementation Phases

### Phase 0: Research (Minimal)

Design already complete in `docs/plans/2025-01-13-navigation-styling-design.md`. Research phase validates:
- Existing semantic token patterns
- Existing MUI variant patterns
- Current inline style inventory

### Phase 1: Design & Contracts

1. **Token Definitions** → `data-model.md`
   - `navigation.text.*` tokens
   - `navigation.border.*` tokens
   - `navigation.background.*` tokens
   - `navigation.button.*` tokens

2. **Variant Definitions** → `data-model.md`
   - `MuiButton` variants: navPrimary, navViewAll, topNavAction
   - `MuiTypography` variants: navViewAllText, navHeading

3. **Migration Checklist** → `quickstart.md`
   - Step-by-step guide for developers

### Phase 2: Tasks (via /speckit.tasks)

Task generation will create granular implementation tasks.
